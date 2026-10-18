# Agent activity — V1.5.0

## Observer contract

`app/server/agent-activity.mjs` observes existing run modes/states, tool name/status records, structured Code Mode tool traces, recovery counts and canonical terminal markers. `app/shared/agent-activity.mjs` owns phases, animations and fixed copy. It does not read reasoning, assistant planning prose, prompts, tool input/output or raw errors to produce messages. No extra model call, Figma read, retry, workflow or transport exists.

AgentActivity carries version, validated runId, sequence, semanticKey, phase, animation, messageId, fixed message/detail, active, attention, terminal, observation, startedAt, updatedAt and allowlisted technical enums. Existing GET /api/runs and /api/run/:id carry additive activity/history fields.

Phases: IDLE, LISTENING, INSPECTING, PLANNING, DESIGNING, PROTOTYPING, CHECKING, PREVIEWING, WAITING, RECOVERING, COMPLETED, CANCELLED, BLOCKED.

Animations: IDLE, LISTEN, READ, THINK, TYPE, CONNECT, CHECK, PREVIEW, TALK, WAIT, RECOVER, DONE, ALERT.

Semantic groups: READ_DESIGN, WRITE_DESIGN, COMPONENTS, PROTOTYPE, EXPORT, QA, BROWSER, RECOVERY, OTHER. Unknown/system tools use neutral preparation, never an inferred design write. Native state.status is authoritative for activity: OpenCode 2.0.28 can retain executed=false on completed/running records. Pending/missing status does not claim work. Tool names/IDs stay off the human-facing surface. Mode-aware QA/browser/status copy preserves actual workflow ownership.

## Translation and recovery

Reads: checking the current design. Writes: updating the interface. Components: setting up reusable components. Reactions: connecting interactions. Reads after writes: checking the design after changes. Completed-only polls use past tense with active=false. No parsed section names or invented counts.

Lost response: “I'm checking the last change.” Committed/recovered result: completed work is preserved; no blind resend. Failed-before-write: safe to try again only through the existing explicit action. Partial: preserve and inspect current work. Unknown: cannot confirm, attention required. Read-only integrity failure always overrides success. Canonical FAIL/WARN findings remain visible and do not become a success claim. A receipt by itself does not mean the app automatically resumed.

WAITING_FOR_USER uses the fixed short bubble “I need your input before I continue.” The actual assistant question stays in the conversation; no private text is synthesized. Provider/model/plugin/engine/runtime errors use fixed familiar copy and the existing authoritative recovery controls.

## Retention, privacy and accessibility

History is chronological, coalesced by semantic phase/group and capped at ten entries per run. Existing run memory remains bounded to 50. Private tool-observer cursors are WeakMap state, capped at 512 statuses and 64 unfinished messages. Animation/history does not persist. Existing safe recovery checkpoints reconstruct one static state on restart; no operation or event replay.

View details starts closed and displays only fixed enums. Renderer ignores arbitrary activity message strings and resolves a known messageId. No credentials, paths, prompts, reasoning, raw arguments, document text or receipt internals enter activity copy/history. CSP, local origin protections, no telemetry and existing preload privileges remain intact.

Text status with polite aria-live is always present. Art is decorative. Focus/keyboard, responsive reflow and reduced-motion behavior are tested independently of animation. Ctrl+Enter submits only when the existing Send control is enabled.

## Tests and evidence

Deterministic observer tests cover mapping, coalescing, mode awareness, recovery outcomes, safe failures, private-reasoning exclusion, missing/unknown events, duplicate polling, parallel tools, bounded history and restart restoration. UI tests cover the actual run API, same-session question continuation, studio states, assets, safe static routes, themes, narrow/minimum layouts, keyboard and reduced motion. These tests do not certify live Figma authoring; the Studio report records live acceptance separately.

See [event audit](AGENT_PRESENCE_EVENT_AUDIT_V1_5_0.md), [UI audit](UI_OVERHAUL_AUDIT_V1_5_0.md), [Studio](AGENT_STUDIO_V1_5_0.md) and [Pixel Agents reference](PIXEL_AGENTS_REFERENCE_V1_5_0.md).
