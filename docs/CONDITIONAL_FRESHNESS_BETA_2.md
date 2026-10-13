# Conditional source-freshness patch — Beta 2

Scope: the reviewed `references()` repair, exact regression fixtures/tests, truthful
V1.2.5 HOLD evidence, source documentation, and required approval/package metadata.
No stateful command, routing, planner phase, QA feature, browser parity, writer,
Go source, UI, timeout, semantic motion or component behavior changed.

## Provenance and reproducibility

Upstream remains pinned at `5806e71b8fd4bad97671038a0b010f04df1aaa41`.
Figma Designer carries the approved local read-only collector patch; upstream is
not represented as containing it. Bun 1.4.2 and the unchanged frozen lockfile were
used in two fresh staging directories, with fresh dependency installations.
Both complete plugin builds produced byte-identical core and UI artifacts. A third
fresh baseline build, changing only the collector back to public main's source,
reproduced the previous approved artifacts. The resulting bundle diff is solely
the concrete-alias/operand-wrapper branch.

| Artifact | Previous SHA-256 | Approved Beta 2 SHA-256 |
| --- | --- | --- |
| MCP executable | `bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f` | unchanged |
| Plugin code.js | `24bb648c96cc7288938e87aedc07f44de48d9ea25fe9f19f3256633c31dad849` | `273e20f56b80e9a7d995962948b1bb93e5cc1dfa19471ecd834ca7308d7da941` |
| Plugin index.html | `661fb49dd3ca38ed4648e70858822f59f565093718d02143c6b1b85628f054ee` | unchanged |

`previousApprovedPluginCodeSha256` preserves the old plugin digest independently
of `previousApprovedMcpSha256`. `publicBuild.source` describes pinned upstream plus
the approved local collector patch and unchanged Go runtime. Public release is
`v1.2.1-beta.2`; system stays `1.2.1`, MCP stays `1.2.0-standalone-hardening`.
Beta 1 assets are not overwritten. Packaging checks VERSION against approved
release identity; archive acceptance derives that same package name.

## Collector behavior

Pinned Plugin API types define a concrete alias with `id: string`, and VariableData
operands that can wrap that alias in `value`. Valid wrappers recurse; only concrete
nonblank string IDs are collected. Malformed concrete aliases still fail closed.
SET_VARIABLE, SET_VARIABLE_MODE, property bindings, transitive mode aliases and
nested conditional actions/destinations retain their read-only closure. Exact
conditional fixtures capture successfully instead of resolving an undefined ID.
Unused variables stay excluded and referenced values affect fingerprints.
Projection and canonicalization versions stay unchanged: this restores documented V1.

## Validation record

Local release-grade validation passed before committing:

| Check | Result |
| --- | --- |
| npm contracts (all existing capability/guard/router/planner/design contracts) | 171 PASS |
| Pinned plugin unit tests | 275 PASS |
| Hardening/variants/source tests | 86 PASS |
| Same tests through approved code.js dispatcher | 86 PASS |
| Browser fixtures | 6 PASS |
| Installed OpenCode compatibility | 1 PASS |
| Setup fixtures | 26 PASS |
| Go test -count=1 ./... and go vet ./... | PASS |
| Source/release/privacy/config/hash gates | PASS |
| Exact staged-tree clean source archive bootstrap | PASS |
| Clean package/extraction and setup without Go/Bun | PASS |
| MCP initialization, complete 106-tool catalog, combine_as_variants | PASS |

Clean source and extracted-package setup verified all three approved artifact hashes,
local executable paths, and idempotent repeat setup. The full exact conditional
fixture passed against the approved compiled dispatcher. No Figma mutation test was
performed for this repair. Activation is pending dismissal of a Windows Security
dialog covering Figma; it must not be inferred from changing code.js on disk.
Doctor, actual loaded-bundle proof and post-activation live capture remain pending.
No repaired-runtime PASS or public release is claimed before those checks and exact
commit CI succeed. Private snapshots and build paths are excluded.
Native stateful playback is not part of this release: the connected plan still
rejects SET_VARIABLE and CONDITIONAL authoring. No live stateful write was retried.

FIGMA_STATEFUL_VARIABLES: HOLD
