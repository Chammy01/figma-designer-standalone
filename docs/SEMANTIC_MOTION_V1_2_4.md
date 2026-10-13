# Semantic motion — V1.2.4

V1.3 adds explicit SCROLL_SMOOTH on verified prepared native contexts. Ordinary
SCROLL_NATIVE and all other V1.2.4 defaults remain unchanged. The audit/results below
record the original milestone; see [V1.3 behavior](NATIVE_SCROLL_MOTION_V1_3.md).

Motion describes a relationship before selecting a transition. Users keep
`/figma/motion` or ordinary follow-ups such as "make this state change snappy",
"keep navigation subtle" and "use less motion". No command or alias was added.

The authoritative [registry and pure helpers](../rules/figma-motion-semantics.mjs)
centralize token implementations and unchanged float tolerances. Shared
[interpretation rules](../rules/figma-motion-semantics.md) govern intent/evidence,
authorization and limitations. Motion/planner prompt expansion attaches the same
generated policy; manual commands read the shared definitions. States, flow,
interactive, agent and QA reference the registry rather than repeating numeric
defaults. Existing values and behavior are preserved.

Changed files: agent instructions; states/flow/interactive/motion/QA contracts;
standalone/router/planner rules; new semantic module/rules; router and motion tests/
fixtures; setup plus its fixtures; package test enumeration; command documentation,
this report and both distribution allowlists. README and runtime/release metadata
were unchanged (22 files total).

## Vocabulary and support

| Intent | Evidence / supported representation | Token / result |
| --- | --- | --- |
| STATE | Existing compatible same-set NODE + CHANGE_TO | STATE_FAST; supported |
| NAVIGATION | Existing runtime NODE + NAVIGATE | NAV_DEFAULT; supported |
| SPATIAL_NAVIGATION | Existing NAVIGATE with justified journey direction/order | NAV_SPATIAL; otherwise NAV_DEFAULT and report ambiguity |
| OVERLAY | Existing NODE + OVERLAY with real runtime destination | OVERLAY_DEFAULT; position/behavior unchanged |
| SCROLL | Existing SCROLL_TO in its real scroll context | SCROLL_NATIVE; semantic recognition, preserve, no transition write |
| FEEDBACK | Existing same-set CHANGE_TO acknowledges action | STATE_FAST; conditionally supported, otherwise prerequisite |
| ENTER | Existing NAVIGATE/OVERLAY actually represents requested entrance | Corresponding token; arbitrary element entrance is LIMITED |
| EXIT | Existing NAVIGATE/OVERLAY actually represents requested exit | Corresponding token; arbitrary element exit is LIMITED |
| SHARED_ELEMENT | Already verified intended matching-layer/SMART_ANIMATE continuity | Preserve only; unverified choreography is LIMITED |

STATE_FAST uses compact smart animation, NAV_DEFAULT restrained dissolve,
NAV_SPATIAL a justified directional transition, and OVERLAY_DEFAULT quiet dissolve.
Exact durations, easing and float ranges are in the registry; `SCROLL_NATIVE` is
a preserve policy, not another transition preset. Support classifications are
SUPPORTED, SEMANTIC_ONLY/PRESERVE and CONDITIONALLY_SUPPORTED; independent element
animation, keyframes/timelines, springs/bounce, parallax, looping, scroll-driven
animation and arbitrary shared-element choreography remain LIMITED.

## Interpretation and overrides

"Quick/responsive state changes" means STATE/STATE_FAST, not screen navigation.
"Subtle screen change" means NAVIGATION/NAV_DEFAULT. "Quiet modal" means OVERLAY.
Forward/backward requires journey evidence: canvas positions establish no direction.
Stated horizontal left-to-right progression can justify LEFT for next and RIGHT for
previous; missing axis/meaning gets conservative fallback or one material question.
"Everything slide" never blindly changes every reaction. "More animated" asks one
concise intent question before writes. "Less motion" preserves behavior while using
conservative semantic defaults. "Scroll smoothly" is recognized without fabricating
scroll animation. Limited entrance/exit/shared-element intent is reported explicitly.

Supported explicit transition details are honored only when compatible with the
real action and verified representation. A justified directional push or smart
animate between compatible variants can override defaults; SMART_ANIMATE on a URL
action cannot. Never change the action to accommodate animation or automatically
enable matchLayers/rename/restructure layers. Preserve verified intentional continuity.

## Safety, audit and idempotence

The motion write surface is unchanged: only transition objects on existing eligible
NODE actions inside the canonical state library/runtime. Production, node structure,
reactions, triggers, action counts/types, destinations, URLs, scroll/reset flags,
overlay settings and every other semantic property remain immutable.
Read complete arrays immediately before each exact-node replace, preserve losslessly,
re-read and compare every non-transition property. Uncertain reconstruction means
SKIP THE WRITE. Timeout means indeterminate: inspect, stabilize and reconcile before
retrying confirmed missing work. No new state/reaction/screen/overlay or repair path.

`resolveMotion` proposes only verified-compatible transitions. `planMotion` is a pure
audit/proposal function, requires explicit change authorization plus owned scope,
preserves complete arrays, and changes no supplied object. `reactionSemantics`
compares immutable fields; `transitionMatches` uses registry ranges and float32
equivalence. Helpers do not execute tools or verify live evidence themselves. They
supplement the canonical read/write/read-back contract rather than enforce it in MCP.

"Review transitions", "How is motion used?" and consistency questions audit only:
reaction, intent, current implementation, expected token, MATCH/MISMATCH/LIMITED/UNKNOWN
and evidence. Findings never imply change authorization. Repeated normalization or
already-equivalent float values yield zero writes and MOTION_ALREADY_NORMALIZED.
FIGMA_MOTION_GUARD is a safety result; it can PASS while a requested capability is
truthfully MOTION_LIMITED. Semantic recognition is not successful animation execution.

Defaults are reduced-motion-conscious authoring: short durations, restrained
navigation, compact state feedback, no bounce/spring/scale/looping or gratuitous
directional movement. This workflow does not detect or switch on OS reduced-motion
preferences at runtime.

## Integration and validation

The existing intent router uses the shared semantic routing policy; there is no
second router. Single motion changes/audits stay MOTION, hover-state creation stays
STATES, and broad interactive outcomes stay PROTOTYPE_PLANNER. Planner passes semantic
intent plus actual reaction/journey evidence after prerequisites, skips matching
tokens, and keeps QA last/read-only. Shared modules load inside fail-closed routing;
missing semantic files cannot prevent installation of the unchanged critique guard.
Source/release allowlists and setup validate the required shared files.

Deterministic fixtures A–H cover wrong state/navigation/overlay transitions, justified
spatial direction, native scroll preservation, limited entrance, consistency audit/
normalization and float32 no-op. Tests additionally cover feedback, exit, verified
shared continuity, overrides, immutable properties, no authoring during audit,
idempotence, source ownership, router/planner parity and unchanged guard/command count.
Local regressions passed: 171 npm contracts (including 24 semantic-motion tests),
275 plugin tests, 67 hardening/variants/live-source tests, 6 browser integration tests,
1 installed OpenCode timeout-contract test, 26 setup fixtures, source/release syntax,
approved-runtime hash and privacy checks. Hosted CI validates the committed clean
source archive and release setup as well as Node, plugin and Go checks.

### Plan-only model acceptance

All ten requested phrases were exercised with supplied inspected target context and
the actual configured provider, through text generation without tool execution.
Subtle and less motion selected NAVIGATION/NAV_DEFAULT; snappy selected STATE/STATE_FAST;
forward/backward used justified SPATIAL_NAVIGATION/NAV_SPATIAL; modal selected
OVERLAY/OVERLAY_DEFAULT; scroll selected SCROLL/SCROLL_NATIVE with no transition write.
Everything slide required clarification/limited scope, more animated clarification,
and unverified shared-element continuity SHARED_ELEMENT/LIMITED. Every result declared
zero writes. These previews test language interpretation, not Figma execution.
Initial previews used mixed target context and returned prose or a file-read preamble;
the acceptance harness was corrected to supply a specific inspected target and mark
classification as tool-free. Raw results were not rewritten into passing answers.

### Live acceptance — Untitled, existing isolated state/runtime artifacts

Natural-language requests ran through the real OpenCode hook and configured provider.
All production, node/style geometry, source/destination IDs, trigger fields, action
counts/types and non-transition fields were independently compared. Before/after
captures include full current-page JSON plus complete reactions on nine scoped nodes.

| Case | Actual result | Figma reads / writes |
| --- | --- | --- |
| A — quick/responsive state | Existing Hover `34:712` -> Pressed `34:715` in set `34:716`; STATE then STATE_FAST; DISSOLVE/noncanonical duration -> canonical SMART_ANIMATE. Exact complete-array non-transition comparison passed. | 76 / 1 |
| B — subtle screen change | Existing primary `36:815` -> runtime menu `36:739`; NAVIGATION then NAV_DEFAULT; duration normalized, complete reaction semantics unchanged. | 76 / 1 |
| C — repeat B exactly | MOTION_ALREADY_NORMALIZED; float32 values retained; full reactions identical. | 76 / 0 |
| D — independent entrance | Runtime placeholder `36:733`; ENTER recognized, MOTION_LIMITED: ENTER, no eligible representation or fabricated architecture. | 85 / 0 |
| E — planner with subtle motion | PROTOTYPE_PLANNER; reused states/runtime mapping; passed NAVIGATION / restrained default, verified NAV_DEFAULT; no motion/flow rewrite; QA final/read-only. | 207 / 0 |

All A–D safety reports emitted FIGMA_MOTION_GUARD: PASS. E emitted the same motion
safety result and FIGMA_INTERFACE_QA / FIGMA_PROTOTYPE_PLANNER: WARN for the deliberately
undefined secondary "Visit us" action. BROKEN was zero; warnings were retained rather
than represented as fully implemented product behavior. No prototype was played.

Read-only audit first reported a real noncanonical state mismatch without fixing it
(53 Figma reads, zero Figma writes). That first audit created ignored local helper
scripts; shared instructions were tightened to prohibit filesystem authoring during
audit/plan-only. Final audit made 77 Figma reads, zero Figma writes, no write/edit tool
calls and used read-only Node/stdout evaluation. All complete reaction arrays and
page data remained identical.

### Transport/projection findings and controlled fixture work

Live reads exposed deprecated `action` alongside plural `actions[]`. The helpers
validate that the singular mirror equals the first plural action, retain every
plural action and compare permitted transition changes in both representations.
Contradictory mirrors are skipped, not collapsed. This required no MCP change.

A preliminary fixture probe changed the Default master transition. Figma recomputed
the instance's effective inherited/local reaction view and exposed an equivalent
hover duplicate. The master transition was restored, but effective instance count
was not initially identical. This probe is **not** a passing motion normalization
case. LIVE A instead used Hover -> Pressed, with no directly dependent instance;
its complete dependent arrays remained unchanged.

The first broader integration request selected working_interaction rather than the
required planner route. Its explicitly authorized existing INTERACTIVE contract
reconciled the duplicate with two runtime-only reaction writes, preserving all
distinct inherited hover/navigation behavior, IDs and production. Motion and QA made
zero writes. Shared routing instructions now preserve an explicitly requested
multi-capability sequence; the final E rerun selected PROTOTYPE_PLANNER and reused
the completed repair with zero writes. No results were relabelled as a planner run.

Count accounting: **2 successful motion writes**, **4 fixture transition writes**
(including probe restoration), and **2 existing INTERACTIVE reconciliation writes**.
No Figma nodes, states, destinations, screens or reactions were created. The
reconciliation removed redundant equivalent copies under INTERACTIVE, never motion.
At closure, the complete page snapshot and all nine complete reaction reads exactly
matched the original pre-fixture baseline, including the original two-reaction
instance view. The shared page structural fingerprint throughout was
`42e8efb7cb579d7320c9b148c259459a3fa4c28285c4773dffe500d09ab0c23c`.

MCP_GAP: current reads do not provide reliable separate inherited/local reaction
provenance for proving every master-to-instance projection before a source change.
Existing tools identify source components/dependents and compare effective arrays,
but cannot certify that aggregation will not expose/coalesce duplicate rows.
The motion rule and pure proposal helper skip known uncertain source writes;
already-matching tokens remain safe no-ops. A future capability audit may investigate
reaction provenance. No dedicated primitive or runtime change was introduced.

Local raw traces, snapshots and operator setup helpers remain ignored under
`.figma-designer/semantic-motion/`; reviewed non-sensitive findings are recorded here.

## Limitations

Interpretation remains model-guided; evidence supplied to pure helpers must come from
actual inspection. Scope enforcement uses existing instructions plus complete read-back,
not a new motion execution guard. Provider prose/marker formatting is not perfectly
deterministic; raw QA warnings were retained. No arbitrary element timeline/keyframe
authoring, runtime reduced-motion switching, scroll-driven animation, automatic physics or shared-element
restructuring. Only existing supported reactions are writable. No MCP/plugin/Go
runtime, timeout policy, source freshness or approved runtime hash changes. A future
Motion Capability Audit may establish narrower additional support; V1.2.8 is not
implemented here. Structural reaction inspection does not replace prototype playback.
