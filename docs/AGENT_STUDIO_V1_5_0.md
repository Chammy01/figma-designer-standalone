# Agent Studio — V1.5.0 source

## Purpose and layout

This source milestone supersedes the compact presence-card experiment. A narrow navigation rail, warm connection strip, central bedroom stage, side conversation and bottom composer replace the previous stacked application shell. Studio, Prototype workshop, Review desk, Preview room, Studio journal and Settings keep the existing service/controller contracts. The primary viewport is 1320×860; the desktop minimum remains 900×650. Narrow web layouts stack the scene/conversation instead of clipping controls.

The bedroom, character and CRT screen are independently layered. The physical room/casing stay fixed. Safe semantic state selects a character pose and screen interior; dynamic messages remain accessible HTML. Completed observations use past tense and static poses. No artificial progress percentage, delayed completion, model-generated status, workflow decision or extra Figma call is introduced.

## Art and provenance

The user supplied three generated JPEG references in `design-references/1.5-agent-studio/`. Runtime artwork is prepared from those supplied references: cropped canonical bedroom, ten transparent normalized character canvases, and ten cropped CRT screen interiors under `app/web/assets/agent-studio/`. Raw sheets and labels are excluded from runtime assets. Each output PNG has no generation metadata. Pixelated rendering and nearest-neighbor preparation preserve the reference palette; no remote asset is loaded.

The character sheets are illustrative single poses, not animation frames. State swaps use a stable 128×180 canvas and anchor. Minor hand movement occurs only when an actual active write is observed; reduced motion disables it. Their side-facing perspective differs slightly from the near-top-down room; this is an art limitation, not a claim of a fully hand-authored animation set. Existing room furniture/decor is baked into the approved background; no pet/game system is added.

PIXEL_AGENTS_CODE_COPIED: NO
PIXEL_AGENTS_ART_IMPORTED: NO
FIGMA_DESIGNER_AGENT_ART: ORIGINAL / USER-PROVIDED GENERATED REFERENCES

## Security and packaging

Only 21 explicitly enumerated PNG paths are served from the owned application root. No directory server, arbitrary extension, proxy, IPC or remote origin is added. Host/Origin/CSP and sandbox boundaries are preserved. Production assets are individually enumerated in source and release allowlists. Raw references are source-only. Existing package inventory and privacy checks remain mandatory.

Beta 4 and Beta 3 remain immutable. The local candidate uses `v1.5.0-source` / desktop 1.5.0, with no public release. MCP 1.1.0, protocol 2, 108 tools, exact source pin and all three approved hashes stay unchanged. V1.2.5 remains HOLD. Design-System Intelligence is deferred to V1.6.

## Verification record

Work in progress: deterministic translator and UI acceptance are running. Live design/revision/waiting/recovery/QA/browser/provider/reduced-motion/restart/package/full-UX acceptance and final hosted CI are not yet certified. Do not interpret fixture screenshots as live Figma authoring evidence.

Required live cases A–L will be recorded separately as observed evidence. Disposable content must be removed and protected page/source fingerprints restored before PASS.

## Limitations and next steps

Polling can miss short in-flight operations; completed observations remain truthful and are not replayed for animation. The translator cannot infer section names/plans from private tool payloads. Original assistant output and canonical findings stay in the conversation/evidence views; only the new status surface is a fixed semantic translation. Refine character perspective/gesture frames after this foundation; do not add a second agent runtime. V1.6 may explore Design-System Intelligence under a separate scope.

FIGMA_DESIGNER_AGENT_STUDIO: HOLD
