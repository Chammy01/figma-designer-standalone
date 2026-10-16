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
