FIGMA INTERACTION QA V2 — V1.2.7

QA verifies intended behavior; Critique judges visual quality. A visually weak but
correct button can PASS; a beautiful dead primary action must FAIL. No new command.
No repairs, normalization, cleanup, content generation, node/component/reaction/
overlay/variable writes. Recommendations do not authorize execution. V1.2.5 stays
HOLD; readable stateful objects do not certify SET_VARIABLE/CONDITIONAL playback.

## Deterministic read-only pipeline

Use rules/figma-interaction-qa.mjs and scripts/figma-interaction-qa.mjs as the primary
inventory/graph/path/finding engine. Run the collector once per scoped QA, not an
unbounded repeated node-by-node campaign. Its closed read allowlist, start/end full
document plus source/graph fingerprints and trace enforce its inspection boundary.
It uses the existing approved bridge and source collector; no MCP/runtime change.
Source closure failure caused by a bad destination uses existing raw reads to
report the defect rather than mistaking incomplete evidence for PASS.

Before invoking, resolve the requested scope and write a compact local evidence
JSON only when needed (for example .figma-designer/qa-v2/scope.json). This is input
annotation/report data, not Figma authoring. Then run:
node scripts/figma-interaction-qa.mjs --scope .figma-designer/qa-v2/scope.json --json
Without scope, inspect the complete current runtime. Do not generate browser output.
The CLI prints its result; it never creates/repairs Figma or exports a browser app.

Evidence JSON keys (all node IDs must resolve live):
- screenIds/controlIds: optional bounded scope, never claim excluded controls were checked.
- productionIds: protected source roots when known; default page-level non-system FRAMEs.
- controls: [{id, role, sourceProductionId?, expectedFamilyId?, inheritedRequired?,
  intentionallyInert?, inertReason?, overlayIntent?, destinationId?, preconfiguredVerified?,
  outsideClickRequired?, backgroundRequired?, motion?, expected?}].
- expected: {confidence: VERIFIED|STRONG|INSUFFICIENT, source: exact user/source
  evidence, actions: [{type: NAVIGATE|CHANGE_TO|OPEN_OVERLAY|CLOSE|BACK|SCROLL_TO|SWAP|URL,
  destinationId?, trigger?}]}. Never supply VERIFIED for model speculation.
- screens: [{id, kind?: SCREEN|OVERLAY, sourceProductionId?, role?, requiredReachable?,
  requiresContinuation?, optional?, intentionalRepeat?}].
- startIds: evidence-based starts; no leftmost-canvas assumption.
- scenarios: [{id, name, startId, endId?, required?, primary?, steps:
  [{type, controlId?, destinationId?, trigger?}]}]. Only known requested/source journeys.
- requiredStates: {componentSetId: [source-required State values]}.
- expectedOrders: [{parentId, childIds}], only source-established intended order.
Do not guess destinations, menu values, validation/payment/authentication rules or
invent a Back requirement on a valid terminal. Annotation expresses evidence; it
does not overwrite readback. Missing required actual behavior remains BROKEN.

## Inventory, graph and evidence

Inventory reactionless controls too. The engine discovers reacted nodes, verified
control-family instances and concrete padded/surfaced text-control affordances;
add meaningful tabs/cards/rows/icon controls missed by structural heuristics using
source evidence. Exclude decoration. Report role, real control/screen IDs, source
counterpart if known, actual instance component/set, expected vs actual and evidence.
Unknown expectation stays UNKNOWN_EXPECTATION, not an invented defect or hidden success.
Explicitly undefined behavior can be INTENTIONALLY_INERT. WORKING_ACTION and
WORKING_STATE are exclusive coverage totals; state facets on action controls are
reported separately so inherited hover/press is not double-counted.

The graph distinguishes SCREEN, OVERLAY, STATE_VARIANT, EXTERNAL_URL, SCROLL_TARGET
and typed descendant edges. Native plural arrays are authoritative; source variants
are also inspected without blindly appending inherited duplicates. Validate actual
destinations/types/ownership, same-set CHANGE_TO, duplicates, CLOSE context and motion.
Journeys follow descendant edges, preserve overlay stack/return context and Back
history, and distinguish VALID_TERMINAL from an evidence-required DEAD_END. Conditional
or unproven multi-location execution is LIMITED, not a certified path.

VERIFIED = direct readback; STRONG = corroborated user/source intent; LIMITED =
native/evidence boundary. Stable sorted findings Q01, Q02... include severity,
classification, Problem, Why it matters, evidence grade/real IDs, Expected, Actual,
and recommended narrow workflow (not executed).
BLOCKER: primary journey/ownership unsafe. HIGH: major intended behavior broken.
MEDIUM: secondary/duplicate integrity problem. LOW: non-blocking inconsistency.
LIMITATION: capability boundary. No numeric score or generic design critique.

## Overlay, motion, result and planner

Preserve rules/figma-overlay-rules.md: CENTERED_MODAL supported, PRECONFIGURED_OVERLAY
conditional, unavailable contextual configuration FIGMA_LIMITED. A false CENTER
substitute is BROKEN; real required CLOSE must exist in overlay context. Readonly
settings never change; required unconfigured outside/background behavior is limited.
Use shared Semantic Motion tokens/tolerances; audit MATCH/MISMATCH/LIMITED/UNKNOWN
without rewriting. No invented motion, component states or business consequences.

PASS: no broken controls, invalid graph/ownership, required failed journey or mutation.
WARN: supported core valid, optional limitations/undefined expectations or low-impact
motion/integrity observations remain. FAIL: any implementable expected behavior
broken, unsafe ownership, changed protected fingerprints, forbidden tool call or
incomplete required verification. A syntactically valid reaction array is insufficient.
Native structural path PASS is not exhaustive manual usability/playback testing.

The final report starts FIGMA_INTERFACE_QA: PASS/WARN/FAIL, followed by scope,
coverage, journeys, stable findings, limitations, before/after integrity and
READ_CALLS/WRITE_CALLS. Include the deterministic summary for the planner:
QA_STATUS, BLOCKER_COUNT, HIGH_COUNT, MEDIUM_COUNT, LOW_COUNT, LIMITATION_COUNT,
BROKEN_CONTROL_COUNT, UNREACHABLE_COUNT, BROKEN_EDGE_COUNT.
QA is terminal even inside Prototype Planner. Never auto-chain repair or reinterpret
QA FAIL as success. A later explicit bounded authoring request may repair separately.
Browser QA stays separate and missing browser exports do not fail native QA.
