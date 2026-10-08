# Static beginner-onboarding review

Assumption: a new user can download/extract a ZIP and open Figma, but knows no MCP, agents, WebSockets, Git, Go, Bun, or project internals.

| Hidden knowledge found | Candidate correction | Remaining check |
| --- | --- | --- |
| Source ZIP differs from user package | Name the Windows ZIP under Releases → Assets | Verify final release page |
| Where to run setup | Open extracted folder; type powershell in Explorer address bar; exact command | Real clean machine |
| Missing Node/OpenCode | Link installers, minimum Node, npm global install as an explicit user step | Installer/PATH behavior |
| Provider sign-in/model access | Explain provider, /connect, separate costs and /models; retain configured model | Actual provider/model availability |
| Initial plugin Disconnected | Import manifest, start OpenCode, keep plugin open; explain connection order | Live clean-machine connection |
| Which window gets slash commands | Say OpenCode chat, not PowerShell; bundled AGENTS needs no /init | Command discovery |
| Dependencies versus build tools | Setup installs pinned Node browser dependencies; no Go/Bun for user ZIP | Network/proxy/caches |
| Timed command looks failed | Explain inspection, stable state, and missing-work-only continuation | No live write test in release work |
| Upgrade destroys config/output | New folder, backup/merge local config, new plugin import, retain rollback | Actual update walkthrough |
| PASS sounds like full app validation | Separate acceptance/freshness and describe FIGMA_LIMITED/coverage | Human layout/state review |

Static review PASS after documentation corrections. A local extracted-package smoke test is separate evidence, not a real beginner/clean-machine trial. No screenshot was fabricated. Root MIT license and sanitized runtime are prepared; the optional opaque engine is excluded. Enable GitHub Private vulnerability reporting immediately when repository visibility becomes public.
