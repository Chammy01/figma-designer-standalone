FIGMA OVERLAY SUPPORT — V1.2.6

MCP_GAP: NONE. The current generic reaction writer carries native OVERLAY/CLOSE.
FIGMA_CAPABILITY_LIMIT: destination overlay configuration is readonly in the
pinned Plugin API. Do not modify the runtime, invent a setter, write private Figma
properties/document JSON, or automate Figma UI to change these settings.
V1.2.5 remains HOLD: no SET_VARIABLE/CONDITIONAL authoring or variable phase.

## Inspect and classify before authoring

Inspect the requested trigger, actual supplied/existing content, complete reactions,
canonical Interactive App SECTION and destination FRAME ownership. Read native
overlayPositionType, overlayBackground and overlayBackgroundInteraction through
the existing read-only source collector (`scripts/figma-live-source.mjs` /
`npm run figma:browser-source -- read`); ordinary get_node bounds/styles are insufficient.
Collecting source does not require generating a browser export. Do not guess omitted
settings. Preserve every readonly destination setting and every unrelated reaction.

| Internal category | Support / prerequisites |
| --- | --- |
| CENTERED_MODAL | SUPPORTED: real content; runtime-owned FRAME; verified native CENTER behavior; existing default appearance/dismissal fits the requested modal. |
| PRECONFIGURED_OVERLAY | CONDITIONALLY_SUPPORTED: existing runtime FRAME's readonly settings already satisfy the requested temporary interaction; inspect and preserve them. |
| CONTEXTUAL_OVERLAY_REQUIRED | FIGMA_LIMITED unless a suitable preconfigured destination exists. No silent CENTER substitute for a contextual menu, dropdown, popover or tooltip. |

For new modal FRAMEs, native defaults are CENTER, background NONE, interaction NONE.
Default centered behavior is sufficient for an explicitly requested centered dialog;
do not imply it has dimming or outside-click dismissal. Do not create unsupported
contextual content/helpers while merely reporting the limitation.

If outside dismissal is required but destination is not CLOSE_ON_CLICK_OUTSIDE,
report FIGMA_LIMITED: OUTSIDE_CLICK_CONFIGURATION. If required background/dimming
does not already match, report FIGMA_LIMITED: OVERLAY_BACKGROUND_CONFIGURATION.
Do not add invisible catch-all rectangles, alter the base screen to fake dimming,
or change production. Keep explicit CLOSE separate from outside-click dismissal.

overlayRelativePosition may be authored only for a verified MANUAL destination,
with established coordinates relative to the initiating screen/trigger, compared in
matching coordinate systems and verified by readback/playback. Never derive it from
destination canvas placement. PRECONFIGURED_OVERLAY is not autonomous preparation.
Contextual menu/tooltip auto-positioning without that prerequisite is FIGMA_LIMITED:
CONTEXTUAL_DESTINATION_CONFIGURATION, zero placement writes and no rejection retry.
Hover tooltips additionally need real content and verified ON_HOVER playback.
Nested overlays and BACK/SWAP overlay replacement remain limited unless separately
proven and explicitly requested; do not add them by default.

## Supported modal assembly (interactive ownership)

Production is strictly read-only. Reuse the canonical `Figma Designer — Interactive App` SECTION;
native overlay FRAMEs live inside it. Use stable names
`Overlay / <Meaning>`. Reuse an equivalent destination after verifying content,
type, ownership and settings. Ambiguous semantic duplicates require inspection,
not deletion or another copy. Never invent modal text, menu options or business
results; ask one focused question if material required content is missing.

Wire the actual open control with NODE + OVERLAY to that FRAME, never NAVIGATE.
Wire a real required Close/Cancel control inside the overlay with {type: CLOSE}.
Exactly one equivalent OPEN and required CLOSE; no automatic BACK or extra reactions.
Read complete arrays first. If an equivalent edge already exists, reuse it; unrelated
actions/triggers/counts and destinations stay intact. Skip uncertain reconstruction.
If incompatible click behavior already exists, resolve semantics before replacing it.

Use the shared Semantic Motion registry's OVERLAY_DEFAULT for newly created OPEN
transitions. No duplicated duration constants, invented CLOSE transition or state
animation. A later requested motion phase operates only after reactions exist and
makes zero writes when the token already matches within its existing float tolerance.

After each bounded write, read back the full reaction array and affected subtree.
Verify native editable FRAME/content, exact destinations, triggers, CLOSE context,
settings, no duplicate frames/edges and protected production fingerprints. A timeout
is indeterminate: reread and reconcile; preserve valid work and retry only missing
work. Repeating "Make sure this modal works" must reuse the same IDs and make zero
redundant writes when content, OPEN, CLOSE and motion already match.

## Planner and read-only QA

Within INTERACTIVE, classify every requested overlay before the overlay assembly
subphase. Write only supported categories; reuse valid existing state/runtime work.
Motion follows wiring, QA is terminal and read-only. Do not force a variable phase
or flow rewrite. Optional contextual limitations do not invalidate a working modal.

QA inspects all relevant descendants and complete reaction arrays: missing/wrong
type/production destinations, runtime ownership, semantic duplicate modal FRAMEs or
OPEN edges, required CLOSE missing/duplicated/outside overlay context, orphan or
unreachable overlays, inappropriate CENTER substitution for contextual intent,
relative vectors against non-MANUAL destinations, required outside/background
mismatches, readonly settings, shared motion token and protected fingerprints.
Report defects; never repair or normalize during QA. Distinguish structural evidence
from actual native playback; do not infer either from names alone.

PASS: requested supported core behavior verified, no contradictory completion claim.
WARN: core works but meaningful optional limitations remain. BLOCKED: required
outcome depends on unavailable configuration. FAIL: forbidden mutation, broken
supported behavior or failed verification. Report FIGMA_LIMITED precisely; it is
not a claim that an unwired contextual control works. No new command or route.
