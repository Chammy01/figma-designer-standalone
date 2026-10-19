# Real builds, isolated source archive, then canonical release packaging/extraction.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$OutputRoot,
    [string]$SourceRef = 'HEAD'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
if ($OutputRoot -eq $root -or $OutputRoot.StartsWith($root.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Acceptance output must be outside the development repository.' }
if (Test-Path -LiteralPath $OutputRoot) { throw 'Use a fresh disposable acceptance directory.' }
New-Item -ItemType Directory -Path $OutputRoot | Out-Null
$shell = (Get-Process -Id $PID).Path
function Assert([bool]$OK, [string]$Message) { if (-not $OK) { throw $Message } }
$savedOrcaVars = @{}
foreach ($item in (Get-ChildItem Env:ORCA_*)) {
    $savedOrcaVars[$item.Name] = $item.Value
}
foreach ($item in (Get-ChildItem Env:ORCA_*)) {
    Remove-Item "Env:$($item.Name)"
}
try {
Assert (@(Get-ChildItem Env:ORCA_*).Count -eq 0) 'Source bootstrap must not require ORCA_* environment variables'
$archive = Join-Path $OutputRoot 'clean-source.zip'
& git -C $root archive --format=zip --output=$archive $SourceRef
$setupExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
Assert ($setupExit -eq 0) 'Source archive failed'
$source = Join-Path $OutputRoot 'Clean source with spaces'
Expand-Archive -LiteralPath $archive -DestinationPath $source
$runtimeFiles = @('bin/figma-designer-mcp.exe','vendor/figma-mcp/plugin/dist/code.js','vendor/figma-mcp/plugin/dist/index.html')
foreach ($relative in $runtimeFiles) { Assert (-not (Test-Path -LiteralPath (Join-Path $source $relative))) "Source archive included generated runtime: $relative" }
$obsoleteEntries = @('orca.ps1', '.opencode/agents/web-designer.md')
foreach ($relative in $obsoleteEntries) { Assert (-not (Test-Path -LiteralPath (Join-Path $source $relative))) "Source archive included obsolete file/agent: $relative" }
Assert (Test-Path -LiteralPath (Join-Path $source '.opencode/agents/figma-designer.md')) 'Source archive missing canonical agent'
$setup = Join-Path $source 'setup.ps1'
$ErrorActionPreference = 'Continue' # Windows PowerShell 5.1 represents native stderr as error records.
& $shell -NoProfile -ExecutionPolicy Bypass -File $setup -Configure -InstallDependencies -InstallBrowser *> (Join-Path $OutputRoot 'source-setup.txt')
$setupExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
Assert ($setupExit -eq 0) 'Clean source setup failed; inspect source-setup.txt'
foreach ($relative in $runtimeFiles) {
    Assert (Test-Path -LiteralPath (Join-Path $source $relative) -PathType Leaf) "Source setup did not create $relative"
    Write-Host "[PASS] source runtime exists: $relative"
}
$config = Get-Content -LiteralPath (Join-Path $source 'opencode.json') -Raw | ConvertFrom-Json
Assert ($config.mcp.figma.command[0] -eq (Join-Path $source 'bin/figma-designer-mcp.exe').Replace('\','/')) 'Source config points outside disposable checkout'
Assert ($config.default_agent -eq 'figma-designer') 'Source config default agent is not canonical figma-designer'
$before = @{}
foreach ($relative in $runtimeFiles + 'opencode.json') { $before[$relative] = (Get-FileHash -LiteralPath (Join-Path $source $relative)).Hash }
$ErrorActionPreference = 'Continue' # Windows PowerShell 5.1 represents native stderr as error records.
& $shell -NoProfile -ExecutionPolicy Bypass -File $setup -Configure *> (Join-Path $OutputRoot 'source-repeat.txt')
$setupExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
Assert ($setupExit -eq 0) 'Repeated source setup failed'
foreach ($relative in $before.Keys) { Assert ((Get-FileHash -LiteralPath (Join-Path $source $relative)).Hash -eq $before[$relative]) "Repeated setup changed $relative" }
$repeat = Get-Content -LiteralPath (Join-Path $OutputRoot 'source-repeat.txt') -Raw
Assert ($repeat -notmatch '\[PASS\] (Figma MCP build|Go toolchain|Figma plugin build|Figma plugin dependencies)') 'Repeated setup rebuilt approved runtime'
$package = Join-Path $OutputRoot 'Package'
& (Join-Path $PSScriptRoot 'package-release.ps1') -OutputRoot $package -RuntimeRoot $source
$releaseName = 'Figma-Designer-' + (Get-Content -LiteralPath (Join-Path $root 'VERSION') -Raw).Trim() + '-Windows'
$extract = Join-Path $OutputRoot 'Release extraction with spaces'
Expand-Archive -LiteralPath (Join-Path $package "$releaseName.zip") -DestinationPath $extract
$release = Join-Path $extract $releaseName
foreach ($relative in $obsoleteEntries) { Assert (-not (Test-Path -LiteralPath (Join-Path $release $relative))) "Release extraction included obsolete file/agent: $relative" }
Assert (Test-Path -LiteralPath (Join-Path $release '.opencode/agents/figma-designer.md')) 'Release extraction missing canonical agent'
# Remove Go/Bun from PATH and make accidental tool calls fail and leave evidence.
$tools = Join-Path $OutputRoot 'Release tools'
New-Item -ItemType Directory -Path $tools | Out-Null
Copy-Item -LiteralPath (Get-Command node.exe).Source -Destination (Join-Path $tools 'node.exe')
Copy-Item -LiteralPath (Get-Command npm.cmd).Source -Destination (Join-Path $tools 'npm.cmd')
New-Item -ItemType Directory -Path (Join-Path $tools 'node_modules') | Out-Null
Copy-Item -LiteralPath (Join-Path (Split-Path -Parent (Get-Command npm.cmd).Source) 'node_modules/npm') -Destination (Join-Path $tools 'node_modules/npm') -Recurse
# OpenCode's installed launcher may reference a separate global package directory.
$openCodeBin = Split-Path -Parent (Get-Command opencode.cmd).Source
$sentinel = Join-Path $OutputRoot 'unexpected-build-tool.txt'
foreach ($name in @('go','bun')) {
    [IO.File]::WriteAllText((Join-Path $tools "$name.cmd"), "@echo off`r`necho $name>>`"$sentinel`"`r`nexit /b 91`r`n")
}
$savedPath = $env:PATH
try {
    $env:PATH = $tools + ';' + $openCodeBin + ';' + (Join-Path $env:SystemRoot 'System32')
    $ErrorActionPreference = 'Continue' # Windows PowerShell 5.1 wraps native stderr as error records.
    & $shell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $release 'setup.ps1') -Configure -InstallDependencies -InstallBrowser *> (Join-Path $OutputRoot 'release-setup.txt')
    $setupExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    Assert ($setupExit -eq 0) 'Extracted Release ZIP setup failed; inspect release-setup.txt'
    $ErrorActionPreference = 'Continue'
    & $shell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $release 'setup.ps1') -Configure *> (Join-Path $OutputRoot 'release-repeat.txt')
    $setupExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    Assert ($setupExit -eq 0) 'Repeated Release ZIP setup failed'
    Assert (-not (Test-Path -LiteralPath $sentinel)) 'Packaged runtime invoked Go/Bun'
} finally { $env:PATH = $savedPath }
$approved = Get-Content -LiteralPath (Join-Path $root 'docs/APPROVED_RUNTIME.json') -Raw | ConvertFrom-Json
foreach ($entry in $approved.sha256.PSObject.Properties) { Assert ((Get-FileHash -LiteralPath (Join-Path $release $entry.Name)).Hash.ToLowerInvariant() -eq $entry.Value) "Release runtime changed: $($entry.Name)" }
$config = Get-Content -LiteralPath (Join-Path $release 'opencode.json') -Raw | ConvertFrom-Json
Assert ($config.mcp.figma.command[0] -eq (Join-Path $release 'bin/figma-designer-mcp.exe').Replace('\','/')) 'Release config path incorrect'
Assert ($config.default_agent -eq 'figma-designer') 'Release config default agent is not canonical figma-designer'
Write-Host 'Source archive acceptance PASS: all three runtime files, exact hashes, local configuration, repeated setup.'
Write-Host 'Release ZIP regression PASS: canonical package/extraction, setup without Go/Bun, preserved runtime, repeated setup.'
} finally {
    foreach ($item in (Get-ChildItem Env:ORCA_*)) {
        Remove-Item "Env:$($item.Name)"
    }
    foreach ($kv in $savedOrcaVars.GetEnumerator()) {
        Set-Item "Env:$($kv.Key)" $kv.Value
    }
}
