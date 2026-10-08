# Commands

Enter these in OpenCode chat while opened in the extracted project folder. Each `/figma/*` command selects `figma-designer`; ordinary chat retains `web-designer` compatibility.

## `/figma/setup`

Prepare/check local dependencies and the connection.

Technical scope: May install local Playwright/Chromium when missing; use setup.ps1 first. It uses read-only Figma checks.

## `/figma/doctor`

Find out whether you are ready to design.

Technical scope: Read-only health/document/local checks; follow repair guidance before design.

## `/figma/design`

Create a new editable page or requested production area.

Technical scope: Builds production only, in sections; inspect before writes.

## `/figma/revise`

Change a specific part of the current design.

Technical scope: Uses focused existing subtree updates and preserves unaffected layers.

## `/figma/states`

Create supported component appearances such as hover and pressed.

Technical scope: Production is read-only; writes the separate Component States library.

## `/figma/flow`

Wire a focused journey through existing screens.

Technical scope: A focused journey is not complete interface coverage; writes the separate runtime.

## `/figma/interactive`

Audit and build supported working behavior across the interface.

Technical scope: Uses Interactive App and verified source components; reports FIGMA_LIMITED and undefined behavior truthfully.

## `/figma/motion`

Validate and apply motion to existing interactions.

Technical scope: Changes eligible transitions only; preserves trigger/action semantics and null SCROLL_TO transitions.

## `/figma/qa`

Review the design and interface quality.

Technical scope: Zero Figma writes; reports unsupported or incomplete behavior.

## `/figma/browser`

Export the accepted runtime as a local browser interface.

Technical scope: Zero Figma writes; begin/finish source collection binds the export to live evidence.

## `/figma/browser-test`

Test browser navigation and export constraints.

Technical scope: Needs local Playwright/Chromium and an export; PASS is not complete business/state/visual validation.

## `/figma/status`

Compare saved test evidence with files and the live source.

Technical scope: Acceptance is separate from CURRENT, STALE, and UNVERIFIED; reads the live source without Figma writes.

## `/figma/version`

Show the system and runtime version information.

Technical scope: Public release v1.2.1-beta.1 differs from system 1.2.1, MCP 1.2.0-standalone-hardening, and schema 2.

## Suggested order

setup → doctor → design → revise. Once accepted: states → interactive → motion → qa. Use flow for a defined journey. Then browser → browser-test → status. Version is always informational. See [Known limitations](KNOWN_LIMITATIONS.md).
