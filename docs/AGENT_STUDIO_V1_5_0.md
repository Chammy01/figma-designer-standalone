# Agent Studio — V1.5.0 source

## Purpose and layout

This source milestone supersedes the compact presence-card experiment. A narrow navigation rail, action-only attention strip, central bedroom stage, side conversation and bottom composer replace the previous stacked application shell. Studio, Prototype workshop, Review desk, Preview room, Studio journal and Settings keep the existing service/controller contracts. The primary viewport is 1320×860; the desktop minimum remains 900×650. Narrow web layouts stack the scene/conversation instead of clipping controls.

The bedroom, character and CRT screen are independently layered. The physical room/casing stay fixed. Safe semantic state selects a character pose and screen interior; dynamic messages remain accessible HTML. Completed observations use past tense and static poses. No artificial progress percentage, delayed completion, model-generated status, workflow decision or extra Figma call is introduced.

## Art and provenance

The user supplied three generated JPEG references in `design-references/1.5-agent-studio/`. Runtime artwork uses the supplied references and an approved workstation correction: recomposed bedroom, ten transparent normalized character canvases, and ten cropped CRT screen interiors under `app/web/assets/agent-studio/`. Raw sheets and labels are excluded from runtime assets. Each output PNG has no generation metadata. Pixelated rendering and nearest-neighbor preparation preserve the reference palette; no remote asset is loaded.

The character sheets are illustrative single poses, not animation frames. State swaps use a stable 128×180 canvas and anchor. Minor hand movement occurs only when an actual active write is observed; reduced motion disables it. Working poses face right into a side-facing workstation; idle/listening poses can face the user. This remains an illustrative pose set, not a fully hand-authored animation set. Existing room furniture/decor is baked into the approved background; no pet/game system is added.

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
'
## Immediate visual course correction — 2026-10-18

The existing translator, recovery machinery and completed design/revision evidence are preserved. This correction changes presentation and observational coalescing only.

- **Workstation/room:** built-in imagegen edited the existing runtime bedroom, preserving the left bed/cat, bookshelf, window, plant, wood floor and open center. The desk is side-facing on the right, with keyboard left of the CRT and space for the character's own chair. A second narrow edit made the CRT face readable. The room is static; character, screen interior and HTML speech remain separate layers. No CSS mirroring/rotation of furniture or sprites.
- **Source reference:** the currently user-modified `design-references/1.5-agent-studio/bedroom-base.jpg` contains the monitor sheet. It is preserved untouched and excluded from this correction commit. The actual existing runtime bedroom was the edit target. No assumption was made that the modified JPEG was a replacement room.
- **Character:** existing ten 128×180 transparent canvases retained. Shared position 68%/22%, size 18%/27% aligns the seated right-facing working poses with the keyboard. Feet/seat anchors do not change between swaps. Recovery movement uses translation, never rotation. Idle may face the user.
- **CRT:** physical casing stays in the background. Only the cropped screen content changes, clipped to its fixed three-quarter screen face. No whole-monitor swaps or dynamic bitmap text.
- **Scale/layout:** 1320×860 browser viewport room is approximately 52% of usable Studio width. Conversation is 286px and quieter; healthy attention strip is hidden. Compact navigation remains, with Runs visually secondary. Composer is an integrated border line, two-row entry and Send.
- **Conversation:** previews stop at 240 characters with a three-line clamp. Keyboard-operable Full request retains every original character, including whitespace. Full completed assistant responses remain opt-in; actual briefing questions remain visible.
- **Recovery ownership:** top bar says Previous change needs checking, agent describes current state, timeline uses short historical labels. Repeated recovery phases coalesce in the renderer; opaque steps no longer interleave known tool phases with generic planning. Recovery records/actions remain available without changing retry/reconciliation decisions. No payload or reasoning is parsed for copy.
- **Errors:** reproduced incomplete validation response `{}`. Validate required evidence containers before reading nested status/count fields; clear stale findings/statuses and disable preview on invalid evidence. No fake passing fallback. Normal copy is Something needs attention; default-closed Technical details uses a safe error classification/code, never raw JavaScript, engine prose, paths or credentials. Valid evidence refresh recovers. Global unexpected error/rejection handlers use the same surface.
- **Responsive/accessibility:** 1320×860, 1200×800, 1024×720 and 900×650 checked for scene visibility, composer bounds and horizontal overflow. Narrow/200%-equivalent reflow, light/dark, reduced motion, keyboard focus, expanded request/details and polite status remain covered. Secondary workspace evidence uses a single column to avoid narrow clipping.
- **Visual checkpoint:** PASS for the corrected source presentation, including right-facing working pose inspected separately from idle. Screenshots are private generated evidence, not native Figma motion proof: `.figma-designer/presence/correction-1320x860.png`, `correction-1200x800.png`, `correction-1024x720.png`, `correction-900x650.png`, and `studio-dark.png` (working pose).
- **Art method/prompt:** built-in imagegen; edit target existing runtime bedroom, character supporting orientation reference. Prompt required only workstation reorientation, bed left, open floor, keyboard/CRT right, no baked character/chair/text; follow-up changed only CRT to readable three-quarter facing left. Selected output is saved in `app/web/assets/agent-studio/room/bedroom-base.png` (620×520, nearest-neighbor preparation, no embedded generation metadata). Existing 21-path static asset boundary unchanged.
- **Tests:** 572 npm contracts passed; 69 affected translator/application/validation/presence UI tests passed (final correction run). These totals overlap and must not be summed as distinct cases. Final packaged artifact checks and exact final CI are recorded separately after rebuilding.

The previously submitted native waiting-case request failed with SESSION_FAILED / RECONCILIATION_REQUIRED. Current native session context has no appended request beyond its recorded offset. It is not declared a safe retry or successful waiting acceptance. No request was resent and no recovery state was manually cleared. This remaining acceptance issue must be reconciled truthfully; it does not undo the visual checkpoint or the previously completed design/revision.

FIGMA_DESIGNER_AGENT_STUDIO: HOLD
