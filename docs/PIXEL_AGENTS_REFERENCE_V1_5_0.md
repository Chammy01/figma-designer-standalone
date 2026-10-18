# Pixel Agents reference — V1.5.0

Repository: [pixel-agents-hq/pixel-agents](https://github.com/pixel-agents-hq/pixel-agents).
Reference commit: `b1bafd02896d90d83457266575a1e8e5011ce997`.
Code license at that pin: MIT, Copyright (c) 2026 Pablo De Lucca.

Reviewed at the exact pin:

- `server/src/agentState.ts`: normalized agent activity scaffolding and active-tool tracking.
- `server/src/hookEventHandler.ts`: waiting/idle/tool activity concepts; Claude hooks are not used here.
- `webview-ui/src/office/toolUtils.ts`: semantic tool categories for rendering.
- `webview-ui/src/office/engine/characters.ts`: activity-to-character-state separation.
- `core/src/messages.ts`: normalized presentation messages.
- `README.md` and `LICENSE`: architecture and code/art provenance boundaries.

Only concepts are referenced: separate activity and animation states, short status
copy, coalescing and a distinct waiting indicator. Figma Designer's implementation
is written independently for its existing OpenCode context polling and vanilla DOM
UI. No source, algorithm implementation, React/Vite frontend, server, CLI, hooks,
terminal manager, or character/furniture/pet assets are copied or substantially adapted.
No runtime dependency on Pixel Agents or its services is introduced.

The pinned README attributes bundled characters to JIK-A-4 / Metro City. A code MIT
license does not establish ownership of every artwork asset. No such artwork is
imported. The current bedroom/character/screen assets are prepared from the user's generated references; they are not Pixel Agents art. The superseded inline SVG experiment is removed. No additional third-party code notice
is required for a conceptual reference; existing notices remain intact.

PIXEL_AGENTS_CODE_COPIED: NO

PIXEL_AGENTS_ART_IMPORTED: NO

FIGMA_DESIGNER_AGENT_ART: ORIGINAL / USER-PROVIDED GENERATED REFERENCES

The revised UI uses user-provided generated bedroom/character/monitor references, not Pixel Agents artwork. Production crops are local PNGs; raw sheets stay source-only. The superseded small SVG experiment is removed.
