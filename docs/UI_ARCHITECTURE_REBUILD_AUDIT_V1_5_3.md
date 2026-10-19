# V1.5.3 current interface audit

## Baseline and method

Fetched origin/main before investigation. Actual baseline: `c36e4557af70394a862c23a2b0fbcb987eab9049`, replacing requested `b2e5ce239d38760046f7a84c24f7ae5ecbce1bf4`. HEAD matched origin/main. Preserve pre-existing modified bedroom-base.jpg and the critique-test assertion deletion.

Inspected the running source application, not CSS alone. Captured all six surfaces at 1320×860 and 900×650 under [before evidence](visual-evidence/v1.5.3-ui-rebuild/before/). The live source launch reports engine FAILED, Figma CONNECTED, runtime VERIFIED and reconciliationRequired true. No task, retry or acceptance was submitted. Screenshots show the actual restored recovery record; they do not establish fresh completion. Working/Waiting/Completed/Recovery/Error captures prefixed `fixture-` use an isolated temporary workspace and deterministic existing activity mappings, never live Figma writes.

## Current architecture

```text
+----------+-----------------------------------------------------------+
| f/ brand | view title                          Figma / engine / model |
| New      +-----------------------------------------------------------+
|          | connection / actionable problems                          |
| Studio   +---------------------------------------+-------------------+
| Prototype| AI Designer                           | conversation      |
| QA       |                                       | narrow request /  |
| Browser  |         GIANT PIXEL ROOM               | result transcript |
|          |                                       |                   |
| Runs     |                                       | recent activity   |
|          | agent sentence + workflow buttons     | technical details |
|          +---------------------------------------+ validation summary|
| Settings | composer under room                   |                   |
+----------+---------------------------------------+-------------------+
```

Other routes retain the same rail/header and a vertically stacked article. QA and Browser evidence are long linear stacks. Prototype is a paragraph and button. Runs is a broad list with detail below. Settings is repeated two-column rows.

## Audit questions

| # | Question | Finding |
|---|---|---|
| 1 | Shell | Persistent 106px left rail, header and content column. Narrower rail at 900px. |
| 2 | Navigation | Hash routes in a vertical icon/text stack, with utility destinations separated by whitespace. |
| 3 | Studio dominance | The room scene takes the largest high-contrast region. |
| 4 | Primary task | User intent is confined to a narrow right column; it competes with a decorative room. |
| 5 | Composer | Bottom-left, beneath the room, visually detached from the transcript. |
| 6 | Conversation | Chronological YOU/request/result articles in an independently scrolling side panel. Long requests expand. |
| 7 | AI activity | Character/monitor animation, phase badge, sentence, separate recent log and technical disclosure. |
| 8 | Status | Header has three status spans; connection banner, agent state and validation summary add separate status owners. |
| 9 | Redundancy | Route title repeats inside most secondary pages. Activity and recent activity often repeat the same fact. |
| 10 | Empty space | Prototype leaves nearly the entire viewport empty. Runs has large blank space after sparse rows. |
| 11 | Developer-tool feel | Raw markers, model/runtime status and diagnostics compete with user outcomes; Browser exposes a long report stack. |
| 12 | Chatbot feel | Narrow request/result transcript with a separate prompt composer, rather than an inspectable design record. |
| 13 | Decoration | Bedroom, star/avatar and large brand occupy space without advancing the current design task. |
| 14 | Cards/pills | Phase pill and recovery/result treatments lack a unified hierarchy; card styling does not solve cramped content. |
| 15 | Historical constraints | Room-first grid, bottom room composer and right-side transcript survive the monochromatic work. |
| 16 | Preserve function | Safe submission, full request disclosure, result disclosure, recovery confirmation, activity mapping, validation normalization, model/provider controls. |
| 17 | Discard presentation | Full-height app rail; room-first composition; conversation sidebar; composer beneath artwork; evidence as unstructured page-long stacks. |
| 18 | 900×650 | Room still dominates; transcript and recovery controls fall into a tiny scroll region; supporting copy and status are very small. |
| 19 | Accessibility | Very small 9–12px copy/actions, weak disabled distinction, no skip link, error toast may obscure content, competing live regions. Existing focus and reduced-motion support are worth preserving. |
| 20 | First/second/third | Room, navigation/title, then small task text and composer. The order should start with intent and outcome. |
| 21 | Workflow obvious? | No. QA/Browser shortcuts sit below the room; Prototype does not explain prerequisites or journey. |
| 22 | Artwork priority | Yes. More space goes to a room than the task, outcome and revision controls combined. |
| 23 | Too much state? | Healthy connectivity/model labels are continuously visible, while meaningful report differences are buried. |
| 24 | Distinct from V1.5.0? | The retained room/rail/transcript silhouette is not compositionally distinct enough. Palette and CSS hierarchy are insufficient evidence of an architecture rebuild. |
| 25 | Why V1.5.2 failed | Final source retains historical layout regions despite the planning documents describing a different emphasis. The product owner's visual rejection is authoritative; prior PASS notes describe functional verification, not acceptance of this architecture. |

## Required transformation

Move navigation to a horizontal workflow strip. Make Studio a design document: command surface above a full-width revision ledger, with a compact activity line. Remove the bedroom from the rendered shell while preserving artwork on disk. Give QA an evidence/finding workbench, Browser explicit evidence categories, Runs a genuine master/detail split and Settings contextual category navigation.

Acceptance requires a different grayscale silhouette at the same viewport. A recolor, smaller room or narrower left rail is rejected before implementation.
