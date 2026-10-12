# Prototype Planner — V1.2.3.3

The internal `PROTOTYPE_PLANNER` route handles explicitly authorized broad prototype
outcomes in the existing `figma-designer` conversation. There is no new command or
alias. Narrow requests keep their canonical specialist workflow.

"Make this app interactive", "Wire up this onboarding flow", and requests combining
states, navigation and transitions can select the planner. "Add hover states",
"Connect this button to Settings", "Use dissolve", "Check for dead controls" and
"Make the hero shorter" remain states, flow, motion, QA and revision respectively.
"Make it better" asks for clarification. "Make it work" requires context establishing
an existing prototype and intended behavior; discussion is not write authorization.

## Architecture

The existing provider-compatible session classifier selects the internal route.
The prompt hook attaches [planner instructions](../rules/figma-prototype-planner.md)
and the complete current bodies of `/figma/states`, `/figma/interactive`, `/figma/flow`,
`/figma/motion` and `/figma/qa`. These remain independent canonical contracts, not
programmatically invoked commands or a new MCP tool. Setup validates the additional
packaged rule dependency. The router loads it only inside a selected planner route's
fail-closed boundary; a missing planner file cannot prevent critique guard installation.

Read production, state/runtime artifacts, components and reactions; inventory all
meaningful controls; map defined behaviors and real destinations; order the required
operations by prerequisite. Ask one ordinary-chat question before writes for material
missing semantics. A plain reply combines with the original request and resumes the
pending plan in the same conversation. Optional undefined behavior is reported
truthfully, never filled with invented screens, options, data or business logic.

States precede runtime integration when families are missing. Interactive upgrades
runtime/control coverage; focused flow handles explicit edges still missing or serves
as the runtime builder when sufficient. The planner never blindly runs both builders.
Reuse mappings/screens/reactions after every phase. Motion is conditional on request
or evidence, with no rewrite when defaults already match. QA is always last and
strictly read-only; defects are reported without an automatic repair loop.

## Safety and verification

Production remains read-only. Each CURRENT PHASE carries its own scope, prerequisites,
protected baseline and exit checks. State writes stay in the state-library FRAME;
runtime/flow writes stay in the runtime SECTION, with only the existing interactive
library-reaction exception. Motion changes existing transition objects only. Never
merge phase permissions. Preserve full reactions, verify actual INSTANCE source and
componentSetId, use real Auto Layout ordering, and compare matching coordinate spaces.

Timed-out writes are indeterminate: read, stabilize, reconcile, retain valid work and
retry only confirmed missing operations. Stop dependent writes after failed checks.
Final verification checks protected fingerprints, native editable structure, complete
coverage, reachability, geometry, component identities and duplicate artifacts/edges.

Critique guard code, provider-visible tools, persistent storage and enforcement are
unchanged. No critique invocation occurs in the planner. Queued/steering prompts cannot
unlock a guarded turn; new idle requests use the established guard lifecycle.
No MCP, plugin/Go runtime, source freshness, approved hashes or timeout policy changes.
Existing overlay behavior remains under the interactive contract; no new variables,
conditionals, overlay framework, timelines or browser parity are introduced.

The final report shows phase outcomes, actual IDs, implemented behavior, limits,
recovery and QA evidence. Planner PASS requires completed required work, successful
checks, QA PASS and unchanged production. WARN retains genuine limitations/QA warnings;
BLOCKED means required evidence or prerequisites are unavailable; FAIL means forbidden
mutation, broken implementable behavior or failed checks. Plan-only is zero-write and
cannot claim execution success.

## Validation

Contract tests exercise route expansion, all five unchanged canonical bodies, missing
dependencies, ordering, clarification/continuation, bounded recovery, conditional
motion, terminal read-only QA, truthful reporting, no new command and guard lifecycle.
Setup includes a missing-planner dependency fixture. These tests validate instructions
and hook behavior; they do not prove every model follows a plan or that a rendered
prototype works.

Local regression: npm contracts (146 tests), plugin (275), hardening/variants (41),
live-source (26), installed OpenCode timeout contract (1), setup (24 fixtures),
release/source checks and approved-runtime/privacy validation passed. The clean
source archive used the pre-change HEAD; its extracted runtime builds and the
current working-tree release package passed. Hosted CI checks the final committed
source archive separately. Go source was not changed.

Provider classification previews covered broad goals, narrow specialists, ambiguous
versus known-context "make it work", pending planner answers and discussion without
authorization. Initial trials over-clarified missing runtime/checkout semantics and
re-expanded a pending answer; routing instructions now distinguish a known workflow
family from missing execution prerequisites and explicitly continue pending answers.
Exact JSON code fences are accepted; arbitrary prose, malformed or unknown routes
still fail closed through the unchanged critique guard. Previews generate text only;
they do not execute model-returned tools or constitute live authoring evidence.

### Live Figma acceptance — Untitled, isolated current-page runtime

Natural-language requests ran through the actual OpenCode prompt hook and configured
free provider, using existing café production `28:283`, hero `28:309`, menu `29:330`
and primary state family `34:716`. No new pages or production designs were created.

- Plan-only: 56 inspection calls, zero writes, identical complete-page fingerprint.
- Execution: reused the complete primary family (states no-op); created runtime
  SECTION `36:719`, hero FRAME `36:720`, menu FRAME `36:739`, and primary INSTANCE
  `36:815` linked to source COMPONENT `34:709` / COMPONENT_SET `34:716`.
- The primary ON_CLICK navigates to runtime menu `36:739`, DISSOLVE approximately
  0.15 s EASE_OUT; inherited hover/press uses same-set CHANGE_TO at approximately
  0.10 s. The runtime has 93 native nodes: 1 SECTION, 37 FRAME, 55 TEXT, 1 INSTANCE.
- Flow was skipped because interactive already authored the required edge. Motion
  was checked without writes because all four inspected transitions matched.
  One incorrectly ordered same-run instance was replaced using reparenting; final
  action order is primary `36:815`, secondary `36:730`, with 320×60 parent geometry.
- Independent before/after checks found unchanged production and state library,
  exactly one runtime container, two screen frames, one surviving instance and one
  navigation edge. Page serialization renumbered `globalVars.styles` aliases after
  cloning; expanding those aliases yielded zero protected-property differences.
  Raw extracted subtree hashes without their style table were a false alarm.
- An observer snapshot during exit reads equalled the final full-page fingerprint.
  Every traced call from the QA boundary onward was inspection-only: zero QA writes.
  The aggregate result was `FIGMA_PROTOTYPE_PLANNER: WARN`, retaining the intentionally
  undefined secondary action and terminal menu journey. No prototype playback was
  performed; native structure and reactions were inspected.
- Missing-semantics trial: requesting checkout in the café found no real checkout
  screens or behavior. The planner asked a material clarification, made 5 reads,
  and left the complete page fingerprint unchanged. No checkout was invented.
- The plain answer corrected scope to the existing hero/menu journey and routed to
  `continue` in the same conversation. Verification made 103 reads and zero writes,
  retained all IDs and the identical complete-page fingerprint, and emitted canonical
  QA and planner result markers. Completed work was reused without duplicate artifacts.

The first aggregate report omitted individual specialist status markers and its
plan included a negated planner-marker example. Instructions/tests now explicitly
require executed-phase markers and prohibit all planner status lines in plan-only
reports; the continuation run validated executed-phase reporting. Historical
importer/player limitations in the first report were not accepted as
verified runtime facts. Raw local traces and snapshots remain ignored under
`.figma-designer/prototype-planner/`; only reviewed, non-sensitive results ship here.

## Limitations

Planning and semantic completeness remain model-guided. The planner does not add
runtime-enforced per-phase tool permissions: specialist restrictions are instructions,
with read-back and fingerprint verification. The independent critique execution guard
remains stronger and unchanged. Structural evidence does not replace playing the
prototype or manual visual review. Undefined behavior and real Figma limits remain
visible rather than being presented as a complete application.
