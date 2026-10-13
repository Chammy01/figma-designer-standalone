# V1.2.6 supported centered overlays and contextual limits

Audited 2026-10-13 against released Beta 2, commit
`b10bd1487aeab3a68fd4992df2ef7a7183d87a3e`, upstream
`5806e71b8fd4bad97671038a0b010f04df1aaa41`, installed Plugin API typings
`1.124.0`, and the connected non-sensitive Untitled Desktop acceptance file.
CAPABILITY AUDIT: PASS. SUPPORTED: CENTERED_MODAL.
FIGMA_LIMITED: CONTEXTUAL_DESTINATION_CONFIGURATION.
The supported subset uses existing workflows; autonomous contextual preparation
is excluded. Milestone acceptance is recorded separately below.
V1.2.5 remains HOLD. No SET_VARIABLE or CONDITIONAL probe was repeated.

## Capability decision

**MCP_GAP: NONE.**
**FIGMA_CAPABILITY_LIMIT: destination overlay configuration is readonly in the
supported Plugin API.** This is a native capability boundary, not a missing transport
operation and not grounds for a runtime rebuild or invented setter.

The generic public `set_reactions` transports NODE + OVERLAY, CLOSE and
`overlayRelativePosition` without losing their objects. Its plugin validator accepts
the actions. Figma itself rejected the contextual placement request:

> Actions only support overlayRelativePosition when navigation is "OVERLAY" and the destination is a frame with overlayPosition equal to "MANUAL"

New native FRAMEs have `overlayPositionType: CENTER`,
`overlayBackground: {type: "NONE"}` and `overlayBackgroundInteraction: NONE`.
The pinned API declares **all three destination properties read-only**. These
properties are not writable action fields. The 106-tool public catalog, create/modify
writers and HTML writer expose no operation to configure them.
There is no demonstrated MCP transport loss and no overlay plan rejection.

Consequently, supplying a relative vector cannot create a contextual popover on a
new default FRAME. Moving the destination on the canvas cannot solve this.
Background dimming and native outside-click configuration have the same authoring
boundary. Do not add guessed action fields, cast away read-only declarations, use
invisible dismissal rectangles or substitute NAVIGATE.

The shipping scope is centered modal OPEN/CLOSE and conditional reuse of existing
preconfigured runtime destinations. MANUAL relative placement additionally requires
verified coordinate semantics and playback. No UI automation prepares those settings.
No runtime extension was implemented; adding an MCP setter alone would not make
a read-only native property writable. Contextual limitations do not block supported
modal work and must never be disguised as equivalent centered behavior.

## Exact native contract

The pinned `Action` NODE member contains `type`, `destinationId`, `navigation`,
`transition`, optional `overlayRelativePosition: Vector`, and optional existing
scroll/video/component-reset fields. OPEN uses `navigation: OVERLAY`; CLOSE is
`{type: "CLOSE"}`. BACK is a different action, not an interchangeable close shortcut.

Successful request, before Figma adds its readback defaults:

```json
{
  "trigger": {"type": "ON_CLICK"},
  "actions": [{
    "type": "NODE", "navigation": "OVERLAY", "destinationId": "47:11",
    "transition": {"type": "DISSOLVE", "duration": 0.15, "easing": {"type": "EASE_OUT"}}
  }]
}
```

Readback retains the full plural actions array and exposes the deprecated singular
`action` mirror. Figma adds `resetVideoPosition: false` and returns duration
`0.15000000596046448`; the existing OVERLAY_DEFAULT tolerance accepts this value.
Never reconstruct unrelated actions from a shortened example.

`overlayRelativePosition: {x: 24, y: 170}` reached Figma intact on the Status
trigger, but failed because destination `47:16` was CENTER, not MANUAL. A hover
request with `{x: 260, y: 200}` failed at the same placement prerequisite; this
does **not** establish that ON_HOVER itself is unsupported.
Exact retained fixtures: `scripts/fixtures/overlay-capability.json`.

## Support and ownership

| Family / behavior | Audit result |
| --- | --- |
| Centered details overlay + explicit CLOSE | Native open/close playback observed. No dimming claim. |
| Modal background/dimming configuration | Read-only destination property; no current setter. |
| Contextual popover / menu / dropdown | Relative positioning blocked on newly created CENTER frames. Real options remain required. |
| Tooltip | OVERLAY_LIMITED: contextual placement prerequisite; hover playback not verified. |
| Confirmation overlay | No supplied confirmation semantics tested; no business result invented. |
| Outside-click dismissal | NONE captured; clicking outside did not dismiss. Configuration not exposed. |
| BACK from overlay | Pinned action exists; overlay-specific playback not verified. |
| Nested overlay / SWAP replacement | Types alone do not prove behavior; not verified, remain limited. |
| FRAME under canonical Interactive App SECTION | Open and close worked with both source and destination in that SECTION. |

The proven target is a native editable FRAME. Other destination node types were
not tested and must not be advertised as equivalent. Production remains read-only.
Runtime ownership is the existing `Figma Designer — Interactive App` SECTION
`36:719`; no second container or page was created. Probe content was explicitly
test content: a details message, Close, and the requested All / Active / Delayed
options. No account menu, options, validation rule or persistent state was invented.

## Supported workflow integration

`rules/figma-overlay-rules.md` is the shared support/ownership/idempotence policy.
Interactive and QA read it; the planner carries their full canonical contracts and
orders overlay assembly within INTERACTIVE, before motion and terminal read-only QA.
The existing router selects WORKING_INTERACTION for modal open/close or contextual
menu requests; MOTION for softer existing transitions, QA for correctness checks,
and PROTOTYPE_PLANNER for broad multi-capability requests. No new route or command.

| Category | Policy |
| --- | --- |
| CENTERED_MODAL | Real content, native runtime FRAME, verified CENTER settings, OPEN and real required CLOSE. |
| PRECONFIGURED_OVERLAY | Reuse readonly settings only when already appropriate; MANUAL relative position needs proven coordinates/readback/playback. |
| CONTEXTUAL_OVERLAY_REQUIRED | FIGMA_LIMITED when not already suitably configured; zero unsupported placement writes, no CENTER substitute. |

Required outside-click or background changes similarly remain FIGMA_LIMITED unless
already configured. Optional limitations allow WARN while supported core work
continues; a required unavailable outcome is BLOCKED. Broken supported behavior or
forbidden mutation is FAIL. No unseen menu content or business behavior is invented.
There is no V1.2.5 variable phase. QA reports missing/invalid/production destinations,
ownership, duplicates, required CLOSE/context, orphan/reachability, wrong CENTER
substitution, non-MANUAL relative vectors, settings/motion and protected fingerprints;
it never repairs. Flow retains focused journey ownership, without a second builder.

Existing reaction discipline remains required: complete before/after arrays,
unrelated trigger/action/destination preservation, owned runtime only, and lossless
readback. A write timeout remains indeterminate; reconcile before retry. No timeout
occurred in the initial audit. Reuse and repeat-request no-op behavior are required
by the integrated policy and must be demonstrated separately in acceptance.

Semantic Motion remains authoritative. The probe uses centralized OVERLAY_DEFAULT
(restrained dissolve, EASE_OUT), not arbitrary timeline or state animation. CLOSE
does not receive invented transition fields. No motion module or token was changed.
The critique guard and V1.2.5 HOLD documentation/tests are unchanged. The policy is
included in source/release allowlists and setup's required-project-file validation.

## Source freshness and browser audit

Ordinary get_node/get_nodes_info serialize bounds/styles/children, not the native
overlay metadata. The existing read-only browser-source projection captures the
destination's native position/background/dismissal properties and complete reaction
arrays, including relative position and CLOSE. Live capture included all probe
FRAMEs; deterministic tests also prove referenced destination closure outside the
runtime, content closure and runtime-owned destinations.

Tests verify that position mode, relative vector, background, outside-click setting,
overlay text and close action changes affect the fingerprint. Unrelated production
content does not. These are **capture tests**, not proof the fields can be authored.
SOURCE_PROJECTION_VERSION remains `figma-browser-source-v1`; no collector change
was needed.

BROWSER_OVERLAY_PARITY: PARTIAL. The browser command contract describes local DOM
overlay/CLOSE translation, but there is no current generated browser artifact in
this file and no verified contextual overlay playback parity. The browser tests
cover their existing scope; they do not prove these new native overlay behaviors.
No browser implementation was added. Missing exports still report UNVERIFIED;
stable live source does not manufacture a CURRENT browser export.

## Preserved Phase-0 native acceptance evidence

| Case | Structural evidence | Playback / outcome |
| --- | --- | --- |
| LIVE A | View details `47:5` opens FRAME `47:11`; Close `47:14` has CLOSE. | Click opened centered details above base `47:3`; Close dismissed to the same base screen. Observed in Desktop's native prototype player. Phase-0 probe, not natural-language workflow acceptance. |
| LIVE B | Status `47:7` -> options FRAME `47:16`, supplied All / Active / Delayed. | Relative-position write rejected; no popover open reaction or contextual playback proof. |
| LIVE C | Help `47:9` -> content FRAME `47:26`. | Positioned ON_HOVER request rejected; zero authored hover reaction. Tooltip playback not verified. |
| LIVE D | No repeated authoring campaign. | Deferred after capability HOLD; no claim of rich-workflow idempotence. |
| LIVE E | Planner workflow unchanged. | Deferred; no planner overlay campaign or stateful phase. |

All four same-run root IDs (`47:3`, `47:11`, `47:16`, `47:26`) were inspected and
removed through the existing MCP after recording evidence. They contained 26 native
nodes. There were 10 MCP mutation attempts: four HTML writes, five reaction writes
and one scoped cleanup; eight completed, two placement requests were rejected.
The three successful reaction writes were the details OPEN and two explicit CLOSE
controls. Rejected Status/Help arrays stayed empty. No production write, variable
operation, stateful reaction attempt or timeout occurred.

Before and after cleanup: 1,274 page nodes; identical full serialized page SHA-256
`42e8efb7cb579d7320c9b148c259459a3fa4c28285c4773dffe500d09ab0c23c`.
Seven protected roots and five protected reaction arrays matched exactly.
SECTION ID, dimensions, children and existing production/state/runtime roots were
restored. Selection/viewport changes from playback are not document authoring.

Final read-only regression made 24 read calls and **zero writes**, with four stable
source reads across two collections. Restored source fingerprint:
`3104da00c58fac6c4e556fc3c9dbacf5497411305383da48390d619c48b65a53`.

## Integrated natural-language acceptance

Completed against the same non-sensitive Desktop document using ordinary conversation
with the existing figma-designer agent. The isolated runtime screen `47:32` reuses
INSTANCE `47:34` of component `34:709`, family `34:716`, and supplied details/menu
content. Modal FRAME `47:38` and menu FRAME `47:43` are inside SECTION `36:719`.
Fixture preparation created only these three FRAME roots (16 native nodes), changed
the instance label and extended owned SECTION height to 1740; old screen geometry
and production were preserved. This preparation is separate from workflow counts.
These isolated acceptance artifacts are retained for review, not hidden or removed.

| Case | Actual route / result | Figma mutation calls |
| --- | --- | --- |
| LIVE A: open supplied details as a centered modal; Close dismisses | WORKING_INTERACTION; supported OPEN/CLOSE wired and independently verified; native Desktop playback opens above base and closes back to it | 2 set_reactions: `47:34`, `47:41` |
| LIVE B: supplied Status options directly below trigger, never centered | WORKING_INTERACTION; FIGMA_LIMITED: CONTEXTUAL_DESTINATION_CONFIGURATION; no fake centered edge or rejected write retry | 0 |
| Final required-outcome status rerun of LIVE B | WORKING_INTERACTION; FIGMA_INTERACTIVE: BLOCKED, since contextual placement is the entire required outcome | 0 |
| LIVE C: optional MANUAL reuse | Not run: no suitable existing MANUAL destination; no UI preparation performed | 0 |
| LIVE D: make sure existing modal works | QA; read-only verification, WARN only for the separately limited menu/undefined existing control | 0 |
| Verbatim repeat of original LIVE A authoring request | WORKING_INTERACTION; same FRAME, OPEN, CLOSE, hover, content and settings; zero redundant writes | 0 |
| LIVE E: screen interactive with existing details/menu and subtle motion | PROTOTYPE_PLANNER: WARN; states/runtime/motion verified reuse, flow skipped, terminal read-only QA WARN; BROKEN = 0 | 0 |

The semantic-motion phase came after verified existing reactions; all matching
tokens were no-ops. QA did not repair or normalize. The planner completed supported
modal work while truthfully leaving the contextual menu and its options unreachable.
An optional limitation did not invalidate the core; a contextual-only required
request was BLOCKED. No variable phase, new states, screens, options or business logic.

Native playback was observed through Figma Desktop's actual prototype player,
separately from JSON readback. OPEN uses DISSOLVE/EASE_OUT with float32 duration
inside OVERLAY_DEFAULT tolerance; CLOSE has no invented transition. Default NONE
background and outside interaction are reported honestly. No tooltip/shared/nested
playback or autonomous contextual placement is claimed. PRECONFIGURED_OVERLAY is
conditional policy/contract coverage, not a live MANUAL acceptance claim.

One full-document **read** timed out during the final limitation rerun. It was
reconciled with lighter scoped reads and a successful standalone document read.
There was no write in flight, write timeout or write retry; timeout policy unchanged.

Four production roots' scoped get_node snapshot SHA-256 before/after:
`19833832c6463bf79128eb383dc3c3378d7a6b4ec55278bdda892f2e8f2f4678`.
Seven protected roots and five existing protected reaction arrays match exactly.
The serializer fingerprint covers native text/style/geometry/hierarchy; reaction
protection also uses the complete known arrays and audited write targets, not a
claim that get_node serializes all production reactions.

Complete captured source is identical after LIVE A, B, D, the authoring repeat,
E and the final B rerun:
`305132db06a84df82351b91fbc02f99f028e5d9a4cc29289d4e5cfb78afdd204`.
Final independent source regression: 24 reads, zero writes, four stable source
reads across two collections; full page remained unchanged during that read-only
regression, SHA-256 `46bb7e03c6b6a22adef48f273999308cbf0e590a777cc4633dcb8833d79f8eec`.
Missing browser exports remain UNVERIFIED; live source availability/stability is
not misrepresented as CURRENT browser parity.

Known acceptance-fixture observation: the unused menu heading is wider than its
frame. QA reported it without repair; it does not establish supported menu placement
or contradict the completed centered-modal flow. Model-guided inspection can be
expensive: the broad planner and QA turns performed many reads, although no writes.

## Tests and shipping status

Twenty-five command/workflow contracts and eleven added audit/source tests cover
the shared support categories, readonly configuration boundaries, required BLOCKED
versus optional WARN, reuse/idempotence policy, route expansion, planner order,
read-only QA, Semantic Motion, production/guard/hash boundaries and no new command.
Source tests also cover native action pass-through, propagation of
the exact placement error without committing, source closure/settings/content,
field-sensitive fingerprints and unrelated-content exclusion. Native error
simulation is explicitly separate from observed playback evidence.

| Regression | Result |
| --- | --- |
| npm contracts (design/briefing/router/planner/motion/critique and existing capability contracts) | 196 passed |
| Overlay contracts in a clean source archive without generated artifacts | 25 passed |
| Plugin tests | 275 passed |
| Source/hardening/variants | 97 passed, including 56 source tests and 11 new audit tests |
| Same source/hardening/variants against approved dist/code.js | 97 passed again |
| Browser fixtures | 6 passed |
| Installed OpenCode 2.0.24 timeout contract | 1 passed, no skip |
| Setup fixtures, including missing overlay policy | 27 passed |
| Release-mode source/syntax/config/privacy/runtime checks | PASS |
| Live read-only source and protected reactions | PASS; 24 reads, zero writes |
| Final plugin health/catalog | PASS; 106 tools, combine_as_variants present, no recent errors |

Approved artifact SHA-256 values remain:

- Executable: `bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f`
- Plugin code: `273e20f56b80e9a7d995962948b1bb93e5cc1dfa19471ecd834ca7308d7da941`
- Plugin UI: `661fb49dd3ca38ed4648e70858822f59f565093718d02143c6b1b85628f054ee`

All three approved Beta 2 runtime artifacts and release/projection versions are
unchanged. No runtime build, new MCP capability, plan bypass or stateful enablement.
Source-only contracts pin approved digest metadata and verify artifact bytes when
present; the build/release jobs enforce generated-runtime integrity. The initial
hosted node run exposed an incorrect dependency on omitted generated files, fixed
and reproduced with clean-source coverage before the final CI run.
Local supported-scope acceptance, idempotence and regressions passed. Hosted CI is
reported separately for the exact pushed revision, not borrowed from the baseline.
No release package or hash rotation is needed for this command/rule-only milestone.

Changed files: interactive/QA command contracts, the shared overlay rule, intent
router and planner instructions, command/audit documentation, source/release
allowlists, package test enumeration, overlay/native-source tests and fixture,
setup required-file enumeration and setup regression. No public command was added.

FIGMA_RICH_OVERLAYS: PASS
