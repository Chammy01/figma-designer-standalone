# Windows PowerShell 5.1+. Default mode only checks; flags request local actions.
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
Write-Host 'Checks only unless you requested -Configure, -InstallDependencies, or -InstallBrowser.'
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
    'rules/figma-standalone-rules.md','rules/figma-design-rules.md',
    'scripts/figma-browser-test.mjs','scripts/figma-browser-status.mjs','scripts/figma-browser-source.mjs',
    'scripts/figma-live-source.mjs','scripts/figma-browser-contract.mjs','scripts/figma-browser-freshness.mjs')
foreach ($name in @('setup','doctor','design','revise','states','flow','interactive','motion','qa','browser','browser-test','status','version')) {
    $paths += ".opencode/commands/figma/$name.md"
}
$missing = @($paths | Where-Object { -not (Test-Path -LiteralPath (Join-Path $ProjectRoot $_) -PathType Leaf) })
Result ($missing.Count -eq 0) 'Project files' ("Extract the complete Release ZIP. Missing: " + ($missing -join ', '))
$exe = Join-Path $ProjectRoot 'bin/figma-mcp-go.exe'
$manifest = Join-Path $ProjectRoot 'vendor/figma-mcp/plugin/manifest.json'
Result (Test-Path -LiteralPath $exe -PathType Leaf) 'Figma MCP executable' 'Use the prebuilt Release ZIP. Source contributors: see docs/DEVELOPMENT.md.'
$pluginOK = $false
try {
    $plugin = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
    $pluginRoot = Split-Path -Parent $manifest
    $pluginOK = (Test-Path -LiteralPath (Join-Path $pluginRoot $plugin.main) -PathType Leaf) -and (Test-Path -LiteralPath (Join-Path $pluginRoot $plugin.ui) -PathType Leaf)
} catch {}
Result $pluginOK 'Figma plugin manifest and assets' 'Extract the complete ZIP; manifest.json and both dist assets must stay together.'
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
Write-Host @'

Next:
1. Open a design file in Figma Desktop.
2. Plugins > Development > Import plugin from manifest.
3. Select vendor\figma-mcp\plugin\manifest.json in this folder.
4. Start OpenCode in this folder by typing: opencode
5. Run the imported plugin in Figma and keep its window open. Wait for Connected.
6. In OpenCode chat run: /figma/doctor
7. Try: /figma/design Create a simple portfolio landing page.

Setup checks local readiness. Doctor checks the connected Figma document.
'@
exit 0
