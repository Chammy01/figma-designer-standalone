# Figma Designer application V1.4.1

V1.4.2 adds [structured QA, Browser and fidelity dashboards](FIGMA_DESIGNER_APP_V1_4_2.md). This guide records the provider/workspace milestone.

This source-preview milestone adds native provider/model controls, conservative recovery and a quieter design workspace. Start with `npm run app` after source setup. Published Beta 3 assets and all fourteen command names are unchanged. QA retains its existing read-only collector and gains execution-level enforcement after a live regression.

## Provider/model audit

Audited the generated client and schema for OpenCode 2.0.24 and 2.0.28, then exercised real local authenticated servers. The client rejects every other version before starting an owned engine. API paths below are native OpenCode paths, not publicly proxied app endpoints.

| Operation | Audited native surface | Evidence / scope |
|---|---|---|
| Providers | GET `/api/provider` | Native catalog; activation and integration identity, no credential values exposed by app |
| Models | GET `/api/model`, `/api/model/default` | Native full model catalog/default; app whitelists IDs, name and availability only |
| Connections | GET `/api/integration` | Native methods/connections; `needs_auth` is meaningful; connection presence alone does not prove a usable key |
| Change model/provider | POST `/api/session/:id/model`, `{model:{id,providerID}}` | Same-session readback succeeds on both versions; provider changes by selecting its model |
| Initial model | POST `/api/session`, optional `model` | Explicit app choice passed at creation; actual assistant model checked separately in acceptance |
| Key connection | POST `/api/integration/:id/connect/key`, `{key}` | Both versions accept a disposable invalid test credential in an isolated native profile. This proves delegation/storage, not authentication |
| OAuth | POST `/api/integration/:id/connect/oauth`, `{methodID}`; GET attempt; POST attempt `/complete`, `{code}` | Both versions started a real DigitalOcean HTTPS sign-in attempt, returned pending status, and cancelled through the native DELETE endpoint. No account was authenticated. App supports catalog-reported methods without additional forms; real account sign-in is separate evidence |
| Reload | POST `/api/location/reload` | Native reload after connection; no project/default configuration rewritten |
| Connection check | POST `/api/experimental/generate`, `{prompt,model}` | Tool-free, explicit user action. Live probes returned native 400/503; catalog presence is **not** displayed as a successful usability test |

Location-scoped catalog requests use `location[directory]`. Cold catalogs can be temporarily empty: the adapter warms/re-reads them and reports CHECKING on invalid responses. Native model switching accepts even invalid references; therefore the app validates against the current enabled catalog **before** switching, then reads the session model back. A new session is not required. A lost switch response is read back before confirmation; if readback fails or differs, MODEL_REQUIRED blocks new tasks until a choice is explicitly verified. Global and project defaults are never rewritten. Native configuration responses may contain secrets and are never proxied.

Source: pinned [generated client/types](https://github.com/anomalyco/opencode/tree/v2.0.24/packages/client/src/promise/generated) and installed `@opencode/schema` 2.0.24. Version 2.0.28 was independently probed. Catalogs and availability are time-dependent; no model list is hardcoded.

## State and recovery

AI states distinguish PROVIDER_REQUIRED, MODEL_REQUIRED, PROVIDER_AUTH_REQUIRED and MODEL_UNAVAILABLE. A valid native catalog is READY with the label “Available in engine catalog”; a successful explicit generation check is separately “Connection checked.” Structured native authentication/type errors are distinguished from broad provider/session failure. Only an explicit provider status 429 produces PROVIDER_RATE_LIMITED. Transport/network ambiguity remains broad rather than claiming a provider outage or network diagnosis.

Failure cards include a human title, explanation, impact and action; native code/session IDs are collapsed under Details. Pre-execution or complete failed context containing only text and known inspection tools can establish RETRY_SAFE. Only the existing fixed inspection whitelist and direct QA collector establish tool-based zero-write evidence at a completed idle boundary. Code Mode, other tools and unknown events remain possibly writing. No response is automatically resent.

| Recovery | Required evidence | UI action |
|---|---|---|
| RETRY_SAFE | Request never submitted, or complete new native idle context has only known reads/text and no unknown events | Explicit Try Again; Change Model |
| RECOVERED_COMPLETED | New native succeeded idle, final result marker, no native error | Recovered result; no replay |
| CONTINUE_FROM_CURRENT_STATE | New native idle plus positive changed page fingerprint stable across two reads | Continue From Current Design, preserving completed work |
| RECONCILIATION_REQUIRED | Lost response/incomplete context, possible writes without positive stabilized evidence | Check Current Result; new work/model changes stay locked |

A current-page fingerprint is scoped evidence, not whole-file proof of no writes. Unchanged fingerprints never override possible tool side effects. A stale pre-submission idle cannot clear quarantine. Reconciliation only reads native context and the existing QA read helper (`get_document`); it cannot repair or write Figma. A native interrupt acknowledges stopping, not rollback. Only the latest finished run can be reconciled. Native final cancellation wins over tool errors.

## Model and provider controls

Settings → AI lists only native models, grouped by provider. Unavailable entries remain visible and disabled. Change Model validates and reads back the selection while preserving the session. Active tasks and model/connect operations exclude each other. Unresolved task outcomes lock model changes and new work; reconnecting credentials is allowed without unlocking or resending the task. The UI disables switching immediately; server checks are authoritative. The only saved preference is `{model:{id,providerID}}` in ignored `.figma-designer/app/preferences.json`. Missing selections after restart stay MODEL_UNAVAILABLE until the user chooses another. Restart creates a fresh conversation; page refresh retains the in-memory conversation.

Connect Provider offers native no-form key/OAuth methods. An existing native connection can be retained without re-entering credentials; the dialog returns to model selection without silently changing the model. A key is entered transiently, cleared before awaiting the response, forwarded once to the fixed OpenCode endpoint, and neither logged, returned nor persisted by the app. OpenCode owns credential storage. Connection saved is not falsely called authenticated; choose a model and check its connection. OAuth URLs must have HTTP(S) scheme and no embedded credentials; native attempt IDs stay server-side. Methods requiring extra native forms are visibly limited and refer users to supported account setup instead of guessing answers. No command/shell auth flow is exposed.

## UI architecture and review

Plain semantic HTML/CSS/JavaScript, no added dependencies. A narrow warm-neutral sidebar, ink/forest contrast, compact status line and editorial conversation replace the original developer-oriented panel. No gradients, glow, sparkles, floating decorations or pill proliferation. One serif empty-state heading gives the workspace a distinct identity; repeated settings use ruled rows rather than nested cards.

Design, Prototype, QA, Browser, Recent Runs and Settings retain existing workflows. Progress says Working… unless there is stable evidence; no percentages or tool logs. Only the final assistant text is shown after native idle; reasoning/tool/system content and intermediate planning are excluded. Result cards use actual markers and text without invented screen/component counts. Browser freshness, functional tests and fidelity remain separate. Recent Runs opens request/result/status/time and relevant actions. Diagnostics are collapsed by default.

Settings groups AI, Figma, Browser and Application. The top line separates Figma, engine and current model; runtime verification belongs in Settings/connection recovery. Stateful Variables appears only as advanced HOLD status. Keyboard focus, native selectors/dialog, labels/live regions, system reduced motion, dark colors and narrower desktop resizing are covered. Unchanged status text is not replaced on each poll.

## Security

The service remains 127.0.0.1 only, exact Host, same-origin JSON mutations, no CORS, restrictive CSP, fixed paths and separate-origin browser previews. No generic OpenCode proxy, filesystem, shell, direct browser-to-MCP or Figma write endpoint exists. OPENCODE_PASSWORD remains private to the server/owned child. API errors omit native response bodies. Logs contain bounded event metadata, not credentials or context. No existing MCP/plugin/runtime or global model/default configuration changes.

## Validation record

Local application acceptance and regression gates are complete. The first native QA exposed a read-only violation; it is preserved below, followed by the guard repair and fresh acceptance. Existing connected-provider reuse is verified; fresh account authentication was not completed and is not claimed. No release or public Beta 3 replacement is produced. Hosted CI must be checked against the final delivery commit, rather than an earlier baseline run.

### Live A–J

| Case | Result / evidence |
|---|---|
| A — provider missing | Controlled full UI/server fixture passes with runtime/Figma visible, disabled authoring and Connect Provider. Real isolated native profiles still expose free models, so no genuine no-provider account is claimed |
| B — connect | Real UI detected the existing OpenCode connection, offered Use existing connection and retained READY/model IDs without credentials, project edits or restart. Native session runs confirm that provider works. Both real versions additionally accept isolated key delegation and native OAuth start/poll/cancel. Invalid test keys prove delegation only; fresh account sign-in completion remains UNVERIFIED |
| C — model | UI selected LongCat; native assistant metadata confirms it was used. Same-session switching/readback proved on 2.0.24 and 2.0.28. Space Bunny hit a real structured 429; UI changed to LongCat, then Cat Jam. No Figma writes from switching. Final preference is the last explicitly chosen model ID |
| D — safe failure | Controlled pre-session failure produced PROVIDER_UNAVAILABLE_SAFE / RETRY_SAFE, no writes, explicit Try Again. A real native 429 also failed before tools and produced PROVIDER_RATE_LIMITED / RETRY_SAFE |
| E — uncertain | Ignored harness dropped one native submission response and temporarily hid context. RECONCILIATION_REQUIRED blocked new work/switching; native completed output was recovered without resend. A later real 429 interrupted prototype preparation after writes: stabilized page changes produced CONTINUE_FROM_CURRENT_STATE. UI continuation reused both clones without duplicates |
| F — design | Native root `1022:1719` at `(9000,1300)`, 1440×800, one small neumorphic productivity dashboard. Editable FRAME/TEXT structure; native screenshot reviewed. All six original roots preserved |
| G — revision | Same conversation/root; 16 focused effect setters and three spacing changes. Ordinary node reads omit effects; successful setters and a screenshot are not misrepresented as precise effect readback. One hidden intermediate frame remains |
| H — initial QA regression | Native prose said WARN/zero writes, but **that whole-command acceptance FAILED**: one `figma.update_node_props` call moved runtime screens `1023:1803` and `1023:2106` to x=0/1600, y=0 before the read-only helper started. Helper-only counts did not cover that write. Production remained unchanged; this failure was not hidden |
| H — repaired QA | Separate persistent QA guard blocks shell, Code Mode, authoring and delegation before execution; direct figma_qa_report reuses the existing collector. Both native versions completed the collector without Figma writes. On 2.0.24 an attempted execute call was blocked before execution. App QA rerun completed WARN with UNCHANGED page integrity; no repair was attempted |
| H — Browser | Build completed through the UI/canonical command. Two screens; stable export `4c2c843f-6739-4608-bfec-8266f26dfd00`, source hash `129cd01193e0d6d52a3c992380c48ed41650ea372316dadbd30d22ece81fcd27`. Full command trace has zero Figma writes |
| H — Browser Test | UI/canonical command completed: freshness CURRENT, navigation/schema/ownership/reduced-motion/local resources pass; overall acceptance FAIL because SOURCE_FIDELITY FAIL has five MEDIUM stroke-width findings. 617 nodes, 199 text nodes, two controls compared; 86 unsupported-property and 199 font limitations. Motion contract is absent, so no motion parity is certified. Pixel/native render parity remains UNVERIFIED. Zero Figma writes in the command trace |
| I — restart | Idle restart restored model IDs, created a fresh conversation and stopped the old owned engine. No Figma writes from startup/model restoration. Pre-session failures now have a workspace ID; failed New Design preserves the prior conversation |
| J — usability | Design/revision/QA/browser actions and results required no terminal after launch. Native no-form connect methods are in Settings. Additional native forms/command authentication still require external setup; fresh account completion is unverified. Existing-provider reuse and execution-level QA protection work without terminal setup |

The first prototype preparation returned an unrelated earlier audit marker and was **not** accepted as success. The later rate-limited partial runtime was preserved: SECTION `1023:1802`, Dashboard `1023:1803`, Tasks `1023:2106`. Explicit continuation wired only Tasks→Tasks and Dashboard→Dashboard with DISSOLVE 0.15 EASE_OUT. Other controls remain undefined/inert; no product behavior was invented.

### Read-only result protection

The app now compares captured current-page fingerprints after QA, Browser and Browser Test. A change raises READ_ONLY_VERIFICATION_FAILED and rejects a native claimed success. Lost-response reconciliation runs the same check and cannot turn an already changed-document QA into RECOVERED_COMPLETED. UI shows the integrity state and omits a blind retry. Negative fixtures exercise both ordinary and recovered false-success cases. A read-only replay using the real historical QA before-hash and current Figma page raised READ_ONLY_VERIFICATION_FAILED / CHANGED without re-executing QA or making writes. The gate applies to the fixed UI QA/Browser/Test modes; AUTO routing remains engine-owned.

The fingerprint check is **detection, not write prevention**: it covers net captured page changes, not all properties, other pages or write-then-restore operations. Prevention comes from the separate `.opencode/plugins/figma-qa-guard.js` plugin and `rules/figma-qa-guard.mjs`, using the same supported session/tool/permission hooks as critique. It persists per session through reload/steering and only unlocks on a fresh non-QA prompt at idle. It permits the fixed inspection whitelist and direct read-only QA helper, never arbitrary shell/Code Mode. Provider schemas remain intact. The critique guard source/checksum and enforcement are unchanged; combined lifecycle and actual 2.0.24/2.0.28 tests pass. Missing guard dependencies fail setup. No MCP/plugin binary, router, planner or QA analyzer is rewritten.

Browser fidelity findings are retained as failures. The agent’s assertion that subpixel matching is impossible is not adopted as a proven renderer limitation. No tolerance, baseline or native source was changed to obtain PASS.

### Integrity and counts

Original six roots (`1021:2`, `1021:167`, `1021:478`, `1021:806`, `1021:1156`, `1021:1463`) have identical expanded normalized fingerprints before/after. The UI kit still has 20 standalone components. The seven production roots after the authorized revision, excluding the runtime, still hash to `2082ff58b5a4c4a7a4997012ac125ca9dfd66296fe31f154d072993a8e298b83` after QA/browser. Final page hash is `a68cfd586576aa6f2d199c8edd4e46c541b5d7e9a22508a16781e8fff3712be6`: it matches the browser build/test before state. Nodes: 1,684 before; 2,385 after authorized design/runtime work. One canonical runtime, two clones, no duplicate production root or Component States campaign.

Four native session traces contain 86 Figma read-tool attempts and 68 write-tool attempts, including the one unauthorized QA operation. These are tool attempts, including errors, not per-node successful mutations. Background health/source/app polling adds reads and is not globally instrumented. Direct GUI/application Figma write calls: **zero**. No Figma write timeout was identified; controlled app/native transport loss and real provider 429s were reconciled separately.

The approved MCP/Figma runtime hashes are unchanged from Beta 3:

- executable: `bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f`
- plugin code: `273e20f56b80e9a7d995962948b1bb93e5cc1dfa19471ecd834ca7308d7da941`
- plugin UI: `661fb49dd3ca38ed4648e70858822f59f565093718d02143c6b1b85628f054ee`

MCP has 106 tools and still exposes combine_as_variants. Fourteen commands remain. V1.2.5 remains HOLD. Router/planner/motion/critique source contracts are unchanged. All five published Beta 3 asset digests match the rollback checkpoint.

### Tests and visual review

443 Node contracts (46 app-service cases and ten QA-guard cases), 11 UI/protocol cases, eight browser functional/motion cases, nine fidelity cases, 275 plugin cases, 112 hardening/source cases, 32 setup fixtures and one actual OpenCode timeout contract pass: **891 cases**, with Go tests/vet and clean source/package/privacy/hash checks as additional gates. Final source/package checks run against the staged delivery tree; hosted CI must be green on the exact pushed commit.

A live-source regression exposed an existing Windows shutdown defect: forced process.exit immediately after HTTP source reads produced UV_HANDLE_CLOSING after complete reports on Node 24.15/24.19. The browser CLI now sets the exit code and allows natural shutdown. Unchanged browser fixtures and the live runner complete normally. No browser motion/fidelity semantics changed.

Local screenshots A–H were captured and reviewed: empty workspace, active run, completion, provider missing, uncertain failure, Settings/model selector, QA, Browser. These are synthetic UI states, not native playback proof. Real healthy/Settings, safe/uncertain/partial/rate-limit recovery and native design screenshots supplement them. Ruled spacing, restrained forest/ink contrast, keyboard focus, system reduced motion and narrower desktop use pass review. No gradients, glow, sparkles, pill proliferation or decorative dashboard clutter. Failure results now use a distinct restrained warning treatment. QA cards offer View Findings; no counts are invented.

Fault injection exists only in ignored acceptance harnesses, never in the product API. The isolated audit profiles contain invalid test credentials, not real account sign-ins; automatic approval review blocked their optional recursive cleanup, so they were retained locally. No cleanup refusal is hidden as a successful action.

### Changed files

| Files | Purpose |
|---|---|
| `app/server/ai.mjs` | Native catalog, safe model preference, model/connect exclusivity, delegated auth |
| `app/server/opencode-client.mjs` | Audited fixed native API methods; sanitized structured error status |
| `app/server/runs.mjs` | Recovery, workspace isolation, final-only text, read-only result integrity |
| `app/server/index.mjs` | Fixed AI/reconcile endpoints, safe status and read fingerprints |
| `app/web/index.html`, `app/web/app.js`, `app/web/styles.css` | Workspace, Settings, model/connect UI, results/recovery/history, client delivery quarantine |
| `scripts/figma-app.test.mjs`, `scripts/figma-app-ui.test.mjs`, `scripts/fixtures/app-opencode.mjs` | Provider/model/reconciliation/UI regressions |
| `scripts/figma-browser-test.mjs` | Graceful Windows shutdown after source reads |
| `.opencode/plugins/figma-qa-guard.js`, `rules/figma-qa-guard.mjs`, `.opencode/commands/figma/qa.md`, `scripts/figma-qa-guard.test.mjs` | Persistent native QA protection, direct wrapper around the existing collector, lifecycle/compatibility regressions |
| `package.json`, `setup.ps1`, `scripts/setup.test.ps1` | App/guard enumeration and tests, including missing-guard startup failures |
| `docs/SOURCE_ALLOWLIST.json`, `docs/RELEASE_ALLOWLIST.json` | Source/module packaging |
| `README.md`, `docs/COMMANDS.md`, `docs/ARCHITECTURE.md`, `docs/FIGMA_DESIGNER_APP_V1_4_0.md`, this report | Minimal cross-links and truthful candidate status |

## Limits / next milestone

Catalog completeness, provider availability and native error specificity vary. OAuth account authentication requires the real account holder; native form-based and command-based setup is not duplicated. The experimental connection-check endpoint returned native 400/503 even while session prompts worked. A generic 503 is not classified as a provider outage, and a successful check requires the declared nonempty `{text}` response. Its failure does not falsely invalidate a catalog model. Retry classification intentionally favors quarantine when side effects cannot be ruled out. Current-page fingerprints cannot establish whole-document absence of writes. App history remains in memory; provider secrets remain OpenCode-owned. Fresh account sign-in still needs account-holder acceptance; existing connections do not need to be replaced just to run acceptance. V1.4.2 can add structured QA/browser/fidelity views, reliable native connection checking and guided additional auth forms, without moving design logic into the UI.

Local acceptance complete; consult the final delivery for the exact commit and hosted CI result.
