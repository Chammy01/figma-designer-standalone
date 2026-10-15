param([string]$SourceRef='HEAD')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$base=Join-Path ([IO.Path]::GetTempPath()) ('owned-mcp-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $base | Out-Null
$zip=Join-Path $base 'source.zip'
git -C $root archive --format=zip --output=$zip $SourceRef
if ($LASTEXITCODE -ne 0) { throw 'Source archive failed' }
$source=Join-Path $base 'Clean source with spaces'
Expand-Archive -LiteralPath $zip -DestinationPath $source
if (Test-Path (Join-Path $source 'plugin/dist/code.js')) { throw 'Generated bundle unexpectedly tracked' }
$output=Join-Path $base 'Runtime package'
& (Join-Path $source 'scripts/build.ps1') -OutputRoot $output -SourceRevision $SourceRef
$runtimeZip=Join-Path $base 'runtime.zip'
Compress-Archive -Path (Join-Path $output '*') -DestinationPath $runtimeZip
$extracted=Join-Path $base 'Extracted package with spaces'
Expand-Archive -LiteralPath $runtimeZip -DestinationPath $extracted
foreach ($line in Get-Content (Join-Path $extracted 'SHA256SUMS.txt')) {
 $hash,$file=$line -split '  ',2
 if ((Get-FileHash -LiteralPath (Join-Path $extracted $file)).Hash.ToLowerInvariant() -ne $hash) { throw 'Extracted artifact mismatch' }
}
$env:MCP_EXECUTABLE=Join-Path $extracted 'bin/figma-designer-mcp.exe'
node --test (Join-Path $source 'scripts/catalog.test.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Extracted MCP catalog failed' }
Write-Host "Clean source build and extracted package PASS: $base"
