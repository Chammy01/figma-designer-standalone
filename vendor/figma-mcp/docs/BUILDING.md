# Building

Windows x64: Go 1.26.1, Bun 1.4.2. Dependencies remain pinned in go.sum and
plugin/bun.lock. From a clean checkout:

```powershell
./scripts/build.ps1 -OutputRoot "$env:TEMP/Figma Designer MCP build"
```

The script tests Go, vets, builds with CGO_ENABLED=0 / trimpath / buildvcs=false
and `-X main.version=1.0.0`, installs frozen plugin dependencies, tests and builds
the plugin. Output includes binary, plugin manifest/dist, license, provenance and
SHA256SUMS.txt. Package/extraction tests rebuild from a clean Git archive.
No download from a floating upstream branch is used. No public release is made.
