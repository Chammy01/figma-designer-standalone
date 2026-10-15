[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutputRoot,[string]$SourceRevision='UNSPECIFIED')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$OutputRoot=[IO.Path]::GetFullPath($OutputRoot)
if (Test-Path -LiteralPath $OutputRoot) { throw 'Use a new output directory.' }
if ($OutputRoot.StartsWith($root.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase) -or $OutputRoot -eq $root) { throw 'Build outside the checkout.' }
function Run([scriptblock]$Command) { & $Command; if ($LASTEXITCODE -ne 0) { throw 'Build/check failed.' } }
Push-Location $root
try {
 if ((go version) -ne 'go version go1.26.1 windows/amd64') { throw 'Go 1.26.1 Windows x64 required.' }
 if ((bun --version) -ne '1.4.2') { throw 'Bun 1.4.2 required.' }
 New-Item -ItemType Directory -Path (Join-Path $OutputRoot 'bin') | Out-Null
 Run { go test -count=1 ./... }; Run { go vet ./... }
 $savedCGO=$env:CGO_ENABLED
 try { $env:CGO_ENABLED='0'; Run { go build -trimpath -buildvcs=false -ldflags '-X main.version=1.1.0' -o (Join-Path $OutputRoot 'bin/figma-designer-mcp.exe') ./cmd/figma-mcp-go } } finally { $env:CGO_ENABLED=$savedCGO }
 Push-Location plugin
 try { Run { bun install --frozen-lockfile }; Run { bun test }; Run { bun run build } } finally { Pop-Location }
 Run { bun test scripts/figma-hardening.test.ts scripts/figma-variants.test.ts }
 $savedBundle=$env:FIGMA_PLUGIN_BUNDLE
 try { $env:FIGMA_PLUGIN_BUNDLE=Join-Path $root 'plugin/dist/code.js'; Run { bun test scripts/figma-hardening.test.ts scripts/figma-variants.test.ts } } finally { $env:FIGMA_PLUGIN_BUNDLE=$savedBundle }
 $savedExe=$env:MCP_EXECUTABLE
 try { $env:MCP_EXECUTABLE=Join-Path $OutputRoot 'bin/figma-designer-mcp.exe'; Run { node --test scripts/catalog.test.mjs scripts/identity.test.mjs } } finally { $env:MCP_EXECUTABLE=$savedExe }
 New-Item -ItemType Directory -Path (Join-Path $OutputRoot 'plugin/dist') | Out-Null
 Copy-Item plugin/manifest.json (Join-Path $OutputRoot 'plugin/manifest.json')
 Copy-Item plugin/dist/code.js,plugin/dist/index.html (Join-Path $OutputRoot 'plugin/dist')
 Copy-Item LICENSE,README.md,VERSION (Join-Path $OutputRoot '.')
 $provenance=@{product='Figma Designer MCP';version=(Get-Content VERSION -Raw).Trim();bridgeProtocolVersion=2;sourceRevision=$SourceRevision;importedBaseline=(Get-Content docs/ownership-import.json -Raw | ConvertFrom-Json)}
 [IO.File]::WriteAllText((Join-Path $OutputRoot 'PROVENANCE.json'),($provenance | ConvertTo-Json -Depth 10))
 $lines=@('bin/figma-designer-mcp.exe','plugin/dist/code.js','plugin/dist/index.html') | ForEach-Object { (Get-FileHash -LiteralPath (Join-Path $OutputRoot $_) -Algorithm SHA256).Hash.ToLowerInvariant()+'  '+$_ }
 [IO.File]::WriteAllLines((Join-Path $OutputRoot 'SHA256SUMS.txt'),$lines)
 Write-Host 'Owned MCP build/package checks PASS'
} finally { Pop-Location }
