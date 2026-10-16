# Figma Designer Windows desktop candidate — V1.4.4

This is an unpublished local/CI candidate. Acceptance evidence is recorded in the Beta 4 readiness record; no Beta 4 release/tag is created.
The package is **UNSIGNED**; a new publisher/application may trigger SmartScreen.
No security setting or warning bypass is part of setup.

## Architecture and versions

Electron 44.7.2 is a shell, not another orchestrator. One sandboxed window displays
the existing Web UI. A bundled Node 24.15.0 sidecar runs the existing HTTP service;
that service owns OpenCode 2.0.28 and uses the existing agents/commands/guards.
MCP remains pinned to c95e264350ecd4f13f11f4012cc13dcc96edc927, product 1.1.0,
bridge protocol 2, 108 tools. The three approved runtime hashes are unchanged.
Desktop version 1.4.4 is separate from system 1.2.1 and the unpublished source
checkpoint. Beta 3 and its published assets are untouched.

`npm run desktop:package` prepares an explicit allowlisted payload and builds per-user
NSIS and portable ZIP candidates. `npm run desktop:build` builds the unpacked app;
`npm run desktop` launches the prepared development payload. `npm run app` still
serves the source preview. Packaging never publishes a release or downloads code at
end-user startup. Go, Bun, npm and an external Node installation are not required.
Build-time tool versions/integrities are locked; upstream licenses are included.

## Startup, resources and ownership

Single-instance locking happens before service/process creation. A second launch
focuses the first window. The normal Windows title bar has minimize/maximize/close;
initial 1320×860, minimum 900×650. Off-screen saved positions reset.

Startup verifies the packaged runtime and tools, prepares the user workspace,
starts the local service, starts the bundled engine, and uses existing status reads
to check MCP/plugin/document and AI readiness. Service errors, hash mismatch,
engine failure, incompatible peers and unavailable documents remain distinct.
No startup path authors Figma content. Another incompatible runtime is explained;
the app does not kill it. Check Again performs normal read-only status recovery.

The sidecar's IPC disconnect handler closes its HTTP/preview servers and only its
owned OpenCode process tree when the shell closes/crashes. Foreign OpenCode/Figma
processes are untouched. Completed native writes remain; close is not rollback.
An interrupted write may outlive a transport response and requires reconciliation.

Installed resources are independent of CWD. The importable manifest lives at
`resources/payload/workspace/vendor/figma-mcp/plugin/manifest.json` beside its real
dist files, outside ASAR. Settings → Figma Plugin Setup → Open Plugin Folder opens
only that fixed directory. Technical ID `figma-mcp-go` remains stable; an upgrade
at the same installation path preserves the import path. Plugin reload is still
required to activate a changed bundle. No plugin update is performed here.

## Storage, recovery and privacy

Desktop data is under `%APPDATA%/Figma Designer/`, not the installation directory:
window.json, desktop-status.json and a default workspace. Workspace state lives in
`workspace/.figma-designer/`: bounded app events, model/provider IDs, validation
evidence, browser output, and recovery.json. Credentials remain owned by OpenCode;
the shell exposes none. Native OpenCode session/credential locations are unchanged.

The checkpoint records only session/run IDs, mode, offset, state and fingerprints;
no prompt, result or credential. It is persisted before submission. Restart restores
the session reference, marks interrupted work uncertain, and runs existing receipt/
context reconciliation. Nothing is resubmitted. UNKNOWN receipts remain locked.
Missing/corrupt evidence cannot prove retry safety. Only the latest bounded recovery
record is retained; this is not a full conversation-history backup.

Plugin receipt storage remains Figma clientStorage: 500 entries, seven days, 4 MiB,
single active plugin, no global exactly-once guarantee. It is not moved or cleared
on app restart, upgrade or uninstall. File identity may remain session-scoped.

One app-owned default workspace is supported. There is no renderer path picker or
arbitrary filesystem API. User outputs survive immutable payload refreshes and
uninstall. OpenCode's existing project tool permissions remain the authoring boundary.
Transient diagnostics belong under `%TEMP%/Figma Designer/run-<UUID>`; startup
cleanup accepts only that naming/ownership boundary and age over one day. There is
no new browser renderer or diagnostic workflow in this milestone.

## Security and previews

Local service/preview bind only 127.0.0.1 with dynamic ports. Existing Host/Origin,
CSP, size limits and fixed routes remain. Renderer Node integration is off,
context isolation and sandboxing on, permission requests denied. There is no remote
module or generic shell/filesystem/MCP IPC. The only preload operation opens the
fixed plugin folder, gated to the main window and its exact local origin.

Main-window navigation stays on its own origin. The preview gets a separate window,
separate server origin, sandbox, no desktop bridge, and no arbitrary popups. External
HTTPS documentation links require explicit known hosts. Provider sign-in links are
registered only from the existing validated provider-setup response: at most eight
exact URLs for 15 minutes, in memory only; HTTPS or HTTP loopback, no credentials. The desktop-owned engine explicitly disables its updater. No updater/telemetry/startup-on-login is added.
Plugin wildcard network permission remains UNRESOLVED and unchanged.

## Install, upgrade, uninstall and validation

The assisted NSIS installer is per-user, without elevation or default desktop
shortcut. It creates a Start Menu shortcut and Add/Remove Programs entry. Upgrade
uses the same identity/install path. Uninstall removes application files/shortcuts;
user data and provider credentials are preserved, and Figma is not uninstalled.

Candidate outputs: Setup.exe, Portable.zip, SHA256SUMS.txt,
DESKTOP_PACKAGE_INVENTORY.json and DESKTOP_PACKAGE_VALIDATION.json. The inventory
checks exact approved assets, explicit source inputs, runtime tool versions and
forbidden capture/log/secret/config directories. The application payload and
installer-container reproducibility are recorded separately; neither is assumed.

Deterministic tests cover bounds/origins, hash rejection, shell security/IPC,
single-instance ordering, pre-submit checkpoint failure, interrupted restoration,
COMMITTED/UNKNOWN receipt recovery, metadata validation and cleanup boundaries.
Existing application/provider/model/guard/browser tests remain authoritative.
Live installed design/revision, guarded QA, Browser Test, restart, upgrade/uninstall,
process cleanup and protected fingerprints must be recorded before declaring PASS.

## Preserved limitations

V1.2.5 remains HOLD. Existing five stroke-width defects and font/complex-paint
limitations are not relabelled or hidden. Receipt bounds, large-page revision cost,
follower timeouts and session identity remain. This is Windows 10/11 x64 packaging;
other platforms, signing, auto-update, project selection and public Beta 4
publication are deferred. VM-clean install and antivirus availability are reported
separately from isolated local install; do not imply certification.

The uninstaller uses extended Windows paths for owned installation files, retaining NSIS's atomic rename/restore behavior without changing OS policy. Installation roots are limited to 100 characters because Windows CopyFiles can silently omit deep bundled files past MAX_PATH; the build rejects payload paths over 149 characters. An overlong destination is rejected before application files are written (NSIS may create an empty destination directory). Spaces, Unicode and long permitted paths are covered. An earlier unpublished candidate lacked this initialization and failed at a 261-character file. That failure is retained in acceptance evidence; it required the corrected same-identity uninstaller for cleanup. Normal upgrade acceptance uses candidates containing the fix.

## Final acceptance — 2026-10-17

The machine-readable [Beta 4 readiness record](https://github.com/Chammy01/figma-designer-standalone/blob/main/docs/BETA_4_READINESS.json) contains the complete changed-file list, exact candidate hashes, versions, test counts and A–K results. Its source commit is the artifact build source, not a claim that the later evidence-only commit was bundled. The readiness record is included in source archives, outside the installed payload, to avoid self-referential package hashes.

Final installer and portable extraction each matched 769 files. Fresh install, upgrade, uninstall and both executable launch tests passed from an OS temporary working directory with only System32 on PATH. The per-user test root contained spaces and Unicode and was 76 characters long. Uninstall removed application files and the shortcut, retained preferences/provider credentials, stopped owned processes and left Figma running. A separate native test closed the main window while its preview was open and confirmed the shell, service and engine stopped. No fresh VM or signing test is claimed.

Installed native design created two editable 640×480 screens; a same-session revision changed only the requested text and its native auto-generated name. The disposable runtime added two navigation actions. Guarded QA performed six reads, zero writes and reported WARN for two intentionally inert controls. Browser build passed 63 checks. The final bundled browser executed the existing two-screen fixture: routing, keyboard, history, local-resource and reduced-motion checks passed; the report correctly remained FAIL with five MEDIUM stroke-width findings, 199 font limitations and 86 complex-paint limitations. The native dashboard displayed those results. No pixel-parity success or motion timing for the older fixture is claimed.

Lost-response fixtures cover COMMITTED/UNKNOWN recovery and no automatic resubmission across all application modes. Two actual indeterminate writes (page creation and cleanup) were reconciled without blind retries. Cleanup's receipt confirmed COMMITTED. The disposable page was removed; only original Page 1 remains. A final four-read, zero-write check restored the exact original page SHA-256 `a68cfd586576aa6f2d199c8edd4e46c541b5d7e9a22508a16781e8fff3712be6` and source SHA-256 `129cd01193e0d6d52a3c992380c48ed41650ea372316dadbd30d22ece81fcd27`.

Local regressions passed 532 npm contracts, 328 plugin tests, 153 source/hardening/variants tests and 34 browser tests (1,047 test executions), plus Go tests/vet and clean source/archive/setup/package checks. All four hosted jobs passed for artifact source `26776b7fc366cf8fe3e5821f3dda15e68075424f`. Final-candidate Defender scans found no threats in either artifact. Two clean resource stages produced byte-identical 695-file payload inventories; installer/ZIP byte reproducibility is not claimed. A third-party Crashpad diagnostic file appeared beside an installed executable during native testing; it was not packaged, remained 332 bytes and was removed by uninstall.

This completes packaging acceptance, independently of existing fidelity defects. Beta 4 remains unpublished, Beta 3 remains untouched, and V1.2.5 remains HOLD. The next step is release-candidate review and a signing/publication decision.
