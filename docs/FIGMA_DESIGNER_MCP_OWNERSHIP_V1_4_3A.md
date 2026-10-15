# Figma Designer MCP ownership — V1.4.3A

## Purpose and current validation

Main adopts owned [Chammy01/figma-designer-mcp](https://github.com/Chammy01/figma-designer-mcp),
pinned at `a0b2e1c3e2ab2dd37c512fc3edeacb77a785a418`. No new MCP features are enabled. Native read/write/component/prototype/export/QA/app acceptance is complete.
Final integration CI is reported with the exact commit in the delivery; source/schema
equality alone is never treated as playback proof.

## Exact baseline and provenance

Standalone `fa2fd109b2ff5b10057582f981211514bf51bc14`, vendor tree
`da05aeb87d24cd3f241e249370534ba77fd83fbb`, 129 imported files. Historical upstream
`5806e71b8fd4bad97671038a0b010f04df1aaa41`, vkhanhqui/figma-mcp-go, including
tharuneswarj/figma-mcp work. Original MIT notice retained; Chammy01 notice applies
only to fork modifications. Import, rebranding and CI have separate commits.
Git line-ending conversion was corrected to preserve the approved vendor byte
conventions; identity-normalized comparisons cover all 101 runtime source files.

## Identity and integration

| Area | Owned identity / decision |
| --- | --- |
| Product/maintainer | Figma Designer MCP / Chammy01 |
| Go module | github.com/Chammy01/figma-designer-mcp |
| Binary | figma-designer-mcp.exe |
| MCP serverInfo.name/version | figma-designer-mcp / 1.0.0 |
| Plugin display | Figma Designer MCP |
| Plugin technical ID | figma-mcp-go retained to preserve imports |
| Address/handshake/networkAccess | unchanged; wildcard permission deferred |
| Client alias | figma retained for existing tool prefixes and read-only guards |
| Main source storage | vendor/figma-mcp, exact owned snapshot, no floating dependency |
| Local validation package identity | v1.2.1-ownership.1, no release/tag; not Beta 4 |
| System/app version domains | system 1.2.1; app V1.4.2 behavior retained |

## Behavior-equivalence evidence

The owned `docs/BEHAVIOR_EQUIVALENCE.json`, approved-catalog fixture and identity
contracts retain exact 106 tools, complete schemas/required/optional parameters,
combine_as_variants, protocol capabilities and stable unknown-method/tool errors.
All 101 runtime files compare after explicit identity literals/EOL normalization;
Go requirements/sum, plugin dependency resolutions, technical manifest fields and
network permissions remain unchanged. No new receipts, idempotency, revision tokens,
preconditions, handshake, reconnect architecture or capability profiles.

## Runtime provenance and rollback

Current hashes are recorded in APPROVED_RUNTIME.json. Previous exact hashes and
public Beta 3 identity remain in APPROVED_RUNTIME_BETA_3.json and the current
record's priorApprovedRuntime. Roll back the complete matched source/runtime/config
set to fa2fd109 or re-extract immutable Beta 3; never mix binary/plugin versions.
No Beta 3 asset is modified. Restore only the known executable command path when
switching, preserving provider/model/timeout configuration.

## Activation, live acceptance and tests

### Owned MCP validation

- 103 catalog/identity contracts: exact 106-tool catalog, 101 runtime source files,
  dependencies/manifest fields and protocol identity/errors.
- 275 plugin cases; 41 hardening/variants cases against source and again against
  the packaged dispatcher. Go tests/vet/build pass.
- Clean Git archive build and package extraction pass with frozen dependencies.
  A second independent pinned-source build produces byte-identical binary/core/UI.
- Hosted CI for owned commit a0b2e1c3e2ab2dd37c512fc3edeacb77a785a418:
  [all three jobs green](https://github.com/Chammy01/figma-designer-mcp/actions/runs/38680950279).

### Runtime hash rotation

| Artifact | New SHA-256 |
| --- | --- |
| `bin/figma-designer-mcp.exe` | `d64210d464b39d27e24861c399425a74780851c0a20fbefec5c7247124eab78d` |
| `vendor/figma-mcp/plugin/dist/code.js` | `95cfd61fce73ef51cce155a9bb33c43898dbfa8565af367f3c878e3d99d92dcf` |
| `vendor/figma-mcp/plugin/dist/index.html` | `74067837ed24279beaca0d95f1a822708ded8713b589bb1be4fce55d17a55f02` |

Previous approved executable/core/UI hashes remain verbatim in
APPROVED_RUNTIME_BETA_3.json and priorApprovedRuntime. No old hash is presented as
unchanged. The standalone storage path remains vendor/figma-mcp for existing
source imports; OWNED_MCP_SOURCE.json checks every file against the owned commit.
Original source EOL conventions are preserved rather than mass-normalized.

### Live acceptance

| Case | Observed result |
| --- | --- |
| A Connection | New binary owns bridge port 1994; native plugin displays Figma Designer MCP · Chammy01; health 1.0.0, connected/readable; approved exact hashes verified. |
| B Reads | Metadata, pages, full document, nodes, selection, viewport, components, styles and reactions pass. Six old/new binary read responses compare exactly. |
| C Writes | Disposable page 1028:758 only: native frame/text/fills/Auto Layout, rename/move/resize. App-created Ownership Note 1028:760 remains editable. |
| D Components | Component creation, verified instance source, swaps in both directions and combine_as_variants set 1028:797 pass. Actual mainComponentId/componentSetId read back; repeated-name first-match caveat retained. |
| E Prototype | Native Desktop playback observed Home→Details, Back, inherited hover darkening, centered modal open/close and smooth scroll to the existing child target. Canonical semantic durations read back within existing float tolerances. Vertical scroll context prepared only through native UI on the disposable frame. No readonly overlay setting was changed. |
| F Export | Two PNG exports both 400×360, 9,094 bytes; source/dependency collection captures the instance family and VERTICAL context. |
| G QA | Existing guarded workflow completed WARN: 5 working actions, 1 working state, 0 broken controls/edges, 1 unknown expectation. 17 inspection aliases + 6 collector reads; zero writes, unchanged whole-run page/source hashes. Code Mode attempt was blocked before execution; no guard bypass. |
| H App | Source app launch recognizes owned hashes. Actual design prompt succeeds; live model switch to Gemini 4 Argon and restore to Cat Jam Free retains the same session. Provider/recovery/dashboard UI suites pass. Native /figma/doctor: PASS. |

Playback is bounded manual observation, not a timing measurement or exhaustive
renderer conformance claim. Activation is evidenced by the known imported source
path, exact disk hashes, new visible branding, live diagnostic version and native
behavior. There is no cryptographic loaded-bundle attestation in the unchanged
protocol; V1.4.3B may add one independently.

### Cleanup and production integrity

The disposable page, runtime, components and reactions were completely removed.
Only original Page 1 remains, 2,385 nodes, 20 components, zero component sets,
7 styles and zero variables. Original page fingerprint:
`a68cfd586576aa6f2d199c8edd4e46c541b5d7e9a22508a16781e8fff3712be6`.
Original runtime source fingerprint:
`129cd01193e0d6d52a3c992380c48ed41650ea372316dadbd30d22ece81fcd27`.
Two final source captures agree. Production/canonical artifacts are unchanged;
protected original production received zero writes. All authorized native writes were confined to the disposable page. The original source-bound QA cache
was restored byte-for-byte after the disposable test, retaining its real earlier
timestamp; the new fixture QA is recorded separately, never substituted as a new
production QA result. No write timeouts or blind retries occurred. One fixture
name-lookup assertion matched a frame and its text; inspection preserved completed
work and resumed only the missing fixture steps.

The existing browser preview remains source-current; canonical browser testing
retains the same five MEDIUM stroke-width fidelity findings and FAIL. No finding,
threshold, font or renderer was changed to manufacture a green migration.
Machine-readable comparison and acceptance: OWNED_MCP_EQUIVALENCE.json and
OWNED_MCP_LIVE.json. These contain normalized evidence, not OpenCode context or
raw private documents.

### Figma Designer regression

484 Node contracts (including 7 ownership checks), 275 plugin cases, 153 hardening/
variants/source cases (includes the 41 copied owned compatibility cases), 8 browser
integration, 9 fidelity visual, 17 app UI, 33 setup fixtures and one installed
OpenCode timeout contract: **980 suite cases**. Dispatcher checks also rerun on
the rebuilt bundle. Go tests/vet, privacy, exact source pin, approved runtime,
clean source archive, extracted package/repeated setup without Go/Bun and extracted
app startup/shutdown are additional gates. Final source/CI identity is supplied in
the delivery. No public release/tag or Beta 4 is created.

## Boundaries and follow-up

V1.2.5 remains **HOLD**; no SET_VARIABLE/CONDITIONAL workflow or browser state
parity is enabled. Stable ID, client alias, internal cmd directory and historical
attribution retain old technical strings intentionally. V1.4.3B should audit
wildcard permissions and introduce narrowly tested receipts/preconditions and
reconnection improvements separately. No desktop installer, stable release or
Beta 4 is published here.
