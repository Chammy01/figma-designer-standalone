# Offline end-to-end setup fixtures; native tool stubs never download or build runtime code.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('figma-setup-test-' + [guid]::NewGuid().ToString('N'))
$shell = (Get-Process -Id $PID).Path
$savedPath = $env:PATH
$savedMode = $env:FIGMA_SETUP_TEST_MODE
$savedLog = $env:FIGMA_SETUP_TEST_LOG
$savedGoLog = $env:FIGMA_SETUP_GO_LOG
function Assert([bool]$OK, [string]$Message) { if (-not $OK) { throw $Message } }
$nodeTools = Join-Path $temporary 'node tool'
New-Item -ItemType Directory -Path $nodeTools -Force | Out-Null
Copy-Item -LiteralPath (Get-Command node.exe).Source -Destination (Join-Path $nodeTools 'node.exe')
try {
    foreach ($mode in @('source','release','dependencies-fail','build-fail','missing-output','missing-bun','wrong-bun','missing-source','hash-mismatch','built-hash-mismatch','missing-hash','missing-go','wrong-go','go-build-fail','go-missing-output','go-hash-mismatch','go-missing-source','go-spoof','exe-mismatch','missing-ui')) {
        $fixture = Join-Path $temporary "$mode Folder with spaces"
        $tools = Join-Path $fixture 'tools'
        $plugin = Join-Path $fixture 'vendor/figma-mcp/plugin'
        New-Item -ItemType Directory -Path $tools,(Join-Path $plugin 'dist') -Force | Out-Null
        $files = @('setup.ps1','opencode.example.json','package.json','package-lock.json','docs/APPROVED_RUNTIME.json',
            '.opencode/agents/figma-designer.md','.opencode/agents/web-designer.md',
            'rules/figma-standalone-rules.md','rules/figma-design-rules.md','vendor/figma-mcp/plugin/manifest.json')
        $files += @(Get-ChildItem -LiteralPath (Join-Path $root '.opencode/commands/figma') -File | ForEach-Object { '.opencode/commands/figma/' + $_.Name })
        $files += @('figma-browser-test','figma-browser-status','figma-browser-source','figma-live-source','figma-browser-contract','figma-browser-freshness' | ForEach-Object { "scripts/$_.mjs" })
        foreach ($relative in $files) {
            $target = Join-Path $fixture $relative
            New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
            Copy-Item -LiteralPath (Join-Path $root $relative) -Destination $target
        }
        foreach ($relative in @('package.json','bun.lock','vite.config.ts','vite.config.main.ts','src/main.ts','src/ui/index.html')) {
            $target = Join-Path $plugin $relative
            New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
            [IO.File]::WriteAllText($target, 'source fixture')
        }
        $dispatcher = Join-Path $plugin 'dist/code.js'
        [IO.File]::WriteAllText($dispatcher, "fixture dispatcher`r`n")
        [IO.File]::WriteAllText((Join-Path $plugin 'dist/index.html'), 'fixture UI')
        New-Item -ItemType Directory -Path (Join-Path $fixture 'bin') | Out-Null
        [IO.File]::WriteAllText((Join-Path $fixture 'bin/figma-mcp-go.exe'), 'fixture executable')
        $approved = Get-Content -LiteralPath (Join-Path $fixture 'docs/APPROVED_RUNTIME.json') -Raw | ConvertFrom-Json
        foreach ($entry in $approved.sha256.PSObject.Properties) {
            $entry.Value = (Get-FileHash -LiteralPath (Join-Path $fixture $entry.Name)).Hash.ToLowerInvariant()
        }
        if ($mode -eq 'missing-hash') { $approved.sha256.PSObject.Properties.Remove('vendor/figma-mcp/plugin/dist/code.js') }
        $approved | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $fixture 'docs/APPROVED_RUNTIME.json') -Encoding Ascii
        if ($mode -notin @('release','hash-mismatch','missing-hash','missing-ui')) { Remove-Item -LiteralPath $dispatcher; Remove-Item -LiteralPath (Join-Path $plugin 'dist/index.html') }
        if ($mode -eq 'missing-ui') { Remove-Item -LiteralPath (Join-Path $plugin 'dist/index.html') }
        if ($mode -eq 'hash-mismatch') { [IO.File]::WriteAllText($dispatcher, 'unapproved') }
        if ($mode -eq 'missing-source') { Remove-Item -LiteralPath (Join-Path $plugin 'bun.lock') }
        $exe = Join-Path $fixture 'bin/figma-mcp-go.exe'
        $goModes = @('source','missing-go','wrong-go','go-build-fail','go-missing-output','go-hash-mismatch','go-missing-source','go-spoof')
        if ($mode -in $goModes) {
            Remove-Item -LiteralPath $exe
            foreach ($relative in @('go.mod','go.sum','cmd/figma-mcp-go/main.go','internal/node.go','internal/tools.go','internal/schema.go')) {
                $target = Join-Path $fixture "vendor/figma-mcp/$relative"
                New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
                [IO.File]::WriteAllText($target, 'pinned Go source fixture')
            }
        }
        if ($mode -eq 'go-missing-source' -or $mode -eq 'go-spoof') { Remove-Item -LiteralPath (Join-Path $fixture 'vendor/figma-mcp/go.sum') }
        if ($mode -eq 'go-spoof') { [IO.File]::WriteAllText((Join-Path $fixture 'source-build.json'), '{"approved":true}') }
        if ($mode -eq 'exe-mismatch') {
            [IO.File]::WriteAllText($exe, 'corrupted executable')
            [IO.File]::WriteAllText((Join-Path $fixture 'source-build.json'), '{"approved":true}')
            New-Item -ItemType Directory -Path (Join-Path $fixture 'vendor/figma-mcp/cmd/figma-mcp-go') -Force | Out-Null
            [IO.File]::WriteAllText((Join-Path $fixture 'vendor/figma-mcp/go.mod'), 'arbitrary marker')
        }
        if ($mode -ne 'missing-go') {
            [IO.File]::WriteAllText((Join-Path $tools 'go.cmd'), @'
@echo off
echo %*>>"%FIGMA_SETUP_GO_LOG%"
if "%1"=="version" goto version
if not "%1"=="build" exit /b 9
:findOutput
if "%~1"=="-o" goto output
if "%~1"=="" exit /b 9
shift
goto findOutput
:output
shift
set "buildOutput=%~1"
if not "%CGO_ENABLED%"=="0" exit /b 9
if not "%GOTOOLCHAIN%"=="local" exit /b 9
if not "%GOWORK%"=="off" exit /b 9
if not "%GOENV%"=="off" exit /b 9
if not "%GOAMD64%"=="v1" exit /b 9
if not "%GOOS%"=="windows" exit /b 9
if not "%GOARCH%"=="amd64" exit /b 9
if not "%GOFLAGS%"=="" exit /b 9
if not exist cmd\figma-mcp-go\main.go exit /b 9
if "%FIGMA_SETUP_TEST_MODE%"=="go-missing-output" exit /b 0
if "%FIGMA_SETUP_TEST_MODE%"=="go-hash-mismatch" goto mismatch
if "%FIGMA_SETUP_TEST_MODE%"=="go-build-fail" goto mismatch
<nul set /p "=fixture executable">"%buildOutput%"
exit /b 0
:mismatch
echo partial or unapproved>"%buildOutput%"
if "%FIGMA_SETUP_TEST_MODE%"=="go-build-fail" exit /b 1
exit /b 0
:version
if "%FIGMA_SETUP_TEST_MODE%"=="wrong-go" goto wrongVersion
echo go version go1.26.1 windows/amd64
exit /b 0
:wrongVersion
echo go version go1.25.0 windows/amd64
exit /b 0
'@)
        }
        foreach ($tool in @('npm','opencode')) { [IO.File]::WriteAllText((Join-Path $tools "$tool.cmd"), "@echo off`r`necho 2.0.24`r`n") }
        if ($mode -ne 'missing-bun') {
            [IO.File]::WriteAllText((Join-Path $tools 'bun.cmd'), @'
@echo off
echo %*>>"%FIGMA_SETUP_TEST_LOG%"
if "%1"=="--version" goto version
if "%1"=="install" goto install
if "%1 %2"=="run build" goto build
exit /b 9
:version
if "%FIGMA_SETUP_TEST_MODE%"=="wrong-bun" goto wrongVersion
echo 1.4.2
exit /b 0
:wrongVersion
echo 0.0.0
exit /b 0
:install
if not "%2"=="--frozen-lockfile" exit /b 9
if "%FIGMA_SETUP_TEST_MODE%"=="dependencies-fail" exit /b 1
exit /b 0
:build
if "%FIGMA_SETUP_TEST_MODE%"=="build-fail" exit /b 1
if "%FIGMA_SETUP_TEST_MODE%"=="missing-output" exit /b 0
if "%FIGMA_SETUP_TEST_MODE%"=="built-hash-mismatch" goto mismatch
echo fixture dispatcher>dist\code.js
<nul set /p "=fixture UI">dist\index.html
exit /b 0
:mismatch
echo unapproved>dist\code.js
exit /b 0
'@)
        }
        $env:PATH = $tools + ';' + $nodeTools + ';' + (Join-Path $env:SystemRoot 'System32')
        $env:FIGMA_SETUP_TEST_MODE = $mode
        $env:FIGMA_SETUP_TEST_LOG = Join-Path $fixture 'bun-calls.txt'
        $env:FIGMA_SETUP_GO_LOG = Join-Path $fixture 'go-calls.txt'
        $before = if (Test-Path -LiteralPath $dispatcher) { (Get-FileHash -LiteralPath $dispatcher).Hash }
        $output = & $shell -NoProfile -File (Join-Path $fixture 'setup.ps1') -Configure -SkipBrowser 2>&1 | Out-String
        $setupExit = $LASTEXITCODE
        [IO.File]::WriteAllText((Join-Path $fixture 'setup-output.txt'), $output)
        if ($mode -in @('source','release','missing-ui')) {
            Assert ($setupExit -eq 0) "$mode setup failed: $output"
            Assert ($output.Contains('[PASS] Figma plugin dispatcher verified')) "$mode omitted verification"
            Assert ($output.Contains("Import: $(Join-Path $plugin 'manifest.json')")) "$mode import path was not resolved"
            Assert ((Get-FileHash -LiteralPath $dispatcher).Hash.ToLowerInvariant() -eq $approved.sha256.'vendor/figma-mcp/plugin/dist/code.js') "$mode dispatcher hash"
            if ($mode -in @('source','missing-ui')) {
                $calls = Get-Content -LiteralPath $env:FIGMA_SETUP_TEST_LOG
                Assert (($calls -join '|') -eq '--version|install --frozen-lockfile|run build') 'Source build did not use pinned install/build'
                foreach ($name in @('source','dependencies','build')) { Assert ($output.Contains("[PASS] Figma plugin $name")) "Source omitted $name status" }
            } else {
                Assert (-not (Test-Path -LiteralPath $env:FIGMA_SETUP_TEST_LOG)) 'Release setup invoked Bun'
                Assert (-not (Test-Path -LiteralPath $env:FIGMA_SETUP_GO_LOG)) 'Release setup invoked Go'
                Assert ((Get-FileHash -LiteralPath $dispatcher).Hash -eq $before) 'Release dispatcher replaced'
                Assert ($output -notmatch '\[PASS\] Figma plugin (source|dependencies|build)') 'Release claimed an unperformed build'
            }
            $configPath = Join-Path $fixture 'opencode.json'
            $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
            Assert ($config.mcp.figma.command[0] -eq $exe.Replace('\','/')) 'Local config executable path'
            Assert (Test-Path -LiteralPath (Join-Path $plugin 'dist/index.html')) 'Plugin UI missing'
            Assert ($output.Contains('[PASS] Figma MCP runtime verified')) 'MCP verification missing'
            if ($mode -eq 'source') {
                $goCalls = @(Get-Content -LiteralPath $env:FIGMA_SETUP_GO_LOG)
                Assert ($goCalls.Count -eq 2 -and $goCalls[0] -eq 'version' -and $goCalls[1] -match '^build -trimpath -buildvcs=false') 'Canonical Go build missing'
                Assert ($output.Contains('[PASS] Figma MCP source') -and $output.Contains('[PASS] Figma MCP build')) 'Source MCP build status missing'
            }
            $configHash = (Get-FileHash -LiteralPath $configPath).Hash
            $exeBefore = (Get-FileHash -LiteralPath $exe).Hash
            $callsBefore = if (Test-Path -LiteralPath $env:FIGMA_SETUP_TEST_LOG) { [IO.File]::ReadAllText($env:FIGMA_SETUP_TEST_LOG) }
            $goBefore = if (Test-Path -LiteralPath $env:FIGMA_SETUP_GO_LOG) { [IO.File]::ReadAllText($env:FIGMA_SETUP_GO_LOG) }
            $again = & $shell -NoProfile -File (Join-Path $fixture 'setup.ps1') -Configure -SkipBrowser 2>&1 | Out-String
            Assert ($LASTEXITCODE -eq 0) "Repeated setup failed: $again"
            Assert ((Get-FileHash -LiteralPath $configPath).Hash -eq $configHash -and (Get-FileHash -LiteralPath $exe).Hash -eq $exeBefore) 'Repeated setup damaged local installation'
            if ($callsBefore) { Assert ([IO.File]::ReadAllText($env:FIGMA_SETUP_TEST_LOG) -eq $callsBefore) 'Repeated setup called Bun' }
            else { Assert (-not (Test-Path -LiteralPath $env:FIGMA_SETUP_TEST_LOG)) 'Repeated release invoked Bun' }
            if ($goBefore) { Assert ([IO.File]::ReadAllText($env:FIGMA_SETUP_GO_LOG) -eq $goBefore) 'Repeated setup called Go' }
            else { Assert (-not (Test-Path -LiteralPath $env:FIGMA_SETUP_GO_LOG)) 'Repeated release invoked Go' }
        } elseif ($mode -in $goModes -or $mode -eq 'exe-mismatch') {
            Assert ($setupExit -ne 0 -and $output.Contains('[FAIL] Figma MCP runtime')) "$mode must fail MCP verification: $output"
            foreach ($label in @('Problem:','Why it matters:','What to do:','Technical detail:')) { Assert ($output.Contains($label)) "$mode omitted $label" }
            Assert ($output -notmatch '(?m)^Next:' -and -not $output.Contains('[PASS] Figma MCP runtime verified')) "$mode claimed runtime readiness"
            Assert (@(Get-ChildItem -LiteralPath (Join-Path $fixture 'bin') -Filter '*.tmp').Count -eq 0) "$mode left partial build output"
            if ($mode -eq 'exe-mismatch') {
                Assert ([IO.File]::ReadAllText($exe) -eq 'corrupted executable') 'Existing corrupt executable overwritten'
                Assert (-not (Test-Path -LiteralPath $env:FIGMA_SETUP_GO_LOG)) 'Corrupt release marker invoked Go'
            } else { Assert (-not (Test-Path -LiteralPath $exe)) "$mode installed an unverified executable" }
        } else {
            Assert ($setupExit -ne 0) "$mode must fail"
            Assert ($output.Contains('[FAIL] Figma plugin could not be prepared.')) "$mode needs a beginner-readable failure"
            Assert ($output.Contains('Recovery:')) "$mode needs recovery instructions"
            Assert ($output -notmatch '(?m)^Next:') "$mode printed ready/import instructions"
            Assert (-not $output.Contains('[PASS] Figma plugin dispatcher verified')) "$mode claimed dispatcher verification"
            if ($mode -eq 'hash-mismatch') { Assert ((Get-FileHash -LiteralPath $dispatcher).Hash -eq $before) 'Mismatched existing dispatcher overwritten' }
        }
        Write-Host "[PASS] setup $mode (path containing spaces)"
        $env:PATH = $savedPath
    }
    Assert ((Get-Content -LiteralPath (Join-Path $root 'setup.ps1') -Raw) -notmatch '(?i)[ED]:[\\/]') 'Setup contains a maintainer drive assumption'
} finally {
    $env:PATH = $savedPath
    $env:FIGMA_SETUP_TEST_MODE = $savedMode
    $env:FIGMA_SETUP_TEST_LOG = $savedLog
    $env:FIGMA_SETUP_GO_LOG = $savedGoLog
}
Write-Host "Setup regressions PASS. Isolated fixtures retained at: $temporary"
