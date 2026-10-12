# Natural-language intent routing — V1.2.3.2

After a Figma task, users can describe changes in ordinary language. The existing
primary `figma-designer` agent applies the appropriate specialist workflow. All
fourteen direct commands remain available; no command, alias or MCP capability is added.

## Routing model

`rules/figma-intent-router.mjs` registers an OpenCode prompt hook before the existing
critique guard's prompt hook. It skips already expanded direct commands and other
agents. For an ordinary follow-up, it makes one tool-free classification request
through OpenCode's existing session-generation API, using the session's model,
conversation and complete provider-compatible tool definitions. This API returns
text without executing tool calls or mutating the session. The classification is
model-guided, not keyword matching. Stateless generation was tested and rejected
by the configured free tier; session generation preserves the existing provider path.
The returned route is validated against a closed set, then the selected canonical
command file is expanded with the literal original user request. No command API
invocation, new routing server, tool schema, protocol or Figma plugin capability.

Classification does not establish valid node IDs or satisfied prerequisites. The
main agent retains the full conversation, inspects live targets and applies the
complete selected command contract. Internal state is INTENT, TARGET, OWNERSHIP,
PREREQUISITES and AMBIGUITY, without a verbose public reasoning dump.

## Intents and ownership

| Outcome | Canonical command | Writable ownership |
| --- | --- | --- |
| Production revision | `/figma/revise` | Requested production subtree only |
| Design critique/advice | `/figma/critique` | None; persistent critique guard |
| Component states | `/figma/states` | Canonical component-state library only |
| Explicit journey | `/figma/flow` | Interactive runtime only |
| Working controls | `/figma/interactive` | Runtime, plus narrowly justified state-reaction updates under existing rules |
| Motion | `/figma/motion` | Eligible transition objects on existing reactions only |
| Correctness/QA | `/figma/qa` | None |
| Browser generation | `/figma/browser` | Browser-prototype output directory only; Figma read-only |
| Browser tests | `/figma/browser-test` | Existing runner artifacts; no Figma authoring or implicit generation |

Source inspection, timeout reconciliation, duplicate protection, component/source
verification, reaction semantics and truthful limitations come from those canonical
contracts. Missing destinations/reactions/browser artifacts are reported, not invented.

## Ambiguity, information and briefing

“Make the hero shorter” revises; “make the button pop more” normally means visual
emphasis. “Check the buttons” clarifies visual quality versus interaction correctness
when context does not decide. “Make it better” asks one focused question before writes.
Questions appear in ordinary chat and end that turn; a plain reply re-enters routing.
Blocking question forms would resolve inside the old turn instead of activating the
selected workflow's prompt/guard boundary, so the router explicitly forbids them.
Explanations such as “Why did you make the footer dark?” do not author or repair.
“What would you improve visually?” is guarded critique/advice, not automatic revision.

Pending design-briefing answers remain in the original conversation/workflow, with
answers and budget retained. A completed design's revision does not restart briefing.
A genuinely new vague screen can enter Design V2 and adaptive briefing. Current roots,
recent scope/screens, artifacts, terminology and limitations survive continuation and
compaction; stale or missing targets require live reinspection, never guessed IDs.

One appropriate workflow is selected. Multi-family requests with unclear ordering or
prerequisites get clarification. Missing hover setup routes to states first and reports
motion as later work. This is not the future Prototype Planner or a whole-app automatic
states/flow/interactive/motion campaign.

## Critique safety

For a critique route, canonical prompt expansion occurs before the original guard
sees the prompt. Its existing marker arms the same persistent per-session key before
any model tools execute. Approved direct read aliases, complete provider-visible
schemas, Code Mode prohibition, execution/permission checks and idle-only release
are preserved. The enforcement source is byte-equivalent to V1.2.2.1 after removing
the new import and pre-routing setup call; a contract test verifies that checksum.

Steering or queued prompts while critique is active cannot route into authoring or
unlock it. “Review and fix” first produces a read-only critique and presents findings;
bounded revision authorization is retained for a separate request after idle. No
recommendations execute in the guarded turn. Invalid classification/provider failure
fails closed through the existing guard and reports BLOCKED, not a guessed write route.

## Tests and acceptance

Contract tests and representative fixtures cover nine families, informational and
ambiguous requests, multi-family restraint, briefing continuation/new design, source
reinspection, literal user-copy preservation, direct-command parity, provider/parse
failure and guarded-turn lifetime. Unit mocks prove contract enforcement, not prediction
accuracy. The pinned OpenCode 2.0.24 [hook runner](https://github.com/anomalyco/opencode/blob/v2.0.24/packages/core/src/plugin/hooks.ts)
awaits callbacks in registration order; the [session-generation implementation](https://github.com/anomalyco/opencode/blob/v2.0.24/packages/core/src/session/generate.ts)
retains the normal tool catalog and returns text without executing tools or appending
session history. Both were inspected before live acceptance.

Local regressions passed: 114 npm tests (44 router tests plus existing design,
adaptive-briefing, critique/compatibility and browser contracts), 275 plugin tests,
67 hardening/variant/source tests, 23 isolated setup fixtures including a missing
router-module stop, and source/release/privacy checks. All three approved executable/
plugin artifact hashes matched; no runtime, source-freshness, timeout or release
metadata changed. Source and release manifests include the new module because the
guard imports it; setup checks this required file before startup.

### Model-guided no-write trials

Nineteen representative fixtures ran against the actual configured free model,
through session generation in the non-sensitive completed café conversation. The
pre-routing classifier and original guard hooks ran, but specialist execution was
not started; zero Figma reads/writes. All nine families, information, ambiguity,
new design, briefing continuation, “pop more”, review-and-fix and missing hover setup
selected the expected route. The multi-family request selected states first, without
an automatic motion workflow. These predictions are observations, not deterministic
proof for arbitrary wording.

Initial trials revealed two real issues: stateless generation was rejected by the
free provider, and a clear working-controls request was over-clarified because its
prerequisites were unverified. Session generation resolved the provider restriction;
policy now separates clear family selection from that workflow's prerequisite checks.
The initial over-clarification trace was retained rather than relabelled as success.

### Live acceptance — 2026-10-13

All requests were ordinary `/prompt` follow-ups in the original completed café
session, `ses_ecf632b76ffeneg240PuSdM8Ab`; no slash command was invoked. The authorized
`Untitled` file retained its three pages. Existing roots and four editorial masters
were snapshotted before work and compared after it.

| Follow-up | Observed result |
| --- | --- |
| Make the hero shorter | Revision of root `28:283`, hero `28:309`; 682→557px. Changed hero padding 96→64 and placeholder height 384→323 only. All IDs/text retained; unaffected section content/styles identical, with expected Auto Layout vertical reflow. Other production roots/masters unchanged. `FIGMA_REVISION: PASS`. |
| Check whether anything is structurally broken | QA, 41 inspection calls, zero writes. `FIGMA_INTERFACE_QA: WARN` truthfully reports missing interactive runtime; it does not certify a working prototype. Complete page fingerprint matched before/after. |
| Why did you make the footer dark? | Explanation, zero Figma calls/writes; page fingerprint unchanged. |
| Review this hero visually | Original guard acknowledged active before reads; 10 approved direct inspections, no Code Mode or writes. `QUALITY_GATE: PASS`, 0 HIGH / 1 MEDIUM / 0 LOW, `FIGMA_CRITIQUE: PASS`; fingerprint unchanged. Rendered screenshot understanding was unavailable and disclosed. Recommendations were not executed. |
| Add hover and pressed states to the primary button | After critique was fully idle, state authoring resumed with normal permissions. Only new library `34:703` at `(10500,0)`, 800×364 was added: 11 native nodes, one COMPONENT_SET `34:716`, COMPONENTs `34:709` Default, `34:712` Hover, `34:715` Pressed. All match the actual set ID and State properties. Default→Hover and Hover→Pressed use conservative native CHANGE_TO; production button `28:317` remains a FRAME with no reactions. `FIGMA_PRODUCTION_GUARD: PASS`. |

QA's page fingerprint before/after was
`3bf719355efcb1998828dfd08698621635579ce480b1995a56be77cf7c826008`;
the same value also matched the informational and first critique checks. State
authoring reconciled two reaction-append timeouts through readback before a successful
write; native reaction counts and set membership were rechecked. Production contrast
finding C01 was reported only and left unchanged throughout state authoring.

The acceptance checker initially reused critique's narrower list for QA and rejected
the existing `get_variable_defs` inspection. Its implementation uses variable getters
only; it was separately verified and the full page comparison passed. Critique's
nineteen-operation allowlist was not widened.

The first ambiguous request made zero writes but opened a blocking built-in question
form. That headless test was cancelled without authoring. Routed clarification now
explicitly ends with an ordinary-chat question so the plain answer enters a fresh
prompt/guard boundary. With the final module loaded, “Make it better” emitted one
ordinary-chat question and ended idle: zero forms, Figma reads or writes. Its plain
answer, “Review only the visual design of the production hero; recommendations only”,
selected guarded critique in the same session. Approved read aliases only, no Code
Mode, `FIGMA_CRITIQUE: PASS`, and identical complete page fingerprints before,
while awaiting the answer and after review. Native variant/set IDs and reaction
chains were rechecked afterwards; no duplicate reactions or production changes.

Raw model responses, traces, native component/reaction evidence and before/after
snapshots are retained locally under ignored `.figma-designer/intent-router/`.
No broad interaction or visual benchmark campaign was run. Model report wording and
format remain model-guided; this router does not postprocess them. The QA report had
a prefatory sentence before its canonical WARN marker. Importer-wide limitation
claims in the generated state report are not established by this routing acceptance.

## Limitations

Routing and clarification usefulness remain model-guided. The added tool-free
classification request costs latency/provider usage and may fail; failures stop
read-only. Ambiguous requests may still need an answer. The router selects one
workflow and preserves ownership; it neither invents product logic/destinations nor
replaces product research or Prototype Planner. Specialist commands remain available
for deterministic manual control. No approved runtime hashes or Figma capabilities change.
