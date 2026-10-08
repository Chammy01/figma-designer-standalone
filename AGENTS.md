# Figma Designer Standalone

OpenCode uses the local Figma MCP executable, localhost WebSocket bridge, and Figma Desktop development plugin to create editable native layers. Native Orca is not required. Do not replace this integration with the Figma REST API.

Read `rules/figma-standalone-rules.md` and `rules/figma-design-rules.md` before every Figma task. They govern ownership, source inspection, authoring, revisions, and partial-write recovery.

Resolve `bin/figma-mcp-go.exe` relative to this project. The default bridge is `127.0.0.1:1994`. Run health_check, inspect the current document, plan the requested sections, create section-by-section using higher-level HTML operations, inspect generated sections and repair material layout defects. Prefer Auto Layout. Default desktop width is 1440px with about 1200px content and vertical page growth.

For revisions, identify and inspect the smallest affected subtree, preserve unaffected layers and IDs, use patch_html or focused updates, and re-inspect. Do not duplicate existing sections or rebuild entire pages for small edits.

A timed-out write is indeterminate: read back, wait for stable state, preserve valid completed work, and retry only confirmed missing work. Read the actual error; retry a confirmed transient failure once or use a smaller operation. Retry a font-loading text failure once before another approach. Report significant remaining defects.

For release engineering, preserve the approved runtime and pinned upstream source, including combine_as_variants. Do not mass-format vendor code or change timeouts, model/default agent, reaction/motion semantics, or fingerprint versions as release metadata changes.
