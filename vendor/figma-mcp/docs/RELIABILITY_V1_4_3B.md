# Reliability hardening — V1.4.3B

Native acceptance is verified; standalone runtime adoption is tracked separately.
This is an unreleased source contract, not a public stable release announcement.

Figma Designer MCP 1.1.0 adds bridge protocol 2. The original 106 tools retain
their required inputs; 72 document-mutating tools receive optional reliability
fields. Two read-only primitives bring the catalog to 108. `slide_template`
action=list remains read-only. See WRITE_PATH_AUDIT_V1_4_3B.md and its exact-schema
JSON inventory, recorded before implementation.

## Guarantees and boundaries

- The plugin serializes mutations and document reads and owns execution and receipts.
  Health, handshake and receipt lookup remain available while an operation is running.
- `operationId` is an opaque 16–80 character ASCII ID. Use unique, high-entropy IDs,
  never prompt-derived identifiers. The server generates a random 128-bit ID if absent.
- A fingerprint binds tool, normalized transported arguments, target IDs,
  preconditions, bridge protocol and document identity. Transport requestId is excluded.
- A retained COMMITTED operation never dispatches again with the same fingerprint.
  Different arguments/tool/document identity return OPERATION_ID_CONFLICT.
- Failed/unresolved operations are not replayed. A new operation requires inspection
  and explicit reconciliation, not automatic blind retry.
- Native Figma mutations are not transactions. No rollback or unbounded exactly-once
  guarantee is claimed. Preconditions are checked before entering the handler; Figma
  user edits may still interleave with awaited native operations.
- COMMITTED means the handler completed without returned/per-item/recorded errors,
  not that every possible product intent has been validated.

## Receipt architecture and retention

The plugin stores one bounded journal value in local `figma.clientStorage` under
`figma-designer-mcp-receipts-v2`: at most 500 operations, seven days, four MiB.
Completed entries evict oldest-first. Unresolved entries are not capacity-evicted;
when all 500 are unresolved, new writes fail closed. Time expiry still applies.
An absent/expired/evicted receipt returns UNKNOWN, never proof that no write occurred.

Intent is durably recorded before dispatch. Completion is saved before posting the
response to the UI/WebSocket. Thus an ordinary socket response loss can be recovered
by lookup after reconnect/server or client restart. A plugin crash/storage failure
between native mutation and durable completion leaves IN_PROGRESS: inspect, never
replay. Closing/reloading the plugin cannot provide a transactional commit guarantee.

Storage is a single clientStorage replacement, not a database. Malformed or duplicate
records fail closed with RECEIPT_STORAGE_CORRUPT; original storage is retained, not
silently reset. Read-only inspection and health diagnostics remain available. Repair
requires investigating the journal and existing document before any manual reset.

The supported scope is one active development-plugin instance. ClientStorage has
no cross-instance compare-and-swap primitive: multiple simultaneous plugin cores
can interfere with journal replacements. Cross-instance/global exactly-once is
not promised. UNKNOWN/IN_PROGRESS always requires inspection, never automatic replay.

Receipts whitelist operation/tool/status/times/scoped revisions/IDs/counts/bounds and
fixed warnings. Summaries are bounded to 32 object visits/32 leaf fields, depth 3,
32 array entries; node-ID evidence is capped at 32 IDs of at most 96 characters per
list. These are bounded samples, never a claim of complete affected-node closure.
No document, prompt, text, image,
credential, environment or path payload is persisted. The full existing normal result
is returned on first success. Replays return the bounded prior summary and receipt;
clients needing full detail must inspect the actual IDs.

States: IN_PROGRESS, COMMITTED, FAILED_PRECONDITION, FAILED_BEFORE_WRITE,
FAILED_AFTER_PARTIAL_WRITE and FAILED. The last means a dispatched failure whose
effects are not proven; it is not retry-safe. Partial state requires observed scoped
revision change. Failures before server/plugin dispatch may have no receipt at all.
HTML and batch tools are one operation; soft per-item errors cannot become COMMITTED.

## Preconditions and revisions

Optional `preconditions` supports expectedNodeType, expectedParentId, expectedName,
expectedComponentId, expectedComponentSetId, expectedReactionCount,
expectedChildrenCount, expectedVisible and expectedRevision. The top-level
expectedRevision is equivalent; conflicting forms fail closed. Unknown fields,
missing targets and uninspectable properties yield PRECONDITION_UNVERIFIED;
mismatches yield PRECONDITION_FAILED or STALE_DOCUMENT_REVISION, before dispatch.
Batch guards apply to every identified target, not just the first. Unsupported
target shapes fail closed rather than ignoring requested guards.

`get_document_revision` hashes sorted-key canonical JSON with SHA-256, matching
canonical-json-sha256-v1 conventions. Scope is current-page native properties,
geometry, child order, reactions, instance sources, plus all local styles and variables.
Selection/viewport are excluded. Other pages' node trees and remote resources are
not a full-document revision. Resource changes can conservatively invalidate the
token even when unused. Reads do not change the token; native changes do.

fileKey is used when available. Otherwise document identity is explicitly a plugin
session nonce. Revisions/fingerprints then invalidate across plugin reload; old
receipts remain queryable, but a mutation cannot be replayed in an unverified new
document session. Revision fields do not replace expected target/source checks.
Receipts record scoped revisions before/after when readable. A page switch makes
created-node closure unavailable rather than mislabelling existing page nodes as new.

Name-based instantiation keeps existing exact/substring behavior without guards.
Guarded calls verify the resolved source/set before creation and actual instance
source afterward. Guarded swap also checks the destination set before mutation,
then actual resulting source. No name-only safety claim is made.

## Handshake, reconnect and errors

health_check retains all legacy fields and adds handshake server/plugin identities,
versions, bridge protocol, document/page/access metadata, capabilities, storage health
and compatibility state. Every write requires a fresh compatible bridge_hello;
old/mismatched plugins remain readable where safe but cannot receive unsafe writes.
Transport IDs include a random server-instance nonce to avoid stale-response
collisions after restart. UI reconnect never replays pending mutation requests.

Codes include PLUGIN_NOT_CONNECTED, BRIDGE_UNAVAILABLE, DOCUMENT_UNAVAILABLE,
PROTOCOL_MISMATCH, PLUGIN_VERSION_MISMATCH, CAPABILITY_UNAVAILABLE,
WRITE_RESPONSE_LOST, RECEIPT_UNKNOWN, STALE_DOCUMENT_REVISION, PRECONDITION_FAILED,
PRECONDITION_UNVERIFIED, OPERATION_ID_CONFLICT and receipt storage failures.
Developer transport details remain alongside safe codes. A timeout or write-response
loss remains indeterminate. Query the known operation ID, inspect and reconcile.

## Network permission audit

NETWORK_PERMISSION: UNRESOLVED (wildcard retained; not asserted technically required).
The [official manifest specification](https://developers.figma.com/docs/plugins/manifest/)
documents ws/wss and explicit localhost ports. It does not establish a safe pattern
covering every configurable local port/address. This milestone leaves permissions
unchanged rather than claiming an untested restrictive pattern works. Default bind
remains 127.0.0.1; historical non-loopback binding retains the explicit unauthenticated
network warning. No remote networking capability is added. A future restriction
needs native default/alternate-port tests and a defined supported address policy.

## Tests and live acceptance

Plugin tests exercise the actual native create/update/delete handlers through the
reliability wrapper, concurrent duplicates, conflicts, failure/storage/reload paths,
all-target guards, source/set checks, revisions, redaction and retention. Go tests
cover envelope propagation through rebuilt params, handshake gating, catalog
additivity, transport identity and error classifications. Existing tool schemas and
unchanged source files remain compared to the 1.0.0 fixtures.

Live results are recorded separately in the standalone integration report. Unit
fixtures never substitute for native connection, response-loss, reconnect or
component/prototype acceptance. No public stable release/Beta 4 is authorized.
V1.2.5 remains HOLD; variable CRUD behavior does not enable conditional prototypes.

### Plugin compiler compatibility

The first candidate failed native startup with `stack underflow (op=113, pc=139)`.
The ES2015 build lowered `for (const item of await read())` to a generator with
`yield` in the iterable expression. An isolated QuickJS 0.23.0 WASM probe reproduced
the bundle failure at pc=139 (opcode 132 in that engine build). Awaiting each resource
list before its loop removes the compiler failure without changing revision inputs.
The rebuilt full bundle starts in that engine and in Figma Desktop: native health
reports plugin/server 1.1.0, protocol 2, COMPATIBLE and receipt storage READY.
Source AST regression tests prevent this pattern recurring; no build target or
runtime dependency was changed. Broader native write/reconnect acceptance remains
separate from this startup repair.

Revision collection follows the existing collector's field eligibility: vector
outlines are read only for VECTOR/BOOLEAN_OPERATION, and variant definitions come
from the parent set. This avoids unnecessary text glyph-outline computation and
invalid native getters while retaining typography runs and vector sensitivity.
Mutations emit existing progress_update envelopes after pre-write revision and
after dispatch, before post-write inspection, yielding to deliver those messages
before further synchronous snapshot work. Existing timeout values are unchanged.
Final native cleanup returned COMMITTED in approximately 32 seconds with progress
delivered. Two large-page read revisions were stable (approximately 15–16 seconds
each); that full-scope cost remains a limitation, not a constant-time revision claim.

Native probes verified duplicate/conflict/stale guard behavior, component source
checks, reaction-count guards, controlled committed-response loss and persisted
receipt lookup after plugin reload. All probes used one disposable page, removed
afterward. Protected page/source fingerprints restore exactly. Initial page create
and cleanup responses timed out and were recovered by receipt lookup, never replay.
Figma rejected deleting the active audit page; receipt/revision inspection confirmed
no change before switching pages and submitting a distinct cleanup operation.
The old external OpenCode runtime that reclaimed port 1994 during restart was
closed, and the owned 1.1.0 process regained leadership. Final native cleanup,
progress delivery and matching protected fingerprints were verified afterward.
Standalone adoption and exact-commit build/CI remain separate shipping gates.
