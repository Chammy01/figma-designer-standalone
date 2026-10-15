# Local bridge protocol 2

Independent versions: MCP product 1.1.0; server↔plugin bridge protocol 2; MCP wire
protocol remains negotiated by the existing MCP library. Application versions are separate.

Requests retain type/requestId/nodeIds/params and add protocolVersion. Optional
operationId/preconditions/expectedRevision live in params. MCP wrappers preserve
these even when legacy handlers rebuild arguments. Leader /rpc and direct bridge
paths use the same plugin-side validation and receipt boundary.

Read-only internal bridge_hello returns plugin identity, version, protocol,
document identity/access and capability flags. Writes require exact compatible
product/protocol and receipt/precondition/revision/write support. health_check
adds server and compatibility metadata without replacing its old fields.

New public read tools: get_operation_receipt(operationId), get_document_revision().
No generic replay/write tool exists. A committed duplicate is suppressed by the
plugin, not retried by reconnect logic. Receipt lookup is inspection only.

Older MCP clients work without new optional fields. New server with old plugin
allows safe reads but blocks writes. New plugin rejects legacy write envelopes
from old servers. Upgrade the matched server/plugin set; never mix versions.
See RELIABILITY_V1_4_3B.md for exact states, scope, storage and crash boundaries.
