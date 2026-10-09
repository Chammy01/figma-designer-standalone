# Windows PowerShell 5.1+. Always prepare missing runtime assets; flags request other local actions.
[CmdletBinding()]
param([switch]$Configure, [switch]$InstallDependencies, [switch]$InstallBrowser, [switch]$SkipBrowser)
$ErrorActionPreference = 'Stop'
$ProjectRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$script:Failures = 0
function Result([bool]$OK, [string]$Name, [string]$Help) {
    if ($OK) { Write-Host "[PASS] $Name" }
    else { $script:Failures++; Write-Host "[FAIL] $Name - $Help" }
}
function ToolVersion([string]$Name) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) { return $null }
    try {
        $value = & $command.Source --version 2>&1
        if ($LASTEXITCODE -ne 0) { return $null }
        return ($value -join ' ').Trim()
    } catch { return $null }
}
Write-Host 'Figma Designer Setup'
Write-Host 'Prepares missing Figma MCP and plugin assets from source. Other installs/configuration require the corresponding flags.'
Result ($env:OS -eq 'Windows_NT') 'Windows' 'Use the Windows release on Windows.'
if ($env:OS -ne 'Windows_NT') { exit 1 }
Result ([Environment]::Is64BitOperatingSystem -and $env:PROCESSOR_ARCHITECTURE -eq 'AMD64') 'Windows x64' 'This beta executable is validated for Windows x64 only.'
$nodeVersion = ToolVersion 'node.exe'
$nodeOK = $nodeVersion -match '^v(\d+)\.' -and [int]$Matches[1] -ge 20
Result $nodeOK "Node.js $nodeVersion" 'Install Node.js 20+ with npm, then reopen PowerShell. See docs/INSTALLATION.md.'
$npmVersion = ToolVersion 'npm.cmd'
Result ([bool]$npmVersion) "npm $npmVersion" 'Install Node.js with npm, then reopen PowerShell.'
$openCodeVersion = ToolVersion 'opencode.cmd'
Result ([bool]$openCodeVersion) "OpenCode $openCodeVersion" 'Install OpenCode following docs/INSTALLATION.md. If already installed, verify it can start and write its user log.'
Write-Host 'OpenCode compatibility reference: 2.0.24. Provider/model availability must be checked in OpenCode.'
$paths = @('opencode.example.json','package.json','package-lock.json','docs/APPROVED_RUNTIME.json',
    '.opencode/agents/figma-designer.md','.opencode/agents/web-designer.md',
    '.opencode/plugins/figma-critique-guard.js',
    'rules/figma-standalone-rules.md','rules/figma-design-rules.md',
    'scripts/figma-browser-test.mjs','scripts/figma-browser-status.mjs','scripts/figma-browser-source.mjs',
    'scripts/figma-live-source.mjs','scripts/figma-browser-contract.mjs','scripts/figma-browser-freshness.mjs')
foreach ($name in @('setup','doctor','design','revise','critique','states','flow','interactive','motion','qa','browser','browser-test','status','version')) {
    $paths += ".opencode/commands/figma/$name.md"
}
$missing = @($paths | Where-Object { -not (Test-Path -LiteralPath (Join-Path $ProjectRoot $_) -PathType Leaf) })
Result ($missing.Count -eq 0) 'Project files' ("Extract the complete Release ZIP. Missing: " + ($missing -join ', '))
$exe = Join-Path $ProjectRoot 'bin/figma-mcp-go.exe'
$manifest = Join-Path $ProjectRoot 'vendor/figma-mcp/plugin/manifest.json'
# Reject links/junctions so builds and output stay inside this installation.
function RequireLocalPath([string]$Path) {
    $probe = Get-Item -LiteralPath $Path -Force
    while ($probe) {
        if (($probe.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Runtime/source paths must not use links or junctions.' }
        if ($probe.FullName -eq $ProjectRoot) { return }
        if ($probe -is [IO.FileInfo]) { $probe = $probe.Directory } else { $probe = $probe.Parent }
    }
    throw 'Runtime/source path escaped the project.'
}
$buildOutput = $null
try {
    $approved = Get-Content -LiteralPath (Join-Path $ProjectRoot 'docs/APPROVED_RUNTIME.json') -Raw | ConvertFrom-Json
    $exeHash = $approved.sha256.'bin/figma-mcp-go.exe'
    if ($exeHash -notmatch '^[a-f0-9]{64}$') { throw 'Approved MCP SHA-256 is missing or invalid.' }
    if (Test-Path -LiteralPath $exe) {
        RequireLocalPath $exe
        Write-Host '[INFO] Existing Figma MCP executable preserved; no Go toolchain or rebuild needed.'
    } else {
        $goRoot = Join-Path $ProjectRoot 'vendor/figma-mcp'
        foreach ($relative in @('go.mod','go.sum','cmd/figma-mcp-go/main.go','internal/node.go','internal/tools.go','internal/schema.go')) {
            $source = Join-Path $goRoot $relative
            if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Figma MCP source is incomplete ($relative). Restore the complete Git checkout/source archive, or re-extract the official Windows Release ZIP." }
            RequireLocalPath $source
        }
        foreach ($directory in @('cmd','internal')) {
            foreach ($item in Get-ChildItem -LiteralPath (Join-Path $goRoot $directory) -Recurse -Force) { RequireLocalPath $item.FullName }
        }
        Result $true 'Figma MCP source' ''
        $go = Get-Command go -ErrorAction SilentlyContinue
        if (-not $go) { throw 'Go 1.26.1 is required for source setup and was not found on PATH. Install Go 1.26.1 from https://go.dev/dl/, reopen PowerShell, and rerun setup. Setup does not install Go.' }
        # Match the approved non-Git release build, regardless of user Go settings or Git metadata.
        $buildEnv = @{}
        foreach ($name in @('CGO_ENABLED','GOOS','GOARCH','GOFLAGS','GOWORK','GOTOOLCHAIN','GOENV','GOAMD64')) { $buildEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
        try {
            $env:CGO_ENABLED = '0'; $env:GOOS = 'windows'; $env:GOARCH = 'amd64'
            $env:GOFLAGS = ''; $env:GOWORK = 'off'; $env:GOTOOLCHAIN = 'local'; $env:GOENV = 'off'; $env:GOAMD64 = 'v1'
            $goVersion = (& $go.Source version 2>&1 | Out-String).Trim()
            if ($LASTEXITCODE -ne 0 -or $goVersion -ne 'go version go1.26.1 windows/amd64') { throw "Go 1.26.1 for Windows x64 is required to reproduce the approved executable; detected: $goVersion. Install that version from https://go.dev/dl/ and reopen PowerShell." }
            Result $true 'Go toolchain (1.26.1 Windows x64)' ''
            $bin = Split-Path -Parent $exe
            New-Item -ItemType Directory -Path $bin -Force | Out-Null
            RequireLocalPath $bin
            $buildOutput = Join-Path $bin ('figma-mcp-build-' + [guid]::NewGuid().ToString('N') + '.tmp')
            Write-Host '[INFO] Building Figma MCP from checked-out pinned Go source.'
            Push-Location $goRoot
            try {
                & $go.Source build -trimpath -buildvcs=false -ldflags '-X main.version=1.2.0-standalone-hardening' -o $buildOutput ./cmd/figma-mcp-go
                if ($LASTEXITCODE -ne 0) { throw 'Go build failed. Check the compiler/network output above, restore pinned source and go.mod/go.sum, then rerun setup.' }
            } finally { Pop-Location }
            if (-not (Test-Path -LiteralPath $buildOutput -PathType Leaf)) { throw 'Go build did not produce the MCP executable.' }
            RequireLocalPath $buildOutput
            if ((Get-FileHash -LiteralPath $buildOutput -Algorithm SHA256).Hash.ToLowerInvariant() -ne $exeHash) { throw 'Source-built MCP SHA-256 differs from the approved release. Restore pinned source/build inputs and Go 1.26.1; no executable was installed.' }
            Move-Item -LiteralPath $buildOutput -Destination $exe
            Result $true 'Figma MCP build' ''
        } finally {
            foreach ($name in $buildEnv.Keys) { [Environment]::SetEnvironmentVariable($name, $buildEnv[$name], 'Process') }
        }
    }
    if ((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -ne $exeHash) { throw 'MCP executable SHA-256 differs from the approved release. Re-extract the official Windows ZIP, or remove only the unapproved local executable after restoring pinned source and rerun setup. Existing files are never overwritten.' }
    Result $true 'Figma MCP runtime verified' ''
} catch {
    Result $false 'Figma MCP runtime' 'Problem: the MCP executable could not be prepared or verified.'
    Write-Host 'Why it matters: OpenCode cannot use Figma Designer until this runtime passes verification.'
    Write-Host 'What to do: fix the cause below and rerun setup.ps1 with your original flags. See docs/INSTALLATION.md.'
    Write-Host "Technical detail: $($_.Exception.Message)"
} finally {
    if ($buildOutput -and (Test-Path -LiteralPath $buildOutput)) { Remove-Item -LiteralPath $buildOutput }
}
$pluginRoot = Split-Path -Parent $manifest
$dispatcher = Join-Path $pluginRoot 'dist/code.js'
$rerunSetup = 'powershell -NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $ProjectRoot 'setup.ps1') + '" -Configure -InstallDependencies -InstallBrowser'
try {
    $approved = Get-Content -LiteralPath (Join-Path $ProjectRoot 'docs/APPROVED_RUNTIME.json') -Raw | ConvertFrom-Json
    $dispatcherHash = $approved.sha256.'vendor/figma-mcp/plugin/dist/code.js'
    if ($dispatcherHash -notmatch '^[a-f0-9]{64}$') { throw 'Approved dispatcher SHA-256 is missing or invalid.' }
    if (-not (Test-Path -LiteralPath $dispatcher -PathType Leaf) -or -not (Test-Path -LiteralPath (Join-Path $pluginRoot 'dist/index.html') -PathType Leaf)) {
        if (Test-Path -LiteralPath $dispatcher -PathType Leaf) {
            if ((Get-FileHash -LiteralPath $dispatcher -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dispatcherHash) { throw 'Existing dispatcher is unapproved; restore pinned source or re-extract the approved package before retrying.' }
        }
        $sourceFiles = @('manifest.json','package.json','bun.lock','vite.config.ts','vite.config.main.ts','src/main.ts','src/ui/index.html')
        foreach ($relative in $sourceFiles) {
            if (-not (Test-Path -LiteralPath (Join-Path $pluginRoot $relative) -PathType Leaf)) {
                throw "Plugin source is incomplete ($relative). Restore the complete source checkout or re-extract the Release ZIP."
            }
        }
        Result $true 'Figma plugin source' ''
        $bunVersion = ToolVersion 'bun'
        if ($bunVersion -ne '1.4.2') {
            Write-Host '[INFO] Install the same build tool as hosted CI (Bun 1.4.2), then reopen PowerShell:'
            Write-Host 'iex "& {$(irm https://bun.com/install.ps1)} -Version 1.4.2"'
            throw "Bun 1.4.2 is required to prepare source assets; detected: $bunVersion. See docs/INSTALLATION.md."
        }
        Write-Host '[INFO] Preparing the Figma plugin from checked-out source with pinned dependencies.'
        Push-Location $pluginRoot
        try {
            & bun install --frozen-lockfile
            if ($LASTEXITCODE -ne 0) { throw 'Plugin dependency installation failed. Check internet/proxy access and the Bun output above.' }
            Result $true 'Figma plugin dependencies' ''
            & bun run build
            if ($LASTEXITCODE -ne 0) { throw 'Plugin build failed. Check the build output above; restore modified source/lockfiles before retrying.' }
        } finally { Pop-Location }
        if (-not (Test-Path -LiteralPath $dispatcher -PathType Leaf)) { throw 'The plugin build did not produce dist/code.js.' }
        Result $true 'Figma plugin build' ''
    } else { Write-Host '[INFO] Existing Figma plugin dispatcher preserved; no dependency install or rebuild needed.' }
    $actualHash = (Get-FileHash -LiteralPath $dispatcher -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-Host "[INFO] Figma plugin dispatcher SHA-256: $actualHash"
    if ($actualHash -ne $dispatcherHash) {
        $removeUnapproved = "Remove-Item -LiteralPath '" + $dispatcher.Replace("'", "''") + "'"
        throw "Dispatcher SHA-256 differs from the approved $($approved.releaseVersion) hash ($dispatcherHash). For a source checkout, restore pinned source/lockfiles, then remove only the unapproved generated dispatcher with: $removeUnapproved. For a Release ZIP, re-extract the approved package. Then rerun setup; do not copy code.js from another project."
    }
    Result $true 'Figma plugin dispatcher verified' ''
} catch {
    Result $false 'Figma plugin could not be prepared.' 'The plugin needs to be built and verified before Figma can load it.'
    Write-Host "Recovery: fix the cause below, then run: $rerunSetup"
    Write-Host "Technical details: $($_.Exception.Message)"
}
$pluginOK = $false
try {
    $plugin = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
    $pluginOK = (Test-Path -LiteralPath (Join-Path $pluginRoot $plugin.main) -PathType Leaf) -and (Test-Path -LiteralPath (Join-Path $pluginRoot $plugin.ui) -PathType Leaf)
} catch {}
Result $pluginOK 'Figma plugin manifest and assets' 'Run setup.ps1 again to prepare source assets, or re-extract the complete Release ZIP.'
try {
    $approved = Get-Content -LiteralPath (Join-Path $ProjectRoot 'docs/APPROVED_RUNTIME.json') -Raw | ConvertFrom-Json
    $hashOK = $true
    foreach ($entry in $approved.sha256.PSObject.Properties) {
        $file = Join-Path $ProjectRoot $entry.Name
        if (-not (Test-Path -LiteralPath $file -PathType Leaf) -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value) { $hashOK = $false }
    }
    Result $hashOK 'Approved runtime pair and plugin UI' 'Re-extract the approved release; do not mix versions or rebuilt runtime files.'
} catch { Result $false 'Runtime identity' 'The approved runtime hash record is missing or unreadable.' }
$configPath = Join-Path $ProjectRoot 'opencode.json'
if ($Configure -and -not (Test-Path -LiteralPath $configPath)) {
    Write-Host 'Creating local opencode.json from the template using this folder path. Model, default agent, and timeout are preserved.'
    try {
        $config = Get-Content -LiteralPath (Join-Path $ProjectRoot 'opencode.example.json') -Raw | ConvertFrom-Json
        if ($config.mcp.figma.command[0] -ne '__SETUP_MANAGED_MCP_EXECUTABLE__') { throw 'Unexpected template path.' }
        $config.mcp.figma.command = @($exe.Replace('\','/'))
        $json = $config | ConvertTo-Json -Depth 20
        $bytes = [Text.UTF8Encoding]::new($false).GetBytes($json + [Environment]::NewLine)
        $file = [IO.File]::Open($configPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try { $file.Write($bytes, 0, $bytes.Length) } finally { $file.Dispose() }
    } catch { Result $false 'Create local configuration' 'Template invalid or another config appeared; inspect the local file. Existing files are never overwritten.' }
} elseif ($Configure) { Write-Host 'Existing opencode.json preserved. Setup will check its path without changing it.' }
try {
    $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    $configuredExe = $config.mcp.figma.command[0]
    $pathOK = $configuredExe -and [IO.Path]::IsPathRooted($configuredExe) -and [IO.Path]::GetFullPath($configuredExe) -eq $exe
    Result ([bool]$pathOK) 'Configuration executable path' 'Run with -Configure if missing. If you moved folders, edit only mcp.figma.command[0] to this folder executable; see docs/UPDATING.md.'
    Result ($config.mcp.figma.enabled -eq $true) 'Figma connector enabled' 'Review mcp.figma.enabled in your existing config.'
    if ($config.mcp.figma.timeout -ne 10000) { Write-Host '[INFO] Existing timeout differs from the approved 10000 policy; preserved for review.' }
} catch { Result $false 'Local configuration' 'Run with -Configure to create missing opencode.json, or correct the existing JSON. Setup will not overwrite it.' }
if ($InstallDependencies) {
    Write-Host 'Installing pinned local dependencies with npm ci. This replaces local node_modules only; no global installation.'
    if (-not $nodeOK -or -not $npmVersion) { Result $false 'Dependency installation' 'Fix Node/npm first.' }
    else {
        Push-Location $ProjectRoot
        try { & npm.cmd ci; Result ($LASTEXITCODE -eq 0) 'Dependency installation' 'Check internet/proxy access and the npm error above; lockfiles are not regenerated.' }
        finally { Pop-Location }
    }
}
$playwrightCLI = Join-Path $ProjectRoot 'node_modules/playwright/cli.js'
$dependencyOK = Test-Path -LiteralPath (Join-Path $ProjectRoot 'node_modules/@playwright/test/package.json') -PathType Leaf
if ($InstallBrowser) {
    Write-Host 'Installing Chromium with local pinned Playwright into its normal user browser cache.'
    if (-not $nodeOK -or -not $dependencyOK) { Result $false 'Chromium installation' 'Install local dependencies first with -InstallDependencies.' }
    else {
        & node.exe $playwrightCLI install chromium
        Result ($LASTEXITCODE -eq 0) 'Chromium installation' 'Check internet/proxy/cache permissions; do not disable security software.'
    }
}
if ($SkipBrowser) { Write-Host '[INFO] Browser checks skipped for design-only use. Install before browser-test.' }
else {
    Result $dependencyOK 'Browser dependencies' 'Run with -InstallDependencies.'
    $browserOK = $false
    if ($nodeOK -and $dependencyOK) {
        Push-Location $ProjectRoot
        try {
            & node.exe --input-type=module -e "import {chromium} from '@playwright/test'; import {existsSync} from 'node:fs'; process.exit(existsSync(chromium.executablePath()) ? 0 : 1);"
            $browserOK = $LASTEXITCODE -eq 0
        } catch {} finally { Pop-Location }
    }
    Result $browserOK 'Chromium browser files' 'Run with -InstallBrowser. This file check does not prove a browser launch succeeds.'
}
if ($script:Failures -gt 0) { Write-Host 'Fix the FAIL items, then run setup again. See docs/TROUBLESHOOTING.md.'; exit 1 }
Write-Host @"

Next:
1. Open a design file in Figma Desktop.
2. Plugins > Development > Import plugin from manifest.
3. Import: $manifest
4. Run the imported plugin in Figma and keep its window open.
5. Open OpenCode in this folder by typing: opencode. Wait for the plugin to say Connected.
6. In OpenCode chat run: /figma/doctor
7. Try: /figma/design Create a simple portfolio landing page.

Setup checks local readiness. Doctor checks the connected Figma document.
"@
exit 0
