# Compatibility

Figma Designer V1.4.2 (`fa2fd109b2ff5b10057582f981211514bf51bc14`),
system 1.2.1. Fork product version 1.1.0 is independent of application versioning.
108 tools; the original 106 tool names and required inputs must equal the
approved runtime catalog. `combine_as_variants` is mandatory. Optional reliability fields are additive. Bridge protocol 2 requires a matched 1.1.0 server/plugin for writes. Old clients do not need to send new fields; safe reads remain available with older plugins where supported.

Plugin display name changes; stable manifest ID remains `figma-mcp-go`. Existing
imports should be reloaded/reimported rather than creating a second plugin.
Variable CRUD remains as imported. SET_VARIABLE/CONDITIONAL playback is
plan-blocked; V1.2.5 remains HOLD. Browser/overlay/motion boundaries do not expand.
MIT upstream notices and historical import references are intentionally retained.
No npm distribution is claimed.

Receipt replays return bounded prior summaries, not arbitrary full original payloads. Scoped revision is not a full-document version. See RELIABILITY_V1_4_3B.md.
