# Updating without losing your work

1. Keep the current folder as a rollback copy. Save your Figma file normally; it lives in Figma, not this ZIP.
2. Extract the new Release ZIP into a **new** folder. Never overlay a working folder blindly.
3. Back up your local `opencode.json`, any private provider configuration, and `.figma-designer/browser-prototype/` output separately. Review design data before sharing any backup. Do not commit credentials or generated private output.
4. Run setup in the new folder with `-Configure -InstallDependencies -InstallBrowser`. Inspect generated config and merge intentional local settings manually. Change only the concrete executable path for the new folder; retain the approved timeout policy and your provider choices. Do not copy the old absolute path unchanged.
5. Import the development manifest from the new folder and run that plugin. Stop the old project session normally; start OpenCode in the new folder. Do not mix executable/plugin versions.
6. Run `/figma/doctor`, then `/figma/version`. Keep the old folder until this works.
7. Copy wanted browser output to the new folder only after reviewing it. Existing evidence may be STALE or UNVERIFIED; deliberately export/test again to establish new evidence. Do not relabel historical PASS as current.

Rollback: reopen the previous folder/session and its previous development-plugin import as a pair. Do not change Figma layer ownership or rebuild your designs as part of an update.
