# Compatibility

Figma Designer V1.4.2 (`fa2fd109b2ff5b10057582f981211514bf51bc14`),
system 1.2.1. Fork product version 1.0.0 is independent of application versioning.
106 tools; tool names, schemas and required/optional inputs must equal the
approved runtime catalog. `combine_as_variants` is mandatory. Only initialization
name/version, diagnostic version, binary/module paths and UI branding may differ.

Plugin display name changes; stable manifest ID remains `figma-mcp-go`. Existing
imports should be reloaded/reimported rather than creating a second plugin.
Variable CRUD remains as imported. SET_VARIABLE/CONDITIONAL playback is
plan-blocked; V1.2.5 remains HOLD. Browser/overlay/motion boundaries do not expand.
MIT upstream notices and historical import references are intentionally retained.
No npm distribution is claimed.
