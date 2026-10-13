# Figma Designer v1.2.1 Beta 2

Fixes source-freshness handling for conditional variable operand wrappers.
The read-only collector now follows the wrapped concrete alias, preserves nested
variable/action/destination closure, and fails safely on malformed aliases.

The upstream pin, MCP executable, plugin UI, system/MCP versions, and V1 source
projection version remain unchanged. Only the approved plugin code bundle changes.

No stateful conditional prototype workflow is enabled. V1.2.5 remains HOLD because
the connected Figma plan rejects SET_VARIABLE and CONDITIONAL authoring; native
two-branch playback acceptance remains unavailable. Browser state parity is not
implemented. See [the capability audit](docs/STATEFUL_VARIABLES_V1_2_5.md).

Extract Beta 2 into a new folder and follow [Updating](docs/UPDATING.md).
Keep Beta 1 as a rollback copy; do not mix plugin bundles between releases.
