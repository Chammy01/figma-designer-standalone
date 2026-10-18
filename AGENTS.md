# Figma Designer Standalone

## Shared AI Memory

Before substantial work, read the global memory:

- `E:\AI-Memory\USER_CONTEXT.md`
- `E:\AI-Memory\WORKING_STYLE.md`
- `E:\AI-Memory\TOOLING.md`
- `E:\AI-Memory\GLOBAL_PROTOCOL.md`

Then read the project memory:

1. `ai-memory/START_HERE.md`
2. `ai-memory/PROJECT_STATE.md`
3. `ai-memory/CURRENT_TASK.md`
4. `ai-memory/HANDOFF.md`
5. `ai-memory/DECISIONS.md`
6. `ai-memory/AI_PROTOCOL.md`

Inspect `git status` and `git diff` before assuming what a previous agent completed.

Repository state, tests, and validation results are more authoritative than stale memory notes.

## Project Integration

OpenCode uses the local Figma MCP executable, localhost WebSocket bridge, and Figma Desktop development plugin to create editable native layers. Native Orca is not required. Do not replace this integration with the Figma REST API.

Read `rules/figma-standalone-rules.md` and `rules/figma-design-rules.md` before every Figma task. They govern ownership, source inspection, authoring, revisions, and partial-write recovery.

Resolve `bin/figma-designer-mcp.exe` relative to this project. The default bridge is `127.0.0.1:1994`. Run health_check, inspect the current document, plan the requested sections, create section-by-section using higher-level HTML operations, inspect generated sections and repair material layout defects. Prefer Auto Layout. Default desktop width is 1440px with about 1200px content and vertical page growth.

For revisions, identify and inspect the smallest affected subtree, preserve unaffected layers and IDs, use patch_html or focused updates, and re-inspect. Do not duplicate existing sections or rebuild entire pages for small edits.

A timed-out write is indeterminate: read back, wait for stable state, preserve valid completed work, and retry only confirmed missing work. Read the actual error; retry a confirmed transient failure once or use a smaller operation. Retry a font-loading text failure once before another approach. Report significant remaining defects.

For release engineering, preserve the approved runtime and pinned upstream source, including combine_as_variants. Do not mass-format vendor code or change timeouts, model/default agent, reaction/motion semantics, or fingerprint versions as release metadata changes.

## Memory Maintenance

After meaningful progress:

- update `ai-memory/CURRENT_TASK.md`
- update `ai-memory/HANDOFF.md`
- update `ai-memory/PROJECT_STATE.md` when the broader project state changes
- record significant durable decisions in `ai-memory/DECISIONS.md`

Do not wait until a clean session ending before maintaining useful handoff state.

If work is interrupted by a usage limit, crash, or harness switch, the next agent must reconstruct the actual state from:

- project memory
- `git status`
- `git diff`
- repository files
- Figma document state when relevant
- tests or validation
- Graphify when configured

Do not discard unfinished work without first inspecting it.

## Graphify

Once Graphify is configured for this repository:

- use it for structural discovery, dependency tracing, and impact analysis
- prefer targeted Graphify queries before broad repository exploration
- refresh the graph after meaningful structural changes when required by the configured workflow

Graphify output is derived data and does not replace Git, repository files, or project decisions.

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed Graphify skill or instructions before doing anything else.

Rules:

- When `graphify-out/graph.json` exists, run `graphify query "<question>"` before your first grep, search, or source-file read for a codebase question, and put this rule in every subagent prompt that explores code.
- Read raw files only for lines the graph or an earlier read already located.
- Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- Dirty `graphify-out/` files are expected after hooks or incremental updates; dirty graph files are not a reason to skip Graphify.
- Only skip Graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed `graphify-out/graph.json` is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
