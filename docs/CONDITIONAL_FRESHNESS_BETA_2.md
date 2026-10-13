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
performed for this repair. The old plugin was deliberately closed and the bridge
confirmed `plugin not connected`. The user then imported the canonical repository
manifest and confirmed reconnection. Its main/UI paths resolve to the exact approved
files above; health and normal document reads passed after reconnection. This is
intentional manifest activation, not an inference from rebuilding a file. The
current toolset has no remote in-memory bundle checksum; identity is established
by the confirmed manifest import, verified artifact paths/hashes and reconnect.

Post-activation `/figma/doctor`: PASS, 2 Figma reads and zero writes. Fresh live
source regression: 24 read calls and zero writes, two independent double captures
with identical fingerprints. Runtime source hash:
`3104da00c58fac6c4e556fc3c9dbacf5497411305383da48390d619c48b65a53`.
Full-page before/after hash:
`42e8efb7cb579d7320c9b148c259459a3fa4c28285c4773dffe500d09ab0c23c`;
five scoped reaction arrays also match. Source is AVAILABLE/STABLE; browser-export
freshness remains UNVERIFIED because there is no export. No browser was regenerated.

Source commit `6b5f7ee51beb24f72c88d9931c0fd349261f743a` was committed and pushed;
[all three hosted CI jobs passed](https://github.com/Chammy01/figma-designer-standalone/actions/runs/38339430001).
Clean archive/bootstrap and release-package extraction/setup were repeated against
that exact commit and passed. The approved bundle's post-activation fixture suite
also passed all 86 hardening/variants/source tests; MCP catalog stayed at 106 tools.
Final validation metadata is committed separately and its exact CI/committed-source
package are checked before publishing Beta 2. Private snapshots/build paths are excluded.
Native stateful playback is not part of this release: the connected plan still
rejects SET_VARIABLE and CONDITIONAL authoring. No live stateful write was retried.

FIGMA_STATEFUL_VARIABLES: HOLD
