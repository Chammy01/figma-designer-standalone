# Figma Designer application foundation — V1.4.0 source preview

V1.4.1 adds [provider recovery, model controls and workspace UX](FIGMA_DESIGNER_APP_V1_4_1.md). This document records the original foundation acceptance.

The optional application is a product layer over the validated engine, not a new
design engine. Published Beta 3 remains unchanged. No Electron/Tauri shell, new
Figma command, provider management UI or native runtime capability is introduced.

## Launch and architecture

After normal source setup: `npm run app`. Open the printed `http://127.0.0.1:<port>`.
Keep the process running; Ctrl+C shuts down the application and its owned engine.
`FIGMA_APP_PORT` optionally selects a local port (default 0, OS-selected).
`OPENCODE_EXECUTABLE` may select an installed executable. The service otherwise
finds the executable on PATH, including the existing Windows npm package layout.
It does not install or upgrade OpenCode globally.

Web UI → localhost application service → authenticated OpenCode session → existing
figma-designer agent/router/commands → approved MCP/bridge/plugin → native Figma.
Browser code cannot call low-level Figma tools, plugin RPC, arbitrary shell or files.
Only health/status reads reuse the existing source-read adapter. All authored work
uses the agent. Plain ES modules, Node built-ins and existing Playwright are sufficient.

## Phase 0: actual OpenCode audit

The task baseline was 2.0.24; the installed CLI had advanced to 2.0.28. An isolated
temporary npm installation of 2.0.24 was used for the exact pinned audit and live
application acceptance, without replacing the global CLI. Supported application
versions are explicitly 2.0.24 and 2.0.28; unknown versions fail closed pending audit.

| Contract | Observed 2.0.24 behavior |
| --- | --- |
| Startup | `opencode serve --hostname 127.0.0.1 --port <port>` is supported; foreground server |
| Binding | Explicit IPv4 loopback; the app reserves an ephemeral candidate port and reports any startup failure |
| Authentication | OPENCODE_PASSWORD in child environment; Basic `opencode:<password>` internally; unauthenticated /api/info returns 401 |
| Info | GET /api/info returns version, PID and URLs; app exposes only version/ownership/port |
| Location | GET /api/location with project location; session creation explicitly carries `{location:{directory}}` |
| Session | POST /api/session with title, agent `figma-designer`, location; returned session ID is retained server-side |
| Prompt | POST /api/session/:id/prompt with `{text}` queues a user message; actual read-only provider prompt returned API_AUDIT_OK |
| Command | POST /api/session/:id/command with `{name,text}`; canonical workflow remains server-resolved; missing command returns 404 CommandNotFoundError |
| Polling | GET /api/session/:id/context returns ordered messages, assistant content and final `{type:'idle',outcome:'succeeded'/'failed'/'interrupted'}` |
| Cancellation | POST /api/session/:id/interrupt?resume=false; idle/queued probes returned false, active probes returned true and native idle `interrupted`; no process kill/rollback |
| Availability | /api/provider and /api/model exist; server readiness does not prove provider/model usability |
| MCP | /api/mcp exists but an empty catalog response is not proof of plugin disconnection; app uses independent existing metadata reads |
| Errors | HTTP status and structured error tags; raw errors/provider responses are not forwarded to the browser |

Agent/MCP listing was empty before session configuration loaded; some location query
forms returned only built-in agents. The adapter does not mistake these catalog
responses for application readiness. Explicit session agent/location and actual
execution establish the workflow context. Cached generated client types were useful
references, but observed native behavior takes precedence. Polling is used rather
than inventing undocumented startup flags, streaming events or a second router.

## Process ownership and credentials

Owned states: STOPPED → STARTING → READY, or FAILED. External reuse is opt-in using
server-only FIGMA_APP_OPENCODE_URL and FIGMA_APP_OPENCODE_PASSWORD. It requires an
authenticated http://127.0.0.1 address, audited version and matching project location.
EXTERNAL servers are never killed. The current installation directory is fixed;
there is no browser project/path picker.

An owned engine receives a cryptographically random per-start password, retained in
memory and the child's environment only. It is not placed in argv, HTML, browser
storage, query strings, app state or logs. The private client does not serialize it.
Windows cleanup terminates the owned child tree by its recorded PID; it never targets
a discovered/global service. Cancelling a run uses native interrupt, not tree cleanup.
Startup and shutdown failures are bounded and surfaced without native stack traces.

## Session and run model

One active design conversation is retained across prompts, revisions, specialist
commands and briefing answers. New Design explicitly creates another workspace
session. Browser refresh reconnects to the current in-memory state; an app restart
starts fresh. OpenCode retains its own native session history under its own policy.
The application does not delete it or copy provider credentials.

Runs have UUID, request ID, session ID, input, mode, timestamps, state, visible result
and normalized error. Modes AUTO / DESIGN / QA / BROWSER / BROWSER_TEST / STATUS
are a fixed allowlist. AUTO forwards natural language unchanged; no UI keyword router.
One run executes at a time. Repeated request IDs reuse the existing run, not resubmit.
At most 50 runs are retained in memory. A single pending session creation is shared.

RUNNING means the engine is active; progress is honestly “Working…” without invented
percentages/tool phases. Only user and assistant **text** is rendered. Reasoning,
system messages, raw tool arguments/results and provider state are excluded. Known
credential patterns and server environment secrets are redacted, including the owned
engine password. The UI uses textContent, not executable assistant HTML.

Native idle with a workflow marker produces COMPLETED. An idle conversation without
a terminal workflow marker is WAITING_FOR_USER (“Ready for your reply”), not an
inferred business question. Informational replies may also use that conversational
state. Follow-ups retain the same session; the app does not re-interview or infer scope.

Interrupt is a request, not a rollback. The run becomes CANCELLED only when supported
interruption is acknowledged/observed. Completed Figma writes remain. A lost submission
response is indeterminate: read context, never resend automatically. Unreconciled
transport failures block new work until a native idle boundary is observed.

## Local service API

| Endpoint | Purpose |
| --- | --- |
| GET /api/app/status | Sanitized engine/Figma/runtime status, active session/run, safe recent errors |
| GET /api/figma/status | Existing metadata-read connection evidence and approved hash status |
| GET /api/opencode/status | Owned/external process lifecycle, version, port |
| GET /api/project | Installation name and source application version, no arbitrary paths |
| POST /api/session | Explicit New Design conversation |
| POST /api/run | One authorized prompt or canonical convenience action |
| GET /api/run/:id, GET /api/runs | Sanitized in-memory visible results |
| POST /api/run/:id/cancel | Native session interrupt |
| GET /api/browser/status | Existing freshness classification and current local fidelity evidence |
| GET /api/browser/preview | Separate isolated localhost preview URL |

There is no generic HTTP proxy, tool invocation, file read, shell, model-token or
arbitrary command endpoint. Body size, mode, request ID and input length are bounded.
Health checks are coalesced/cached briefly; Check Again explicitly refreshes evidence.

## UI and status model

The calm neutral workspace has a sidebar, connection banner, large composer,
conversation, recent runs, Prototype guidance, QA report, Browser preview and Settings.
QA / Build Browser / Test Browser / Check System buttons call existing commands.
All fourteen terminal commands remain canonical and available. Critique still routes
through its existing guarded workflow; there is no direct critique-tool UI.

Figma: CONNECTED / PLUGIN_NOT_CONNECTED / BRIDGE_UNAVAILABLE /
DOCUMENT_UNAVAILABLE / UNKNOWN. Runtime: VERIFIED / HASH_MISMATCH / MISSING /
UNKNOWN. Engine process status is separate from provider availability; a provider
error recommends checking local OpenCode configuration. No provider sign-in secrets
are collected by the application. Missing plugin errors show recovery instructions.

Browser: NOT_BUILT / CURRENT / STALE / UNVERIFIED from the existing browserStatus
helper. Fidelity comes from the existing fingerprint-bound report, not an accuracy
score. A stale source is never promoted by a visual PASS. QA displays exact assistant
report text; no arbitrary prose is scraped into a fake QA dashboard.

Semantic labels, visible keyboard focus, labeled textarea, live status regions,
dark/light colors and reduced-motion rules are included. Minimum desktop layout is
680px; this is not a mobile application milestone. UI assets are local, with no CDN,
fonts, analytics or runtime network dependency. Provider traffic belongs to OpenCode.

## Security, logs and preview

Both application and preview bind only 127.0.0.1. Exact Host checking, same-origin
Origin/Fetch-Site validation, JSON-only mutation requests, no permissive CORS, nosniff
and a restrictive CSP protect the local boundary. There is no WebSocket endpoint.
Static application assets use an exact allowlist. Preview files use existing path and
realpath containment checks and cannot escape the project/output root.

Generated HTML runs on a **different port/origin** with no app endpoints; preview
scripts cannot send same-origin application commands. Preview opens without an opener,
cannot fetch external resources under CSP and cannot be embedded. User-generated
content is never served as trusted application JavaScript.

Only bounded event metadata (100 entries, no conversation/tool content) is persisted
to ignored `.figma-designer/app/events.json`. Known server-side secrets are excluded;
engine stdout/stderr is not copied into app logs. Safe error objects contain code,
title, message, recoverability and recommended action. Diagnostics are collapsed by
default and show sanitized statuses, versions, ports and IDs—not raw hidden reasoning.

## Validation and acceptance

Service tests use a real authenticated mock HTTP OpenCode server. They cover local
binding/origin/Host checks, missing routes/traversal, prompt/command forwarding, explicit
agent/session retention, briefing continuation, duplicate/concurrent requests, provider
failure, interruption, external ownership, owned child cleanup, hash mismatch, health
reads, bounded logs and separate-origin preview. UI Playwright tests exercise actual
submission, running/completion, follow-up, QA/browser buttons, disconnection recovery,
errors, diagnostics, keyboard focus, reduced motion, minimum desktop and reload.
No CI test requires a real provider or Figma connection. Existing regression suites
remain mandatory.

### Live application acceptance

The non-sensitive Untitled file had one page and five existing SoftFlow production
roots. All submissions below used the visible application composer/buttons and the
same native OpenCode 2.0.24 session. No direct Figma write was issued by the app or
acceptance harness. Local screenshots, conversations and raw tool evidence are
ignored; they are not shipped in source/release archives.

| Case | Observed result |
| --- | --- |
| Startup | Loopback application and owned engine ready; approved runtime verified; plugin/document readable. Only existing metadata reads during status/startup. |
| Disconnect/reconnect | User closed the plugin; actual PLUGIN_NOT_CONNECTED appeared with Send disabled and recovery instructions. After reopening, Check Again returned CONNECTED with the same service, engine port and conversation. |
| Natural design | Native editable 1440×800 dashboard, root `1006:2265`, 58 editable text nodes. A stale page reference produced a real clarification and zero writes; the composer answer continued the same session. |
| Revision | Same-session focused revision increased summary-card spacing, softened raised rims and repaired same-run layout leftovers. Root/section IDs and text were preserved. |
| Runtime prerequisite | The file initially had no canonical runtime. A separate bounded natural request created only a SECTION, two screen clones and two navigation reactions (five writes), preserving production. No new component-state architecture, destinations or product content. |
| QA | Canonical command returned WARN: two valid edges, zero broken controls/edges or unreachable screens; undefined controls remain inert/limited. Final collector: six reads, zero writes, unchanged document/graph fingerprints. Independent full-page JSON was identical before/after the QA turn. |
| Browser | Canonical generation, with separately authorized local export repairs, produced two source-bound screens. Open Preview used a separate origin, null opener and no app API. |
| Browser Test | Final canonical runner PASS; CURRENT source/local freshness; Fidelity WARN. Compared 534 nodes, 140 text nodes and 76 controls across two screens, with no missing nodes or measured drift; 43 unsupported-property limitations, zero local font limitations. Two NAV_DEFAULT edges passed behavioral parity and reduced-motion override checks. |
| Restart | Old app process, engine and preview listeners closed; no owned engine orphan remained. Final source started against installed 2.0.28, VERIFIED/CONNECTED, empty in-memory workspace, with identical full-page JSON before/after. |
| Stop Run | Active read-only native prompts were interrupted on 2.0.24 and through the final UI on 2.0.28. Final UI state CANCELLED followed native idle `interrupted`; no tool calls or document writes. An early request returned false while execution was not yet active, truthfully leaving the run running. |
| Security | Actual running service rejected foreign Host, foreign/missing Origin mutations and arbitrary shell/file/MCP/traversal routes. No permissive CORS. Mocked UI tests additionally block unexpected external requests. |

Original production roots `1003:60`, `1003:518`, `1003:1163`, `1003:1557` and
`1003:2006` retained identical normalized fingerprints. The document serializer
interns fill arrays as `s1`, `s2`, etc.; comparisons expand those references through
each snapshot's own `globalVars.styles` before hashing. Comparing raw reference
numbers after adding colors would incorrectly report changes in untouched roots.

The workflow encountered a native authoring timeout during the initial design.
The existing agent reconciled reads and removed confirmed same-run leftovers;
the application neither resent the prompt nor introduced a timeout policy.
The first QA scope omitted the start screen, and another annotation incorrectly
promised SCROLL_TO for text entry. The agent corrected its evidence and reran the
read-only collector; no Figma repair occurred. WARN was retained for undefined controls.

The initial browser export failed the unchanged validator on an ad-hoc token registry,
then on incomplete layer mapping. It also had a zero-height CSS container. Those
failures were retained; explicit subsequent generation requests repaired only the
ignored export. Two test turns began proposing/performing local repairs and were
interrupted rather than treated as valid read-only acceptance. The final test did
not regenerate artifacts. No engine rules, validation thresholds or Figma nodes
were changed to obtain acceptance. The earlier running app labelled interrupted
tool-error turns FAILED; final run handling now prioritizes native `interrupted`,
covered by a regression and the final live UI cancellation.

The final runner leaves BROWSER_VISUAL_REGRESSION, PIXEL_REGRESSION and
NATIVE_RENDER_PARITY UNVERIFIED because no accepted live screenshot baseline/native
comparison was supplied. A structural match is not pixel/native renderer parity.
The limited search field has an ownership hook but its state behavior was not tested.

Recorded workflow-tool telemetry: 113 reads and 55 Figma write attempts (38 initial
design, 12 focused revision, five runtime-prerequisite writes). Two write attempts
and one screenshot read returned tool errors; these are attempts, not 55 successful
mutations. Timeout reconciliation preserved completed work. Additional collector,
integrity and cached health reads are separate and are not included in that count.
Direct GUI Figma writes: zero. Startup, health, QA, browser generation/testing and
restart document writes: zero. Native page count after authorized design/runtime
work: 2,249 nodes; it stayed unchanged through QA/browser/restart checks.

One model-evidence limitation surfaced: a node read omitted `effects`, which the
revision response incorrectly interpreted as no shadows. Browser source collection
later exposed real effects and the agent corrected that claim. The app displays
the engine's reports faithfully; it does not certify their prose or replace the
existing source/fidelity checks. This milestone does not claim a new visual-quality
or native interaction-playback proof.

Local regression results: 404 Node contracts (including 17 application-service
cases), two application UI/protocol cases, eight browser functional/motion cases,
nine fidelity cases, 275 plugin cases, 112 hardening/source cases, 30 setup fixtures
and one actual OpenCode timeout contract. Go tests/vet, clean source rebuild,
package/extraction/setup, privacy/release checks and exact approved hash validation
are additional release gates. Hosted CI repeats these gates on the final commit.

The clean archive/package checks are local regression artifacts only; they are not
a replacement Beta 3 download or a Beta 4 publication. All five published Beta 3
asset digests were checked against the rollback checkpoint and remained identical.

V1.2.5 remains HOLD. No variables/conditionals are advertised as working features.
Approved executable/plugin/UI hashes and Beta 3 public assets remain unchanged.

## Later milestones

V1.4.1: refine Design Workspace UX, message presentation and recovery affordances.
V1.4.2: structured QA / Browser / Fidelity dashboard using stable evidence contracts.
V1.4.3: Windows desktop shell and packaging; then Beta 4.
The web service wraps the engine once; future desktop packaging should reuse it.
