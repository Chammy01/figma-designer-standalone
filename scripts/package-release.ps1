[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$OutputRoot,
    [Parameter(Mandatory=$true)][string]$RuntimeRoot,
    [switch]$PrivateReview
)
$ErrorActionPreference = 'Stop'
$ProjectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$RuntimeRoot = (Resolve-Path -LiteralPath $RuntimeRoot).Path
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
foreach ($protected in @($ProjectRoot,$RuntimeRoot)) {
    if ($OutputRoot -eq $protected -or $OutputRoot.StartsWith($protected.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Output must be outside source/runtime roots.' }
}
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'LICENSE'))) {
    if (-not $PrivateReview) { throw 'Root license undecided. Use -PrivateReview for a private review ZIP only; do not publish.' }
    Write-Warning 'PRIVATE REVIEW ONLY: owner root license decision is still required before public launch.'
}
$version = (Get-Content -LiteralPath (Join-Path $ProjectRoot 'VERSION') -Raw).Trim()
if ($version -ne 'v1.2.1-beta.1') { throw 'Unexpected release version.' }
$releaseName = 'Figma-Designer-' + $version + '-Windows'
$stage = Join-Path $OutputRoot $releaseName
$zip = Join-Path $OutputRoot ($releaseName + '.zip')
$sumsPath = Join-Path $OutputRoot 'SHA256SUMS.txt'
$runtimeRecord = Join-Path $OutputRoot 'RUNTIME_SHA256SUMS.txt'
foreach ($path in @($stage,$zip,$sumsPath,$runtimeRecord)) {
    if (Test-Path -LiteralPath $path) { throw "Refusing to overwrite existing output: $path. Inspect it; use a fresh output directory for another candidate." }
}
function AllowedFile([string]$Root,[string]$Relative) {
    if ([IO.Path]::IsPathRooted($Relative) -or $Relative -match '(^|[\\/])\.\.([\\/]|$)' -or $Relative -match ':') { throw "Unsafe allowlist entry: $Relative" }
    $full = [IO.Path]::GetFullPath((Join-Path $Root $Relative))
    if (-not $full.StartsWith($Root.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Path escaped root.' }
    $item = Get-Item -LiteralPath $full -Force
    if ($item.PSIsContainer) { throw 'Allowlist must contain exact files, not directories.' }
    $probe = $item
    while ($probe) {
        if (($probe.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Reparse point refused: $Relative" }
        if ($probe.FullName -eq $Root) { break }
        if ($probe -is [IO.FileInfo]) { $probe = $probe.Directory } else { $probe = $probe.Parent }
    }
    return $full
}
$approved = Get-Content -LiteralPath (Join-Path $ProjectRoot 'docs/APPROVED_RUNTIME.json') -Raw | ConvertFrom-Json
foreach ($entry in $approved.sha256.PSObject.Properties) {
    $file = AllowedFile $RuntimeRoot $entry.Name
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value) { throw "STOP: Runtime differs from authoritative V1.2.1 hash: $($entry.Name)" }
}
[string[]]$allowlist = Get-Content -LiteralPath (Join-Path $ProjectRoot 'docs/RELEASE_ALLOWLIST.json') -Raw | ConvertFrom-Json
if ($allowlist.Count -ne @($allowlist | Select-Object -Unique).Count) { throw 'Duplicate allowlist entry.' }
if ('LICENSE' -notin $allowlist) { throw 'Root LICENSE must be included in the release.' }
if (@($allowlist | Where-Object { $_ -like '.opencode/skills/impeccable/*' -and $_ -notin @('.opencode/skills/impeccable/LICENSE','.opencode/skills/impeccable/NOTICE.md') }).Count) { throw 'Optional engine material must not ship in this beta.' }
$inputs = @{}
foreach ($relative in $allowlist) {
    if ($relative -match '(^|/)(node_modules|\.git|\.figma-designer|\.orca|out)(/|$)' -or $relative -match '\.test\.' -or $relative -match '\.(log|zip|bak)$') { throw "Forbidden release entry: $relative" }
    $root = $ProjectRoot
    if ($relative -in @($approved.sha256.PSObject.Properties.Name)) { $root = $RuntimeRoot }
    $inputs[$relative] = AllowedFile $root $relative
}
foreach ($entry in $approved.sha256.PSObject.Properties) {
    if (-not $inputs.ContainsKey($entry.Name)) { throw 'Approved runtime file absent from allowlist.' }
    if ((Get-FileHash -LiteralPath $inputs[$entry.Name] -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value) { throw 'Source plugin asset differs from approved runtime.' }
}
$binaries = @($allowlist | Where-Object { $_ -match '\.(exe|dll|so|dylib|wasm)$' } | ForEach-Object { $inputs[$_] })
if ($binaries.Count) {
    & node (Join-Path $PSScriptRoot 'release-privacy-check.mjs') @binaries
    if ($LASTEXITCODE -ne 0) { throw 'Public binary privacy gate failed before staging.' }
}
New-Item -ItemType Directory -Path $stage -Force | Out-Null
foreach ($relative in $allowlist) {
    $target = Join-Path $stage $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $inputs[$relative] -Destination $target
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $inputs[$relative] -Algorithm SHA256).Hash) { throw "Copy hash mismatch: $relative" }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($zip, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($relative in $allowlist) {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $stage $relative), ($releaseName + '/' + $relative.Replace('\','/')), [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose() }
$archive = [IO.Compression.ZipFile]::OpenRead($zip)
try {
    $names = @($archive.Entries | ForEach-Object { $_.FullName.Substring($releaseName.Length + 1) })
    if (@(Compare-Object ($allowlist | Sort-Object) ($names | Sort-Object)).Count -ne 0) { throw 'ZIP allowlist mismatch.' }
    foreach ($entry in $archive.Entries) {
        $stream = $entry.Open(); $hasher = [Security.Cryptography.SHA256]::Create()
        try { $hash = ([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-','') }
        finally { $stream.Dispose(); $hasher.Dispose() }
        $relative = $entry.FullName.Substring($releaseName.Length + 1)
        if ($hash -ne (Get-FileHash -LiteralPath (Join-Path $stage $relative) -Algorithm SHA256).Hash) { throw "ZIP content hash mismatch: $relative" }
    }
} finally { $archive.Dispose() }
$zipHash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText($sumsPath, ($zipHash + '  ' + [IO.Path]::GetFileName($zip) + "`n"), [Text.UTF8Encoding]::new($false))
$records = @($approved.sha256.PSObject.Properties | ForEach-Object { $_.Value + '  ' + $_.Name })
[IO.File]::WriteAllText($runtimeRecord, (($records -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
Write-Host "Release ZIP verified: $zip"
Write-Host "SHA-256: $zipHash"
Write-Host "Entries: $($allowlist.Count). No original project files were changed."
