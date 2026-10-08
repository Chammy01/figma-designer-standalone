# figma-mcp-go (fork) — Documentation

This `docs/` folder is structured so that any agent (Claude Code, Claude Cowork, Cursor, Copilot, generic LLMs with MCP support) can pick this up as a skill — or a human can read it linearly.

## Map

| File | Purpose |
|------|---------|
| **[cowork-mcp-guide.md](cowork-mcp-guide.md)** | **Agent Operations Guide — drop-in operating manual for any MCP-capable agent.** |
| [ROADMAP.md](ROADMAP.md) | Long-form vision and roadmap. Read first if you're new. |
| [architecture.md](architecture.md) | How the bridge, plugin, and Go server fit together. |
| [tools-reference.md](tools-reference.md) | Every registered MCP tool with examples. |
| [bug-fixes-v1.3.md](bug-fixes-v1.3.md) | The B-1 through B-8 surgical fixes. |
| [agent-toolkit-v1.3.md](agent-toolkit-v1.3.md) | The 28 new tools across Categories A–H. |
| [skill/SKILL.md](skill/SKILL.md) | Drop-in skill description for any compatible agent. |
| [skill/decision-tree.md](skill/decision-tree.md) | "Which tool when?" lookup table. |
| [skill/examples/](skill/examples/) | Canonical input/output pairs. |
| [recipes/carousel-slides.md](recipes/carousel-slides.md) | End-to-end carousel post workflow. |
| [recipes/design-system-bootstrap.md](recipes/design-system-bootstrap.md) | Set up Variables + Styles from tokens. |
| [recipes/edit-not-rewrite.md](recipes/edit-not-rewrite.md) | The patch-instead-of-redo workflow. |

## Versions

Current build: **v1.3.1** — fixes 4 bugs caught in real-world testing (HUG sizing crash, 3-char hex parser, patch_html silent failure, regenerate_slide destructiveness) on top of v1.3.0's 28 new tools and 8 `write_html` bug fixes.

## Quick start for an agent

1. Call `health_check` to confirm the plugin bridge is alive.
2. If you're creating new content, prefer `slide_template` (fastest), then `write_html` for bespoke layouts.
3. If you're editing existing content, **never delete-and-rewrite.** Use `inspect_node_as_html` → `update_node_props` or `patch_html`.
4. After any non-trivial write, call `get_recent_errors` to check for silent failures.

## Quick start for a human

```bash
# In the plugin folder
cd plugin && bun install && bun run build

# In the project root
go build ./cmd/figma-mcp-go

# Open Figma Desktop, run the plugin, then point your agent at the binary.
```
