# Desktop local data

The V1.4.4 desktop candidate uses `%APPDATA%/Figma Designer/` for its default
workspace, model/provider IDs, bounded events, window bounds, validation output and
safe interrupted-run metadata. OpenCode owns credentials/session storage; the app
does not copy credentials into its payload, logs, renderer or package inventory.
Figma owns development-plugin clientStorage receipts. They are never cleared by
desktop restart/uninstall. Generated previews remain on a separate loopback origin.

Uninstall preserves user data and provider credentials. No telemetry, automatic
update, runtime executable download or startup-on-login is introduced. See
[desktop storage and limits](FIGMA_DESIGNER_DESKTOP_V1_4_4.md) and the existing
[release privacy scan](PRIVACY_SCAN.md).

## Agent activity

Presence uses fixed owned messages and allowlisted enums. It does not read reasoning, prompts, tool inputs/output, document text, paths or receipt payloads to create progress copy. Ten coalesced entries per run stay in the existing bounded in-memory run list; only existing safe recovery metadata persists. Restart reconstructs one static outcome, without replay. No remote art, telemetry, Pixel Agents service or new IPC is added.

## Browser test artifact guard privacy

The Browser Test artifact guard and workspace capability profile enforce strict data boundaries:

- **Bounded, sanitized blocked evidence:** Denied operations record at most 32 entries with allowlisted category enums. The `relativePath` field only records known fixed required input artifacts (`.figma-designer/browser-prototype/<name>`); arbitrary filenames, command lines, script contents, prompts, model reasoning, or absolute machine paths are never captured.
- **Content-free integrity snapshots:** Before-and-after snapshots record only relative paths, file sizes, and SHA-256 hashes. File contents and diff payloads are never stored in reports or run records.
- **Workspace-wide capability restriction:** Generic shell, Code Mode, Node, PowerShell, delegation, and formatters are completely disabled across all workspace sessions, preventing arbitrary script execution, environmental inspection, or unapproved network exfiltration.

## Monochromatic UI overhaul privacy

V1.5.2 monochromatic styling uses exclusively local CSS custom properties, self-contained SVG icons, and existing local static art assets. It adds zero remote fonts, telemetry, external icon CDNs, remote trackers, or new IPC methods. All credentials, API keys, and sensitive environment variables remain strictly redacted and server-side.

## Structural UI rebuild privacy (V1.5.3 source)

The V1.5.3 UI architecture rebuild maintains all existing privacy and data boundaries. The top workflow bar, Studio revision ledger, compact activity strip, and footer status disclosure consume only existing in-memory state and sanitized backend metadata. Status details and sanitized error messages remain unchanged; no unsanitized system paths, raw command executions, or model chain-of-thought are exposed. No remote fonts, tracking, telemetry, or new IPC capabilities are introduced.
