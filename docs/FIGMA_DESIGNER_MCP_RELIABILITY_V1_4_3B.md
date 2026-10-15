# MCP reliability hardening — V1.4.3B

## Baseline and adoption

Figma Designer adopts Figma Designer MCP **1.1.0**, bridge protocol **2**, from
[Chammy01/figma-designer-mcp](https://github.com/Chammy01/figma-designer-mcp), exact
commit `c95e264350ecd4f13f11f4012cc13dcc96edc927`. MCP main and all three
[exact-commit CI jobs](https://github.com/Chammy01/figma-designer-mcp/actions/runs/38779500977)
are green. Starting baselines: MCP `a0b2e1c3e2ab2dd37c512fc3edeacb77a785a418`;
standalone `dd954fa64307ac119e8e84d6c4dc1b8beaeec94c`.

Local native acceptance and clean standalone source/package checks are complete.
Exact-head hosted CI is the final shipping gate, reported in the task's final
response. This source checkpoint is unpublished `v1.2.1-reliability.1`, system 1.2.1.
No stable MCP release, Beta 4, or desktop package is published. Beta 3 is untouched.

The source pin, three exact hashes and build provenance are in APPROVED_RUNTIME.json.
APPROVED_RUNTIME_V1_4_3A.json preserves the entire previous owned 1.0.0 approval;
APPROVED_RUNTIME_BETA_3.json and priorApprovedRuntime preserve Beta 3. Dependencies,
MIT notices and upstream lineage are retained. No floating source dependency exists.

## Scope and tool audit

The owned MCP's WRITE_PATH_AUDIT_V1_4_3B.md/JSON inventories the original catalog,
exact schemas, 72 document-mutating tool families, categories, dispatch locations,
returned expressions, native/helper calls, partial-success and retry boundaries.
UI-only navigation and slide_template action=list remain read-only. Original 106
tool names and required inputs are retained; get_operation_receipt and
get_document_revision add two read-only tools: **108 total**. combine_as_variants
remains available and passed guarded native acceptance. No slash command is added.

Go adapters preserve operationId, preconditions and expectedRevision when existing
handlers rebuild parameters. The plugin serializes mutation and document-read work;
health, handshake and receipt lookup can inspect an operation while it runs.
Original result fields remain additive, including existing batch-error fields.
The standalone bundle fixtures reuse the pinned MCP's protocol-aware harness.

## Receipts and idempotency

Caller-supplied operationId is optional, opaque ASCII, 16–80 characters. Otherwise
the server generates a random 128-bit ID. A canonical request fingerprint binds tool,
transported arguments, target IDs, preconditions, bridge protocol and document
identity. Transport request IDs are excluded and have process-random prefixes.

The plugin owns one local clientStorage journal: at most 500 receipts, seven days,
four MiB; each receipt at most 16 KiB. Intent is persisted before native dispatch;
completion is persisted before response delivery. Retained identical COMMITTED IDs
return the prior bounded summary/receipt without dispatch. Changed arguments/tool
or document binding fail OPERATION_ID_CONFLICT. Failed/unresolved IDs never replay.

States: IN_PROGRESS, COMMITTED, FAILED_PRECONDITION, FAILED_BEFORE_WRITE,
FAILED_AFTER_PARTIAL_WRITE, FAILED. Absent/expired/evicted lookups return UNKNOWN,
never proof that retry is safe. Completed entries may be capacity-evicted; unresolved
entries are not capacity-evicted, although time expiry applies. Corruption fails
closed without silently resetting the journal; health and ordinary reads remain
available. There is no rollback or unbounded exactly-once guarantee.

Receipts whitelist IDs, tool/status, times, revisions, counts/bounds and fixed
warnings. Summaries have a 32-object/32-leaf budget, depth 3 and 32 array entries.
Created/affected ID samples are capped at 32 IDs, at most 96 characters each.
No document, prompt, text, image, credential, environment or arbitrary path is
persisted. First results retain original detail; duplicate results use bounded
summaries. A plugin/storage crash between native commit and durable completion
remains indeterminate. HTML/batch operations are whole MCP operations, not native
transactions; observed partial work cannot become COMMITTED.

Scope is one active development-plugin instance. clientStorage has no cross-instance
CAS guarantee. This file exposes no fileKey, so document identity is an explicit
plugin-session nonce: retained receipts remain queryable after reload, but mutation
binding/revisions invalidate. Persistence never means permanent product state.

## Preconditions and revisions

Optional guards: expectedNodeType, expectedParentId, expectedName,
expectedComponentId, expectedComponentSetId, expectedReactionCount,
expectedChildrenCount, expectedVisible and expectedRevision. Unverifiable evidence
fails PRECONDITION_UNVERIFIED; mismatches fail PRECONDITION_FAILED or
STALE_DOCUMENT_REVISION before dispatch. Guards cover all identified batch targets.
Delete/reparent/clone/swap, reactions, move/resize, property/HTML patches, instance
overrides and combine_as_variants share this boundary. Name-based instantiation and
swapping verify actual source/set IDs before and after; name matching alone is not
proof. No ownership rule is relaxed.

Revisions use sorted canonical JSON/SHA-256, current-page native properties, text
runs, geometry, child order, full reactions, instance sources, and all local styles
and variables. Selection/viewport, other pages' node trees and remote resources are
excluded: this is not a full-document revision. Browser projection/fingerprint
versions are unchanged. The collector body is unchanged; existing field registries
are exported for reuse. Optional unavailable revisions are reported; a supplied
unverifiable revision fails closed.

Native 2,385-node page revisions were stable, taking approximately 15–17 seconds
each. Eligibility follows the source collector: do not compute text glyph outlines
or read invalid variant-definition getters. Mutation stages emit existing progress
messages and yield before the next synchronous snapshot. Native final cleanup
completed in about 32 seconds. Existing bridge/follower/client timeout values remain
unchanged; long follower requests can still become indeterminate and need receipts.

## Handshake, errors and network

health_check retains legacy fields and adds server/plugin product/version, bridge
protocol, document/page/access, capabilities, receipt storage and compatibility.
Unsafe writes require a fresh compatible handshake. The app verifies the returned
versions/protocol against the locally approved runtime and blocks incompatible work.
Mismatched old plugins retain safe reads where possible, not unsafe write support.

Errors distinguish PLUGIN_NOT_CONNECTED, BRIDGE_UNAVAILABLE, DOCUMENT_UNAVAILABLE,
PROTOCOL_MISMATCH, PLUGIN_VERSION_MISMATCH, CAPABILITY_UNAVAILABLE,
WRITE_RESPONSE_LOST, RECEIPT_UNKNOWN, STALE_DOCUMENT_REVISION,
PRECONDITION_FAILED, PRECONDITION_UNVERIFIED, OPERATION_ID_CONFLICT and storage
failures. No reconnect path replays a mutation automatically.

NETWORK_PERMISSION: **UNRESOLVED**; wildcard retained, not asserted required.
The [official manifest specification](https://developers.figma.com/docs/plugins/manifest/)
documents explicit local ports but did not establish a safe expression for every
historically configurable loopback origin/port. No remote feature is added. Default
bind remains 127.0.0.1; the historical unsafe non-loopback warning remains. Native
connections worked on default 1994 and alternate loopback 1995. A Go test free-port
helper now binds loopback. Permission restriction needs its own verified policy.

## Native acceptance and cleanup

All mutations used disposable pages in the non-sensitive Untitled acceptance file.
The machine-readable first campaign is preserved in the pinned MCP's
RELIABILITY_NATIVE_V1_4_3B.json; later final progress/cleanup checks supplement it.

| Case | Observed result |
| --- | --- |
| A — handshake | Server/plugin 1.1.0, protocol 2, COMPATIBLE, document readable, storage READY; no writes. |
| B — duplicate create | Same ID and arguments returned the original node and replayed receipt; one frame. |
| C — conflict | Different create arguments rejected; revision unchanged. |
| D — lost response | Loopback proxy intercepted native COMMITTED response and closed sockets before delivery; lookup recovered node 1036:769 with zero mutation resends. |
| E — guards | Matching type/parent/name/revision succeeded; stale revision and wrong type rejected; revision unchanged. |
| F — components | Guarded combine, exact-name instantiation and swap verified source/set IDs (disposable set 1036:767, instance 1036:768). |
| G — reactions | Expected count 0 succeeded; stale count rejected; full reaction readback unchanged. DISSOLVE retained native float32 0.15000000596046448. |
| H — reconnect | Close produced PLUGIN_NOT_CONNECTED; reopen restored COMPATIBLE. Old COMMITTED receipt and exact page fingerprint survived. MCP client restart and server reconnect also retained receipts. |
| I — network | Both loopback ports connected; manifest unchanged and restriction status remains UNRESOLVED. |

Initial page create and cleanup responses timed out. Their known IDs resolved to
COMMITTED; no blind retry occurred. Figma rejected removing an active page; its
FAILED receipt had equal before/after revisions. After switching pages, a distinct
cleanup removed it. A second disposable page verified the final progress behavior
and was removed successfully. No audit nodes, components, reactions or pages remain.

An older OpenCode session from D:/figma-designer-source-final-test reclaimed port
1994 during a server restart. It was identified, closed by the operator, and the
owned 1.1.0 leader was verified before continuing. Close old runtime sessions when
activating the new pair; do not treat partial legacy health as compatibility proof.

Final protected fingerprints match the original baseline exactly:

- Page: a68cfd586576aa6f2d199c8edd4e46c541b5d7e9a22508a16781e8fff3712be6
- Source: 129cd01193e0d6d52a3c992380c48ed41650ea372316dadbd30d22ece81fcd27

## Application and read-only integration

App startup reports runtime VERIFIED, Figma CONNECTED, MCP COMPATIBLE, server/plugin
1.1.0 and protocol 2. Provider/model controls and the validation dashboard retain
existing paths. Actual /figma/doctor completed FIGMA_DOCTOR: PASS with approved
hashes. Actual guarded QA returned WARN for missing journey-start semantics, with
six collector reads, zero writes and VERIFIED_UNCHANGED document/source evidence.
The model's attempted shell call was denied; no repair was performed. Native PNG
export succeeded at 1440×1024 with source-bound bounds and unchanged fingerprints.

Receipt recovery reads IDs only from actual tool events, verifies current document,
page, tool and timing, and prefers receipts over existing reconciliation. COMMITTED
or proven partial work means continue from current state, not certify the entire
user task. Proven pre-write failure permits explicit retry; uncertain states remain
locked. Historical/prose receipts and one receipt embedded in opaque Code Mode
cannot certify full coverage. No generic write/retry API reaches the browser.

Only receipt/revision read aliases extend critique/QA allowlists. Core persistent
enforcement and provider-visible schemas are preserved. Original critique LF hash:
2bc365e1f41d80cf9adab177847f6f4dd13000766455ac4150399a7690cb23dc;
reviewed read-extension hash:
520c8934b0fbc4a334d084596e3e5dd3f4e2aff41fe7ff5bf130e1515c9f11ed.
Both guards still reject writes, generic execution and operation-envelope bypasses.
No QA analyzer, reaction/motion semantics, browser fidelity threshold or baseline
image is changed. The five existing MEDIUM PROPERTY_strokeWidth findings remain.
The existing browser report also contains 285 font/complex-paint limitations;
290 total entries do not mean 290 new defects. Its source binding and report file
are preserved; SOURCE_FIDELITY remains FAIL rather than being relabelled green.

## Builds, hashes and regression

Clean MCP source archive/package extraction passed; independent build artifacts are
byte-identical. Go 1.26.1 x64 and Bun 1.4.2, frozen dependencies, trimpath,
buildvcs=false and version 1.1.0 reproduce the following SHA-256 values:

| Artifact | Approved SHA-256 |
| --- | --- |
| figma-designer-mcp.exe | c6f7670c277ec91ec0ff4980b34878a0d309cff2dbcfb01f49899114fb779004 |
| plugin code.js | 8aa2b7aba459a96784efb2f1824b712a85077d09f15ba003a6a82bf980a34085 |
| plugin index.html | 74067837ed24279beaca0d95f1a822708ded8713b589bb1be4fce55d17a55f02 |

Completed suites: 506 npm contracts; 328 plugin tests; 153 source-handler and 153
rebuilt-bundle hardening/variant/freshness tests; 94 MCP catalog/identity contracts;
8 browser integration, 9 fidelity visual and 17 app UI tests; installed OpenCode
2.0.28 timeout normalization; Go tests and vet. Clean standalone source bootstrap,
runtime package/extraction, repeated setup without Go/Bun, setup fixtures, all
approved hashes and release/privacy/syntax gates pass. Exact-head hosted CI is
reported separately. The ordinary working-tree release scan encountered historical ignored
BOM JSON; authoritative release checks run on a clean archive, without changing
those local records or weakening the scanner.

## Limits and rollback

V1.2.5 remains **HOLD**: no SET_VARIABLE/CONDITIONAL workflow or playback claim.
Receipt persistence is execution evidence, not a stateful prototype feature.
No new public command or advanced motion, overlay, variable, source, browser or QA
capability is introduced. Original 106 operations remain functionally compatible
with the matched pair; optional reliability fields are additive.

To roll back main, restore the 1.0.0 source pin/approval and matching three artifacts
from the ownership checkpoint; reimport/reload that same plugin identity and close
newer bridge leaders. Beta 3 remains the immutable published older-runtime fallback.
Never mix the server/plugin versions or accept a hash by version string alone.

V1.4.4 desktop packaging can build on this baseline after final shipping gates,
with explicit runtime activation/rollback and indeterminate-write recovery UX.
Keep bounded retention, session identity, single-plugin ownership, full-snapshot
cost, follower budgets and unresolved wildcard permissions visible. Do not add
new reliability architecture or silently promise global exactly-once behavior.
