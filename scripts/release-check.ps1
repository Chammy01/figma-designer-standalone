# Offline JSON/syntax checks plus small behavior checks for setup/packaging.
[CmdletBinding()]
param(
    [ValidateSet('Source','Release')][string]$Mode = 'Source',
    [string]$RuntimeRoot
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$failures = @()
& node (Join-Path $PSScriptRoot 'release-privacy-check.mjs') --self-check
if ($LASTEXITCODE -ne 0) { $failures += 'Binary privacy scanner self-check' }
$allowlist = Get-Content -LiteralPath (Join-Path $root 'docs/RELEASE_ALLOWLIST.json') -Raw | ConvertFrom-Json
if ('LICENSE' -notin $allowlist -or -not (Test-Path -LiteralPath (Join-Path $root 'LICENSE'))) { $failures += 'Root MIT license packaging' }
if (@($allowlist | Where-Object { $_ -like '.opencode/skills/impeccable/*' -and $_ -notin @('.opencode/skills/impeccable/LICENSE','.opencode/skills/impeccable/NOTICE.md') }).Count) { $failures += 'Optional engine material in public ZIP' }
foreach ($relative in @('.opencode/commands/impeccable.md','.opencode/skills/impeccable/SKILL.md','.opencode/skills/impeccable/scripts/impeccable','.opencode/skills/impeccable/scripts/impeccable.cmd','.opencode/skills/impeccable/scripts/bin/windows-x64/impeccable.exe')) {
    if (Test-Path -LiteralPath (Join-Path $root $relative)) { $failures += "Optional engine still discoverable: $relative" }
}
foreach ($name in @('design','revise','states','interactive','motion','qa','browser','browser-test','status','doctor')) {
    $command = Join-Path $root ".opencode/commands/figma/$name.md"
    if (-not (Test-Path -LiteralPath $command) -or (Get-Content -LiteralPath $command -Raw) -match 'impeccable') { $failures += "Core command engine dependency: $name" }
}
foreach ($file in Get-ChildItem -LiteralPath $root -Recurse -Force -File | Where-Object { $_.FullName -notmatch '[\\/](node_modules|\.git|release-staging)[\\/]' }) {
    if ($file.Extension -eq '.json') {
        & node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" $file.FullName
        if ($LASTEXITCODE -ne 0) { $failures += "JSON: $($file.FullName)" }
    }
    if ($file.Extension -eq '.ps1') {
        $tokens = $null; $errors = $null
        [Management.Automation.Language.Parser]::ParseFile($file.FullName,[ref]$tokens,[ref]$errors) | Out-Null
        if ($errors.Count) { $failures += "PowerShell: $($file.FullName): $errors" }
    }
}
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -File | Where-Object { $_.Extension -in @('.js','.mjs') }) {
    & node --check $file.FullName
    if ($LASTEXITCODE -ne 0) { $failures += "JavaScript: $($file.Name)" }
}
$template = Get-Content -LiteralPath (Join-Path $root 'opencode.example.json') -Raw | ConvertFrom-Json
if ($template.model -ne 'opencode/space-bunny-free' -or $template.default_agent -ne 'web-designer' -or $template.mcp.figma.timeout -ne 10000 -or $template.mcp.figma.command[0] -ne '__SETUP_MANAGED_MCP_EXECUTABLE__') { $failures += 'Preserved config policy' }
$approved = Get-Content -LiteralPath (Join-Path $root 'docs/APPROVED_RUNTIME.json') -Raw | ConvertFrom-Json
$sourceFiles = Get-Content -LiteralPath (Join-Path $root 'docs/SOURCE_ALLOWLIST.json') -Raw | ConvertFrom-Json
foreach ($relative in $sourceFiles | Where-Object { $_ -notin @($approved.sha256.PSObject.Properties.Name) }) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $relative) -PathType Leaf)) { $failures += "Source file missing: $relative" }
}
if ($Mode -eq 'Release') {
    if (-not $RuntimeRoot) { $RuntimeRoot = $root }
    foreach ($entry in $approved.sha256.PSObject.Properties) {
        $file = Join-Path $RuntimeRoot $entry.Name
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { $failures += "Approved runtime missing: $($entry.Name)" }
        elseif ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value) { $failures += "Approved runtime hash: $($entry.Name)" }
    }
    if (-not $failures.Count) {
        & node (Join-Path $PSScriptRoot 'release-privacy-check.mjs') (Join-Path $RuntimeRoot 'bin/figma-mcp-go.exe')
        if ($LASTEXITCODE -ne 0) { $failures += 'Approved runtime binary privacy' }
    }
}
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('figma-release-check-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary | Out-Null
# Run setup in an isolated fixture with a concrete path containing spaces.
$fixture = Join-Path $temporary 'Folder with spaces'
New-Item -ItemType Directory -Path $fixture | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'setup.ps1') -Destination (Join-Path $fixture 'setup.ps1')
Copy-Item -LiteralPath (Join-Path $root 'opencode.example.json') -Destination (Join-Path $fixture 'opencode.example.json')
$shell = (Get-Process -Id $PID).Path
& $shell -NoProfile -File (Join-Path $fixture 'setup.ps1') -Configure -SkipBrowser *> (Join-Path $temporary 'setup-first.txt')
$generated = Join-Path $fixture 'opencode.json'
if (-not (Test-Path -LiteralPath $generated)) { $failures += 'Setup failed to generate missing config' }
else {
    $config = Get-Content -LiteralPath $generated -Raw | ConvertFrom-Json
    if ($config.mcp.figma.command[0] -ne (Join-Path $fixture 'bin/figma-mcp-go.exe').Replace('\','/') -or $config.mcp.figma.timeout -ne 10000 -or $config.model -ne $template.model -or $config.default_agent -ne $template.default_agent) { $failures += 'Setup config generation policy/path' }
    $before = (Get-FileHash -LiteralPath $generated).Hash
    & $shell -NoProfile -File (Join-Path $fixture 'setup.ps1') -Configure -SkipBrowser *> (Join-Path $temporary 'setup-existing.txt')
    if ((Get-FileHash -LiteralPath $generated).Hash -ne $before) { $failures += 'Setup overwrote existing config' }
    [IO.File]::WriteAllText($generated,'invalid json')
    & $shell -NoProfile -File (Join-Path $fixture 'setup.ps1') -Configure -SkipBrowser *> (Join-Path $temporary 'setup-invalid.txt')
    if ($LASTEXITCODE -eq 0 -or [IO.File]::ReadAllText($generated) -ne 'invalid json') { $failures += 'Setup invalid config preservation/failure' }
}
# A deliberate mismatched runtime must fail before any release output exists.
$runtime = Join-Path $temporary 'invalid-runtime'
foreach ($entry in $approved.sha256.PSObject.Properties) {
    $path = Join-Path $runtime $entry.Name
    New-Item -ItemType Directory -Path (Split-Path -Parent $path) -Force | Out-Null
    [IO.File]::WriteAllText($path,'mismatched fixture')
}
$output = Join-Path $temporary 'must-not-be-created'
$ErrorActionPreference = 'Continue' # Expected native stderr must not terminate Windows PowerShell 5.1.
& $shell -NoProfile -File (Join-Path $PSScriptRoot 'package-release.ps1') -OutputRoot $output -RuntimeRoot $runtime -PrivateReview *> (Join-Path $temporary 'package-invalid.txt')
$packageExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($packageExit -eq 0 -or (Test-Path -LiteralPath $output)) { $failures += 'Packaging runtime hash stop gate' }
# Test fixtures contain no user data and are retained in the OS temporary directory.
if ($failures.Count) { throw ($failures -join "`n") }
Write-Host "$Mode checks PASS: source files, JSON, PowerShell/JS syntax, approved config, setup path/config preservation, invalid-config failure, and packaging runtime mismatch stop."
if ($Mode -eq 'Release') { Write-Host 'Release runtime PASS: all approved artifact hashes and executable privacy.' }
exit 0
