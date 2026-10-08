# Contributing

Start with [Development](docs/DEVELOPMENT.md). Prerequisites: Node 20+ (CI 24.15.0), npm, Bun 1.4.2, Go 1.26.1. Figma Desktop is needed only for deliberate live integration validation, not ordinary CI.

Run `npm ci`, `npm test`, `npm run test:hardening`, `npm run test:source`, and the plugin `bun install --frozen-lockfile` / `bun test` suite. In vendor/figma-mcp run `go test -count=1 ./...` and `go vet ./...`. Browser integration requires Chromium and `npm run test:browser`. Include targeted meaningful regressions and syntax/static checks for changed files; see Development for packaged dispatcher verification.

The vendor is pinned at `5806e71b8fd4bad97671038a0b010f04df1aaa41` with local combine_as_variants, hardening, and source-collector changes. Do not reset/update it, mass-format it, normalize its EOL, or regenerate unrelated lockfiles. Preserve notices. Changes to MCP/plugin behavior require an explained before/after case, regression coverage of malformed-input/no-write paths and valid behavior, exact binary/core identity, paired rebuild/activation/rollback review, and explicit live validation limits. Changing projection semantics requires a projection version decision; packaging metadata must not rewrite schema versions.

Once the private repository is created, discuss focused changes in an issue, branch/fork as access permits, and submit a PR with the supplied template. Keep private Figma files, credentials, outputs, and machine paths out of changes. State tests run, whether writes/vendor/runtime changed, rebuild requirements, and docs updates. Avoid unrelated cleanup.

Project-owned code and documentation use the root [MIT License](LICENSE). Preserve all third-party copyright, license, and notice texts; see the [resolved license decision](docs/LICENSE_DECISION.md).
