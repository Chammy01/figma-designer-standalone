# Optional skill engine audit — v1.2.1-beta.1

Status: **REMOVED_FROM_PUBLIC_RELEASE_NOT_REQUIRED**.

## Reachability

The opaque engine was `.opencode/skills/impeccable/scripts/bin/windows-x64/impeccable.exe` (engine 0.1.11; skill 4.5.0; SHA-256 `605b5b442d2a65d270ef989de13371444849526249f511d397ca7424c184db49`). The shell launcher `scripts/impeccable` and Windows launcher `scripts/impeccable.cmd` invoke it. `.opencode/commands/impeccable.md` loads that optional skill; its Setup step invokes `impeccable context` and references invoke further engine verbs.

None of the ten core commands (`/figma/design`, `/figma/revise`, `/figma/states`, `/figma/interactive`, `/figma/motion`, `/figma/qa`, `/figma/browser`, `/figma/browser-test`, `/figma/status`, `/figma/doctor`), either agent, setup, configuration template, or six core runtime modules invokes Impeccable. The core path is OpenCode → local MCP → Figma Desktop plugin; browser validation uses Node/Playwright.

OpenCode discovers skill metadata and lets a model load relevant instructions; it does not execute every discovered skill at startup. See [official skill discovery/loading documentation](https://opencode.ai/v2/docs/skills). This optional skill's broad design description could cause model selection, so absence of explicit core calls alone is insufficient to leave its active instructions installed.

## Absence and source material

Removing only the binary is insufficient: both launchers search environment/PATH/cache and can download engine-v0.1.11 on first invocation. The old skill documents a context-loading failure fallback (read existing project context and continue), but many detector, hook, font, and live-browser verbs still require the engine. Bundled reference/degraded-role Markdown and browser helper JavaScript are not source for rebuilding a compatible self-contained engine; no equivalent full replacement is established.

## Public candidate and ZIP

The engine, both download launchers, and `/impeccable` command are removed from the candidate. `SKILL.md` is renamed `REFERENCE_ONLY.md` with an archive warning; it is no longer discoverable under OpenCode's skill-file rules. Remaining third-party reference/helper material is source-only and inactive. The ordinary-user ZIP includes only this skill's unchanged LICENSE and NOTICE, not archived instructions, engine version metadata, helper scripts, font data, or reference playbooks. Anti-ai-slop-ui remains available under its existing MIT terms.

The affected optional feature is the separate `/impeccable` engine workflow (detectors/hooks/live design tooling), not the core `/figma/*` workflows. Beginner setup expects no engine and makes no request to install one. No upstream substitution or opaque engine rebuild was attempted. The original working project retains its complete optional skill unchanged.

Release checks verify the ten command files, absence of engine/launchers/active entry points, allowlist exclusion, preserved config policy, and setup without the engine. OpenCode discovery evidence is recorded in release validation; no provider invocation or live Figma writes are needed.
