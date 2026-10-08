# Troubleshooting

Find the message you see. Share version/error text through the Setup Problem form after removing private paths, credentials, and design data. No private Figma file is required.

## The Figma plugin says Disconnected

**What it means:** The plugin cannot reach the local project session.

**What to do:** Keep Figma and the plugin open. Start `opencode` from the extracted folder. Wait, then reopen the plugin if needed and run `/figma/doctor`.

**Technical details:** Default endpoint is localhost port 1994; check duplicate sessions and project config before changing any ports. Do not kill unrelated processes.

## `/figma/design` is not found

**What it means:** OpenCode has not loaded the project commands.

**What to do:** Close/reopen OpenCode from the folder containing `.opencode`. Check that the entire Release ZIP was extracted, including hidden folders. Enter the slash command in OpenCode chat.

**Technical details:** Nested `.opencode/commands/figma/design.md` exposes this command. Check OpenCode compatibility and command discovery.

## OpenCode says MCP disconnected

**What it means:** The local connector did not start or lost its plugin connection.

**What to do:** Run setup again without install flags and follow the FAIL lines. Check the executable exists; start the bundled plugin and rerun doctor.

**Technical details:** Inspect `mcp.figma.command[0]` in local `opencode.json`; it must point to this extracted folder. Numeric timeout 10000 is intentionally retained.

## The command timed out

**What it means:** The operation may still be running or may have partly completed.

**What to do:** Do not resend the whole design. Ask OpenCode to inspect the current Figma document, wait for stable state, preserve completed work, and continue only missing steps.

**Technical details:** Timed writes are indeterminate. Existing timeout budgets remain unchanged; release preparation does not enable a 120-second execution timeout.

## Figma didn't change

**What it means:** The request may have targeted another open page, not completed, or been read-only.

**What to do:** Check the active file/page, plugin connection, and OpenCode response. Doctor, QA, status, and browser commands do not write Figma. For design, ask it to inspect the requested production scope before retrying.

**Technical details:** Inspect node counts/state after any timeout before concluding no write occurred.

## The plugin is missing in Figma

**What it means:** The development manifest has not been imported or its folder moved.

**What to do:** Open a design file in Figma Desktop. Plugins → Development → Import plugin from manifest; select the bundled manifest again.

**Technical details:** Keep `manifest.json`, `dist/code.js`, and `dist/index.html` together. Development-plugin access may depend on your Figma environment.

## Browser test fails

**What it means:** The export did not satisfy one or more browser checks.

**What to do:** Read the failed checks. Complete states/interactive/motion/QA if needed, then export and test again. Preserve the existing output until you deliberately request regeneration.

**Technical details:** Tests exercise ON_CLICK NAVIGATE, hooks, reduced motion, asset bindings, and network restrictions; unsupported triggers/actions are reported separately.

## Playwright is missing

**What it means:** The local browser-test dependency or Chromium is absent.

**What to do:** Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -InstallDependencies -InstallBrowser` in the extracted folder.

**Technical details:** Dependency installation uses npm ci and the pinned lockfile; Chromium uses the installed local Playwright CLI. Internet/proxy/cache permissions can affect installation.

## I moved the project folder

**What it means:** The local executable path and Figma plugin import may still point to the old folder.

**What to do:** Keep the old folder until the new one works. Run setup in the new folder, edit only the existing config executable path if reported wrong, and import the new manifest. Restart OpenCode and the plugin.

**Technical details:** Setup preserves existing config; it does not automatically rewrite moved-folder configurations. Relative commands/rules remain portable.

## I updated and now it doesn't connect

**What it means:** Old and new config or plugin files may be mixed.

**What to do:** Follow [Updating](UPDATING.md). Import the plugin from the same new folder OpenCode uses, run setup/doctor, and retain the previous folder for rollback.

**Technical details:** Executable and plugin core must be the approved pair, verified against APPROVED_RUNTIME.json. Do not mix a marketplace/upstream build with this release.

## `/figma/status` says UNVERIFIED

**What it means:** There is not enough comparable evidence to establish freshness.

**What to do:** Keep the plugin connected and use the correct page. If the export is old/missing, deliberately run browser → browser-test → status. Read the evidence reason; do not treat a historical PASS as current.

**Technical details:** Offline, incomplete/unsupported source, legacy metadata, mismatched versions, or missing bindings cause UNVERIFIED. An empty first-use export is normal.

## `/figma/status` says STALE

**What it means:** Bound output or comparable live source changed since the recorded evidence.

**What to do:** Decide whether the new design is accepted. If so, export and test it again, then check status. Do not overwrite output merely to hide a failure.

**Technical details:** Local/source/overall freshness are separate. A browser PASS can coexist with STALE; timestamps alone cannot prove freshness.
