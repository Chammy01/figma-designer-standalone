# Known limitations

- Figma is not a full application runtime. Free text entry, persistence, authentication, backend search, and business data may need real application code.
- Some controls are `FIGMA_LIMITED`: a truthful supported simulation is provided, with its limits reported. Undefined behavior remains intentionally inert; missing content is not invented.
- Browser PASS covers tested navigation and constraints, not complete business logic, state behavior, or visual correctness. Some state checks are hook-only; unsupported triggers/actions are reported.
- Source freshness is point-in-time evidence. Two matching reads cannot rule out concurrent ABA edits or later changes. Missing comparable evidence is UNVERIFIED. PASS and freshness are independent.
- Visual regression is not complete yet. Human inspection of typography, layout, and interaction fidelity remains needed.
- The current beta is Windows x64-focused. Other systems and Windows ARM64 are not validated for the bundled MCP executable.
- A timed-out write is indeterminate. Inspect stable live state and continue only confirmed missing work; do not blindly retry.
- Provider availability, AI output quality, usage limits, and cost are outside the bundle. The preserved model needs a real first-use availability check.
- Contributor TypeScript checking has known baseline errors; passing unit suites do not erase them.
- This candidate still needs a root license decision, a configured private security channel, and a real clean-machine beginner test before public launch.

- The public MCP binary uses a validated path-trimmed build. The optional Impeccable engine workflow is excluded; core Figma commands do not require it. See [Privacy scan](PRIVACY_SCAN.md) and third-party notices.
