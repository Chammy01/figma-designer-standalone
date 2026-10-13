# Figma Designer v1.2.1 Beta 3

Beta 3 is a checkpoint for the current design and prototype workflows. It adds
stronger interaction checks, explicit smooth scrolling and tested browser motion
to the existing editable Figma design workflow. Keep using `/figma/design` to start.

## What's new

- Supported centered modals with existing content, open/close behavior and safe ownership.
- Interaction QA V2 checks controls, destinations, state families and prototype journeys without changing your design.
- A native motion capability audit separates what Figma declares from what was actually observed in playback.
- Explicit native smooth scrolling to an existing target in an already prepared scroll frame.
- Browser motion checks for supported states, navigation, centered modals and scrolling, including reduced motion.

## Design and prototype improvements

This checkpoint also includes the design workflows carried forward from earlier
main-branch work: read-only design critique and critique guard hardening, Design
Generation V2, adaptive questions for incomplete briefs, natural-language intent
routing, and the Prototype Planner. Detailed design requests proceed directly;
broader authorized prototype requests coordinate the existing specialist workflows.
No new slash command is needed.

Semantic Motion maps the intended feel of an existing interaction to a supported
transition. Motion stays a finishing layer: it does not invent screens, actions
or product rules. Centered overlays are supported; contextual positioning remains limited.

## Motion and browser parity

Ask explicitly for smooth scrolling when the native scroll frame is already prepared.
Ordinary scrolling is preserved. Unprepared frames are reported as a limitation.

Local browser exports now reproduce the shipped motion semantics with compact state
transitions, dissolve and directional navigation, centered modal fades, immediate
ordinary scrolling and bounded smooth scrolling. Reduced-motion preferences make
movement immediate or collapse state transitions. Some directional mappings remain
partial or lack a corresponding native playback reference; reports say which.
This is behavioral parity, not an identical Figma renderer or exact frame timing.

## QA and reliability

Browser tests verify visible intermediate and final behavior alongside navigation,
keyboard activation, history, routes and local-only resources. Live source freshness
remains separate from test acceptance; stale or unavailable source evidence is reported.
The conditional operand collector repair from Beta 2 is retained.

Clean source builds, package extraction, repeated setup, privacy checks and hosted
regressions validate this checkpoint. The approved executable and plugin bundle
are unchanged from Beta 2. System version remains 1.2.1; MCP version remains
1.2.0-standalone-hardening. Release validation and checksums are attached as Assets.

## Known limitations

- **V1.2.5 stateful variables/conditional prototypes remain HOLD.** The connected Figma plan rejects their authoring, so these workflows are not enabled.
- Autonomous contextual-overlay positioning remains limited.
- General Smart Animate/shared-element browser rendering is not implemented.
- Timelines, springs and continuous animation are not productized.
- Browser visual/pixel fidelity regression is not included; local fonts and complex visual properties can differ.
- AI-provider access is separate from the package. This checkpoint does not guarantee a particular provider's availability.

## Updating from Beta 2

Download **Figma-Designer-v1.2.1-beta.3-Windows.zip** from this release's Assets.
Extract it into a **new folder**, keeping Beta 2 as a rollback copy. Do not merge
the folders or copy plugin bundles between them.

Run setup in the new folder, import `vendor/figma-mcp/plugin/manifest.json` from
that folder, and start OpenCode there. Stop the previous session normally and keep
the new plugin running until it shows Connected. Run `/figma/doctor`, then
`/figma/version`. Preserve private configuration and browser output separately;
do not copy an old absolute executable path unchanged.

See [Updating](docs/UPDATING.md) and [Installation](docs/INSTALLATION.md).
Beta 1 and Beta 2 remain available and are not replaced by this release.
