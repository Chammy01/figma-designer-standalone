# V1.2.5 stateful prototype capability audit — HOLD

Audited 2026-10-13 against `cb821be45bc991d562911830ac9aee4746955c8a`,
the approved local executable, pinned plugin source/types, and the connected
non-sensitive **Untitled** Figma Desktop file. Phase 0 did not pass. Stateful
workflow enablement, router/planner/QA changes, and a stateful feature release are deferred.
Creating a variable is not proof that prototype actions execute.
The V1.2.5a repair section below records the subsequently tested collector-source
fix. It does not enable stateful workflows or claim playback acceptance.

## Capability decision

**MCP_GAP: NONE for carrying the audited stateful reaction objects.** Both valid
type-defined requests reached Figma's native reaction setter through public MCP `tools/call`.
The generic reaction schema carried the nested objects without a binary rebuild.
The public description lists only NODE/BACK/CLOSE/URL and lags the plugin validator;
this wording mismatch does not justify changing runtime hashes.

**LIVE_CAPABILITY: PLAN_BLOCKED.** Figma returned these exact errors:

```text
You cannot use Set Variable actions in Reactions with your current plan.
You cannot use Conditional actions in Reactions with your current plan.
```

The editor shows the Free plan. No retries, upgrades, subscriptions, or plan-limit
workarounds were attempted. Neither failed request changed its empty reaction array.
Actual state/conditional playback cannot be tested with these unauthored reactions.

**PHASE-0 SOURCE_FRESHNESS_GAP: conditional VariableData alias wrapper.** The pinned
`browser-source.ts` reference walker treats every `type: VARIABLE_ALIAS` object as
an alias with a top-level `id`. A conditional operand instead has its ID in
`value.id`; the outer wrapper is valid but has no `id`. The collector adds an
undefined reference and throws `Unresolved variable: undefined`. Exact-shape
fixtures reproduce this; collection remains **UNVERIFIED**, safely failing closed.
At Phase 0 no projection schema/version or pinned collector was changed. The
subsequent V1.2.5a repair distinguishes the shapes and proves full nested closure
in deterministic fixtures. The user approved its sole plugin-code hash rotation
for Beta 2; that source-freshness approval does not enable stateful prototypes.

## Phase 0 evidence

| Capability | Result |
| --- | --- |
| Create local collection | LIVE PASS; one default mode |
| Create BOOLEAN and read definitions | LIVE PASS; initial false |
| Set default value and read definitions | LIVE PASS; false → true → false |
| Exact SET_VARIABLE shape | Defined in installed pinned Plugin API types; delivered through public MCP; native plan rejection |
| Exact CONDITIONAL shape | Defined in types and their documented example; delivered through public MCP; native plan rejection |
| SET_VARIABLE lossless native readback | BLOCKED; no authored action to read back |
| Nested CONDITIONAL native readback | BLOCKED; no authored action to read back |
| Figma prototype playback | BLOCKED for both actions; not inferred from JSON or mocks |
| Source variable/collection capture | LIVE PASS via Boolean visibility binding; unit capture passes for SET_VARIABLE |
| Exact conditional source closure | UNVERIFIED; wrapper bug above |
| Node-property binding | EXPOSED; `bind_variable_to_node`, Boolean `visible` verified live on disposable indicator |
| Browser state parity | NOT IMPLEMENTED; no stateful runtime claimed |

Audited files: `tools_write_variables.go`, `write-variables.ts`,
`tools_write_prototype.go`, `write-prototype.ts`, installed
`@figma/plugin-typings/plugin-api.d.ts`, `read-document.ts`, `read-styles.ts`,
`tools_read_document.go`, `tools_read_styles.go`, `write-styles.ts`, `schema.go`,
`browser-source.ts`, root `SOURCE_FRESHNESS.md`, source tests, browser command and
browser runner contracts. `get_reactions` returns the native complete reaction
array; this source behavior is not yet live lossless stateful proof.

## Exact audited action shapes

These shapes are type-defined and transport-tested, **not playback-proven**.
The checked-in `scripts/fixtures/stateful-actions.json` records both complete
requests and native errors. Its IDs identify deleted disposable probes, never
reusable production targets.

```json
{
  "type": "SET_VARIABLE",
  "variableId": "VariableID:42:833",
  "variableValue": { "type": "BOOLEAN", "resolvedType": "BOOLEAN", "value": true }
}
```

```json
{
  "type": "CONDITIONAL",
  "conditionalBlocks": [
    {
      "condition": {
        "type": "EXPRESSION",
        "resolvedType": "BOOLEAN",
        "value": {
          "expressionFunction": "EQUALS",
          "expressionArguments": [
            { "type": "VARIABLE_ALIAS", "resolvedType": "BOOLEAN", "value": { "type": "VARIABLE_ALIAS", "id": "VariableID:42:833" } },
            { "type": "BOOLEAN", "resolvedType": "BOOLEAN", "value": true }
          ]
        }
      },
      "actions": [{ "type": "NODE", "navigation": "NAVIGATE", "destinationId": "42:850", "transition": { "type": "DISSOLVE", "duration": 0.15, "easing": { "type": "EASE_OUT" } }, "preserveScrollPosition": false }]
    },
    {
      "actions": [{ "type": "NODE", "navigation": "NAVIGATE", "destinationId": "42:854", "transition": { "type": "DISSOLVE", "duration": 0.15, "easing": { "type": "EASE_OUT" } }, "preserveScrollPosition": false }]
    }
  ]
}
```

ELSE is a block with omitted `condition`, not an invented false operand.
`variableValue` is a typed VariableData object, not a primitive `value` field on
the action. The variable-definition tools take string values at their public
schema boundary; the BOOLEAN probe used `"false"` and `"true"`. Their plugin
coercion is permissive, so future workflow validation must reject invalid inputs
before calling them. BOOLEAN/STRING/FLOAT/COLOR exist in source; only BOOLEAN was
tested live. No expression engine or new write primitive was introduced.

## Deferred product contract

After capability/playback and freshness proof, the intended state vocabulary is
BOOLEAN_STATE, CHOICE_STATE, NUMERIC_STATE, CONDITIONAL_BRANCH, and MODE_STATE only
for genuinely intended native-mode behavior. This is prototype state, not theming.
Use exact-name ownership of the local collection **Figma Designer — Prototype
State**, stable product-semantic names, type/value verification, ambiguity stops,
and collection/variable/action reuse. Normal state uses the existing single default
mode; never call `add_variable_mode` or retry its plan limit for checkbox state.

Production stays read-only. Variables belong to the owned collection; runtime
and component states stay within their existing contracts. No production binding,
new destination, ELSE rule, hidden option, business logic, authentication/validation
system or design-token campaign is authorized by variable availability.
Preserve full triggers, unrelated actions, transitions, nested order and destinations;
read complete arrays before/after writes. Timeout is indeterminate: reconcile before
retry, never duplicate a collection, variable, action, branch or screen.

Planned integration remains deferred: narrow defined stateful work belongs to
working_interaction; broad defined flows belong to Prototype Planner. Its dependency
order would be inventory → necessary states → variables → runtime reuse → stateful
wiring → requested eligible semantic motion → read-only QA → fingerprints/readback.
V1.2.4 remains authoritative for nested NODE transition meaning; SET_VARIABLE gets
no implicit motion. QA would inspect variable existence/types/values/ownership,
operands, destinations, duplicate/stale references, nested actions and freshness,
without repairing. No classifier, command, planner or QA write boundary was expanded.

Lifetime, ordered SET_VARIABLE→NAVIGATE execution, behavior across navigation/BACK,
restart/reset defaults and visual state persistence remain **unverified**. Do not
claim permanent persistence or even verified session persistence until playback.
Visibility binding alone proves authoring/capture, not live session changes.

## Acceptance results

| Case | Structural result | Playback / orchestration result |
| --- | --- | --- |
| A Boolean memory | Collection, Boolean default/update, visibility binding pass; SET_VARIABLE rejected | BLOCKED; no session persistence claim |
| B conditional branch | Exact condition transported; native rejection; zero reaction delta | FALSE and TRUE paths both BLOCKED |
| C idempotence | Probe reuse/no retry; no duplicate artifacts; full cleanup verified | Repeated working stateful request NOT RUN |
| D missing business rule | No rule/destination guessed | New stateful clarification acceptance NOT RUN; existing contracts retained |
| E planner | No state dependency enablement | NOT RUN pending Phase 0 proof |

Plan-only A–F state routing/model acceptance was not run: product enablement stopped
at Phase 0. Expected future behavior: remember toggle → existing working interaction;
checked Continue without defined ELSE → inspect/clarify without inventing it; broad
choice flow → planner; dark mode → separate theming scope; “add logic” → clarification;
state explanation → informational/no writes. These are expectations, not results.

## Probe accounting and integrity

Collection `VariableCollectionId:42:832`, default mode `42:0`, variable
`VariableID:42:833` (`acceptance/termsAccepted`) were same-run disposable artifacts.
Runtime frames: A `42:834`, B `42:846`, Success `42:850`, Warning `42:854`, all
inside existing runtime `36:719`. Source `42:836` attempted SET_VARIABLE; source
`42:842` attempted CONDITIONAL. Both remain empty in recorded readback. Success
and Warning were explicitly supplied acceptance fixture destinations, not invented
product requirements. No state masters or production screens were changed.

9 successful authoring calls: collection create, variable create, two default-value
updates, four small native frame creations, one visibility binding. 2 reaction
attempts rejected by the plan, 0 stateful reactions authored. 2 cleanup calls removed
the four proven same-run frames and sole same-run collection/variable. No timeouts,
blind retries, extra modes or duplicate creations. GUI use only inspected the editor;
no fake playback result. Public MCP probe processes terminated; existing bridge retained.

Seven scoped production/state/existing-runtime roots and five complete reaction
reads match baseline exactly. Variable inventory returned to empty. Full current-page
before/after fingerprint matches:
`42e8efb7cb579d7320c9b148c259459a3fa4c28285c4773dffe500d09ab0c23c`.
Private raw probes/snapshots are ignored under `.figma-designer/stateful/` and are
not published or included in source/release artifacts.

## Phase-0 tests and delivery

Four source regression tests retain the exact audited shapes: plugin native-error
propagation without commit/fallback; SET_VARIABLE action/value/collection capture;
default/action-value fingerprint changes; conditional wrapper UNVERIFIED and missing
destination fail-closed behavior. Mocks test capture/error discipline only, not native
execution. No runtime/source projection version changed.

| Regression | Result |
| --- | --- |
| npm contracts: router/planner/briefing/design/critique/guard/motion/browser | 171 PASS |
| Pinned plugin tests | 275 PASS |
| Hardening/variants/source, including four audit regressions | 71 PASS |
| Browser integration | 6 PASS |
| Installed OpenCode 2.0.24 compatibility | 1 PASS, not skipped |
| Setup fixtures | 26 PASS |
| Release checks: source files/syntax/config/hash stop/privacy | PASS |
| git diff whitespace | PASS |

All approved hashes match `docs/APPROVED_RUNTIME.json`: executable
`bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f`,
plugin code `24bb648c96cc7288938e87aedc07f44de48d9ea25fe9f19f3256633c31dad849`,
plugin UI `661fb49dd3ca38ed4648e70858822f59f565093718d02143c6b1b85628f054ee`.
The critique guard, router, planner, semantic motion, agent, commands, vendor source,
runtime/config and hash metadata are unchanged. Go test/vet and a clean archive
build were not repeated for this audit-only change; no Go/runtime source changed
and no new committed source ref exists. No model-guided stateful acceptance passed.

No new command, MCP server, runtime primitive, plugin edit, browser state runtime or
approved hash change. README and beginner command list unchanged. No V1.2.5 commit
or push: the task explicitly requires successful live capability/playback first.
Hosted CI therefore remains the
[successful baseline run](https://github.com/Chammy01/figma-designer-standalone/actions/runs/38298403745),
confirmed completed/success for the audited HEAD, not validation of this uncommitted audit.

## V1.2.5a — approved conditional freshness repair

The retained exact Phase-0 fixture reproduced `Unresolved variable: undefined`
before editing. Pinned types distinguish `VariableAlias { type, id: string }` from
`VariableData { type?, resolvedType?, value? }`: the latter wraps a concrete alias
in `value`. Only `references()` in `browser-source.ts` changed. An own `id` means
a concrete reference and requires a nonblank string. A wrapper requires a nested
alias with its own `id` and recurses. Missing/null/non-string/blank IDs and malformed
wrappers fail closed. IDs remain opaque strings per pinned types, without a guessed
numeric-only regex. Genuine unresolved IDs still fail at the native read API.

SET_VARIABLE variable discovery, SET_VARIABLE_MODE collection discovery, bindings,
alias-to-alias mode values, nested actions and destinations remain captured.
`SOURCE_PROJECTION_VERSION: UNCHANGED` (`figma-browser-source-v1`): the repair
restores already documented conditional closure, without new fields or normalization.

Deterministic tests cover plain aliases, exact wrappers, literal operands, nested
conditionals/actions, mode-only collections, transitive aliases, unused-variable
exclusion, referenced-value/operand fingerprint sensitivity, malformed aliases,
unresolved IDs, missing destinations and read-only collection. The exact conditional
fixture is AVAILABLE with stable captures in both source and candidate dispatcher.
Mocks prove capture/error discipline, never native conditional playback.

| V1.2.5a regression | Result |
| --- | --- |
| npm command/router/planner/briefing/design/critique/motion contracts | 171 PASS |
| Pinned plugin tests | 275 PASS |
| Hardening/variants/source (45 source tests) | 86 PASS |
| Same suite using isolated candidate plugin dispatcher | 86 PASS |
| Browser fixtures | 6 PASS |
| Setup fixtures | 26 PASS |
| Source/release/syntax/config/hash-stop/privacy checks, deployed runtime | PASS |

The unchanged approved bundle was deliberately tested with the exact conditional
fixture and reproduced the original failure. That expected reproduction is not
a passing deployed repair. No writer, Go/MCP executable, UI, reaction system,
router, planner, QA, semantic motion, browser runtime or new command was changed.
Stateful enablement and browser parity remain deferred; no plan bypass was attempted.

Live regression used the existing supported prototype and approved bundle:
**24 reads, zero Figma writes**. Two independent collections each took two captures;
source fingerprints matched. Live status AVAILABLE, runtime `36:719`, 101 nodes,
source hash `3104da00c58fac6c4e556fc3c9dbacf5497411305383da48390d619c48b65a53`.
The full-page before/after hash remained
`42e8efb7cb579d7320c9b148c259459a3fa4c28285c4773dffe500d09ab0c23c`;
five scoped complete reaction arrays matched. Browser status remains UNVERIFIED
because no browser export/manifest/report exists. Stable live source evidence does
not fabricate a CURRENT browser export. No live stateful authoring was retried.

**Approved delivery:** the collector is part of the bundled plugin. Two clean
builds of the fix produce byte-identical code.js with SHA-256
`273e20f56b80e9a7d995962948b1bb93e5cc1dfa19471ecd834ca7308d7da941`.
The baseline was rebuilt cleanly and reproduced the previous approved plugin hash
`24bb648c96cc7288938e87aedc07f44de48d9ea25fe9f19f3256633c31dad849`;
executable and UI hashes remain unchanged. The bundle diff contains only the reviewed
collector branch. The user expressly approved the plugin-code hash change;
`APPROVED_RUNTIME.json` preserves its previous digest and the separate MCP lineage.
Upstream stays pinned; the local collector patch is recorded truthfully. Beta 2 is
a new package identity, with system/MCP/projection versions unchanged. CI and source
bootstrap retain exact-hash enforcement. No check was weakened. V1.2.5 remains HOLD.
See [Beta 2 validation](CONDITIONAL_FRESHNESS_BETA_2.md) for activation and release checks.

## Limitations and resumption

Resume with a connected non-sensitive Figma context whose plan permits both actions,
then prove structural readback and actual FALSE/TRUE playback before enabling product
behavior. The source repair has independent approved Beta 2 activation and validation;
it does not establish native stateful playback support.
No plan upgrade is performed here. Browser parity, arbitrary design-token binding,
themes, external persistence, localStorage, keyframes and richer overlay behavior
remain outside this milestone. Semantic interpretation and usefulness remain
model-guided; supplied product semantics are still required.

FIGMA_STATEFUL_VARIABLES: HOLD
