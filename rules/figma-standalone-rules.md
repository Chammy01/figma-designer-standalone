# Figma Designer Standalone Rules

## Purpose

These rules define the project-wide quality, interaction, and safety contract for the standalone Figma Designer system.

## Architecture

- OpenCode is the orchestration/chat surface.
- The local Figma MCP executable and Figma Desktop development plugin provide Figma read/write tools.
- Native Orca is not required.
- Browser regression testing uses local Playwright.

## Canonical page-level ownership

For new standalone documents:

- Production screen/root frames: product-owned, normal page-level content.
- `Figma Designer — Component States`: system-owned page-level FRAME.
- `Figma Designer — Interactive App`: system-owned page-level SECTION containing the working Figma runtime screens and runtime-only overlays/helpers when needed.

Never nest production roots inside either system artifact.

`Figma Designer — Prototype Flows` is the legacy V1 runtime name. `/figma/interactive` may migrate one unambiguous legacy container to `Figma Designer — Interactive App` without rebuilding valid screens.

## Production isolation

State generation must not modify production.
Flow generation must not modify production or the component library.
Interactive-interface generation must not modify production.
Motion must not alter production and may change only eligible transition objects on existing reactions.
QA must make zero Figma writes.
Critique must make zero Figma writes, including production, components, reactions, and motion. Recommendations are report text only.
Browser generation must make zero Figma writes.

## Working-interface standard

A finished Figma runtime is more than a clickable path.

Every meaningful visible control in `Figma Designer — Interactive App` must be classified and reported as one of:

- `WORKING_ACTION`: executes a real supported action.
- `WORKING_STATE`: has truthful hover/press/focus/selected/toggle/etc. behavior.
- `FIGMA_LIMITED`: strongest truthful simulation is present, but Figma cannot fully represent the real app behavior.
- `INTENTIONALLY_INERT`: behavior/destination/options/data are genuinely undefined and are not invented.

If a matching native component family exists and truthful behavior is possible, leaving the control as a decorative non-instance is a defect.

Do not invent destinations, data, option lists, search results, validation content, modal content, authentication states, or business logic merely to make more things clickable.

## Native interaction model

Use native COMPONENT_SET variants when compatible states exist.
Use variant property `State` unless the source design provides a stronger semantic property.

For standard buttons, conservative defaults are:

- Default: ON_HOVER -> Hover via CHANGE_TO
- Hover: ON_PRESS -> Pressed via CHANGE_TO
- Pressed: no automatic reverse reaction by default
- Disabled: no reactions

For text/navigation links:

- Default ON_HOVER -> Hover is allowed.
- Add navigation only when a real destination exists.
- Focus/Active behavior should be created only when the component family and intended runtime semantics support it.

For inputs/selects/toggles/tabs:

- implement truthful visual state behavior when the intended state transition is clear
- use overlays/variables only when supported by the current tool/runtime and backed by real source semantics
- never pretend an input accepts unrestricted text if the Figma runtime implementation does not actually do so

## Instance validation

`instantiate_by_name` can resolve the wrong component when many variants share a child name such as `State=Default`.

After every name-based instantiation:

1. resolve the instance's actual source component ID
2. resolve that component's `componentSetId`
3. compare it with the intended family
4. continue only when it matches

Do not trust instance/component names alone.

Do not use `clone_node` on a COMPONENT as an instance workflow: the tested API may return another COMPONENT. Use the verified instance workflow.

Runtime componentization must preserve accepted production appearance: fills, strokes, font size/weight, padding, radius, label placement, Auto Layout order, and state appearance as well as outer geometry. If a legal per-instance override is unavailable, report the fidelity limitation; do not detach the instance or claim exact fidelity.

## Motion tokens

Component state:
- SMART_ANIMATE
- 0.10 seconds
- EASE_OUT

Ordinary screen navigation:
- DISSOLVE
- 0.15 seconds
- EASE_OUT

Directional screen motion:
- explicit-only
- normally 0.20 seconds EASE_OUT
- direction required

In the tested plugin build, SCROLL_TO reactions require `transition: null`. Preserve this; never normalize SCROLL_TO to the screen-navigation token or silently change trigger semantics.

## Authoring constraints

- Prefer editable native layers and Auto Layout.
- Use explicit text widths when wrapping matters.
- Use stacked text nodes instead of relying on `<br>` for structure.
- Use real padded containers for buttons.
- Use padding/itemSpacing rather than unsupported margin behavior.
- Verify important fills/strokes after generation.
- If a requested font weight is unavailable, use a verified loaded weight and report it.
- Inside Auto Layout, use child order rather than manual XY placement.
- `move_to_anchor` is not a reliable Auto Layout reorder operation. Use a real reorder/reparent/rebuild method.
- Compare geometry in consistent coordinate spaces; parent-relative child bounds must not be compared directly with page-absolute root bounds.

## Partial-write recovery

If a write or conversion times out, the outcome is indeterminate rather than failed.

1. inspect the live document
2. wait for node counts/state to stabilize when the job may still be in flight
3. determine exactly what succeeded
4. preserve valid completed work
5. continue only the missing step
6. do not duplicate completed screens, states, sets, instances, overlays, or reactions
7. remove only same-run broken leftovers inside the command's writable ownership zone

## Browser interface

Output only to `.figma-designer/browser-prototype/`.
Required files:

- `index.html`
- `styles.css`
- `app.js`
- `figma-browser.json`

Use stable `data-figma-*` hooks for automated testing.
No remote scripts, CDNs, remote fonts, analytics, fetch/XHR dependencies, or dynamically loaded code.
Use hash routing for static screen navigation.
Support `prefers-reduced-motion` in the browser implementation.
Map native Figma navigation to semantic anchors when practical so keyboard Enter works without synthetic click emulation.

## Visual quality

Derive styling from the user's brief and the live Figma source. Avoid generic AI-looking patterns, unnecessary gradients, excessive pills, random decoration, fake dashboards, and gratuitous glassmorphism unless explicitly requested.
