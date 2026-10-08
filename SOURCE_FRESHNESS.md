# V1.2.1 automatic live source freshness

System release `1.2.1` (`1.2.1-standalone-source-freshness`), manifest/report schemas `2`, source projection `figma-browser-source-v1`, and fingerprint algorithm `canonical-json-sha256-v1` are separate version domains. Schema-2 additions are optional for reading older exports; missing comparable evidence is always source UNVERIFIED.

## Read-only architecture

The Node collector in `scripts/figma-live-source.mjs` uses the existing local leader at `127.0.0.1:1994/rpc`. Its transport allows only `get_metadata` and `get_node` with `browserSource: true`. The plugin's additive read mode returns a complete projection instead of the old lossy serializer. Ordinary get_node behavior, public MCP catalog, executable, and all write handlers are unchanged. No REST API, selection changes, or Figma writes are used.

Each collection performs two independent captures and accepts evidence only if their normalized fingerprints match. Missing/ambiguous runtime, missing reference, unsupported node type, nonfinite/incomplete data, read error, or a changing capture yields UNVERIFIED with a reason. The transport uses the existing follower's 35-second budget; no deployed timeout values change. Each request remains subject to existing bridge timing.

## Projection and dependency closure

The current page must have exactly one page-level SECTION named `Figma Designer — Interactive App`. All its descendants are captured, including hidden content potentially used by states. Its direct FRAME children are the exported screen inventory; nested frames are included as screen content, not inferred as separate routes. Non-frame helpers are also included when supported.

For each runtime INSTANCE resolve getMainComponentAsync, capture actual mainComponentId and parent componentSetId, and include its effective descendants/component properties/property references. Include every variant of each referenced family because browser export maps that family's complete state vocabulary into CSS/DOM. Include standalone source components too. Repeat this rule for nested instances in dependencies. Family metadata includes ID/name/property definitions and sorted variant IDs; library placement/layout is excluded.

Traverse full reactions, including nested actions/conditionals, and text node hyperlinks. Include every referenced destination outside the runtime as a dependency subtree (overlays, state components, scroll targets, and helpers); recurse into its components/reactions. Internal targets already belong to the runtime. Cyclic reference graphs are visited once per dependency root. Unrelated library families/components and production roots are excluded unless explicitly referenced. No components are resolved by name alone.

Collect variable aliases found in included node properties, paints/effects, styled text runs, and action structures. Include referenced variable ID/type/collection and all mode values; recursively include alias targets. Include referenced collections' mode IDs/names/default mode and SET_VARIABLE_MODE collections. Explicit/resolved node modes are filtered to this used-collection closure. Unused variable values and unused collections do not enter the fingerprint. If an imported/remote reference cannot be resolved, do not claim complete evidence.

The projection envelope contains document fileKey (explicit null if the API does not expose it), page ID, runtime ID/type/name/visibility and ordered children, sorted family/dependency/variable records, and collection mode metadata. File names and editor names outside this closure are not source identity. With unavailable fileKey, evidence is content/page/runtime-bound, not a globally authenticated file identifier.

## Included fields

- Node ID/type/name, explicit parent IDs, ordered children. Names remain included because export uses them for labels/semantic interpretation.
- Geometry: native Figma parent-relative x/y, width/height; rotation and relative transform. No legacy serialized bounds are used.
- Visibility, opacity, blend mode, clipping, masks and supported vector geometry; full paints including gradients/image hashes/transforms/filter settings; strokes, per-side weights, alignment/caps/joins/dashes; corner radii/smoothing; effects and their offsets/radii.
- Auto Layout direction/wrap, sizing/min/max, axis alignment, child sizing/alignment/growth/positioning, item/counter-axis spacing, padding, constraints, reverse stacking, and stroke participation. Scroll overflow settings are included.
- Text characters, font family/style/weight/size, alignment, line height/letter spacing, case/decoration details, resize/truncation/line limit, paragraphs/lists, hanging punctuation/list behavior, leading trim, hyphenation, OpenType settings and hyperlinks. Ordered styled text runs preserve mixed typography/fills and per-range variable bindings.
- Instance component IDs/family IDs, variant and component property values, component property definitions/references, and effective descendant properties. Legal overrides are represented by their actual values; editor override flags are unnecessary.
- The full ordered reaction objects on every included node: source is the containing node ID; trigger, singular/plural actions, destinations, subtype, transition, duration, easing, preserve-scroll, overlays, and variable/conditional data are retained, including explicit null SCROLL_TO transitions. Fingerprinting does not change semantics or claim all actions are tested by Playwright.
- Overlay placement/background/interaction properties; referenced variable/mode/alias closure as defined above. Atlas currently has no variables or external overlay dependencies; fixtures exercise these paths.

## Coordinates and exclusions

All descendant x/y are parent-relative native properties. Each routed screen and each standalone dependency root has x/y and relative-transform translation normalized to zero, preserving width/height, rotation and transform linear terms. Canvas placement between separate routed screens/library variants is not browser layout. Runtime SECTION position, dimensions and chrome are editor organization; its identity/order/visibility remain included. Do not subtract page-absolute legacy bounds from parent-relative children.

Excluded: viewport/zoom/selection; editor panels, plugin UI and connection display; timestamps, metrics and machine paths; unrelated roots/library/variables; canvas translations described above; descriptions, plugin/shared-plugin debugging metadata; export settings, locked/expanded state, style IDs/names when effective paint/text/effect values are already captured; editor component override bookkeeping; text glyph outlines and primitive fill outlines (HTML uses text/shape properties). VECTOR/BOOLEAN_OPERATION geometry remains included. Unsupported node types such as video, nested SECTIONs, or unavailable reference data fail safely rather than disappear.

Unknown fields outside the explicit supported browser field list are not silently assumed supported. Adding a browser-consumed field or changing closure/normalization after release requires a new sourceProjectionVersion; old projections then become UNVERIFIED until exported again.

## Canonicalization

Projection normalization precedes the existing canonical algorithm; v1 hash semantics are unchanged. Pixel/typography/layout/radius/spread fields, degrees, relative-transform translation, and PIXELS/PERCENT value objects round to three decimal places. Other numbers (colors, opacity, transition seconds, transform linear terms, etc.) round to six. Negative zero becomes zero; nonfinite/unrepresentable JSON fails. Absent inapplicable native properties are omitted, explicit null remains null, and Figma mixed markers become `{mixed:true}` with concrete text runs/per-side radii/weights where applicable. No timestamps/metrics are hashed.

This is fixed-grid quantization, not pairwise epsilon comparison: noise inside the same rounding bucket is ignored, meaningful changes crossing buckets invalidate; boundary-adjacent noise can still cross a bucket. Future precision changes require a projection version. Tests cover float32 coordinates, transform translations, line heights and durations.

`canonical-json-sha256-v1` sorts keys lexicographically, preserves meaningful array order, serializes compact UTF-8 JSON using finite JSON numbers/strings, and computes lowercase SHA-256. Dependency/family/variable and mode collections use explicit codepoint ID ordering. Child/paint/reaction/action/text-run arrays retain order.

Fixed vectors: `{b:2,a:1}` -> `43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777`; normalized `{b:0.15000000596,a:123.9999999}` -> `{a:124,b:0.15}` -> `1ad4b277012d3731f2b44ed16c786c6ef9d2ef1b8e1906abc8c264556558577f`.

## Export sequence and fields

1. Run `node scripts/figma-browser-source.mjs begin`. Two stable live reads create `figma-source.json` with normalized projection, fingerprint, metrics and a random UUID exportRunId. An unavailable read does not overwrite an older snapshot or generate UI.
2. Generate the browser interface using that projection; put the exact run ID into the new schema-2 manifest. Do not replace existing UI merely to verify freshness.
3. Run `node scripts/figma-browser-source.mjs finish`. Read the live source twice again; verify snapshot fingerprint, run ID, runtime and exact screen IDs; write additive manifest bindings.

Manifest additions: systemVersion, exportRunId, sourceFingerprint `{algorithm,sha256}`, fingerprintAlgorithm, sourceProjectionVersion, sourceRuntimeId/name, sourceFingerprintBefore/After, sourceExportState and sourceEvidenceReason. STABLE means comparable before/after fingerprints matched. Different source produces STALE and `SOURCE_CHANGED_DURING_EXPORT`, retains before/after evidence, and exits nonzero; incomplete/incompatible evidence produces UNVERIFIED. No automatic retry/regeneration or Figma write occurs.

Run IDs link source snapshot/manifest/report. They contain no user data and are neither Figma transaction IDs nor proof that every generation step was atomic. Two matching reads are point-in-time evidence, not a transaction or permanent lock.

## Browser-test and status

`node scripts/figma-browser-test.mjs` automatically captures live source before and after browser behavior tests. It records export fingerprint/run/projection bindings, final live evidence and earlier live evidence separately from acceptance. Source failure/mismatch does not suppress navigation results or turn acceptance into FAIL. The final stable live comparison determines source freshness as of that read. Acceptance marker stays FIGMA_BROWSER_TEST PASS/WARN/FAIL; separate SOURCE_FRESHNESS, LOCAL_FRESHNESS and OVERALL_FRESHNESS markers follow their own evidence.

Reports bind every exported file/asset (including figma-source.json), raw manifest hash, source fingerprint, exportRunId, sourceProjectionVersion, runnerVersion and systemVersion. The report itself is excluded from asset hashes. Local changes during testing and later asset modification/addition/removal are detected. Links are rejected. Existing V1.2 binding tests remain.

`node scripts/figma-browser-status.mjs` always collects live evidence and reads local output without writes, including when artifacts are missing. It reports connection, fingerprint availability, file presence/schema, last run ID, acceptance and each freshness dimension. Saved snapshot arguments are rejected; they cannot impersonate live evidence.

| Evidence | Classification |
| --- | --- |
| Current asset/manifest/run/projection/runner/system report bindings match | local CURRENT |
| Bound local files/identity changed | local STALE |
| Missing/old/incomplete/unreadable report bindings | local UNVERIFIED |
| Stable schema-2 export and valid same-version live projection fingerprints/runtime identity match | source CURRENT |
| Comparable fingerprints differ, or comparable export is explicitly unstable | source STALE |
| Missing live/export evidence, legacy, algorithm/projection mismatch, incomplete/failed/changing read | source UNVERIFIED |
| Either freshness dimension is STALE | overall STALE |
| Both are CURRENT | overall CURRENT |
| Otherwise | overall UNVERIFIED |

Acceptance remains independent. PASS/local CURRENT/source STALE/overall STALE is valid. A current FAIL is current evidence of broken behavior. Legacy historical reports display LEGACY_PASS/LEGACY_FAIL with UNVERIFIED source; deliberate legacy browser testing stays WARN. No timestamp or matching node ID proves freshness.

## Verification and limits

Run `npm test`, `npm run test:source` (Bun), and browser integration fixtures. The source suite covers content/style/geometry/reactions/component changes, dependency closure, float normalization, exclusions, version incompatibility, export races, saved evidence binding, offline status, and zero-write guards. Packaged dispatcher tests also retain hardened reactions/variants.

Live Atlas validation is read-only. Metrics report unique nodes inspected per capture, referenced components/families/variables, normalized projection bytes, fingerprint cost, plugin read cost and total two-read collection cost. It does not require a complete-document read for regular source collection.

Freshness proves comparable source identity, not exact visual fidelity, every state outcome, business logic, or transactionality. Existing browser coverage limitations remain. Live reads inspect the current page's canonical runtime; another active page without it is UNVERIFIED. Filesystem assets/fonts outside the bound export, unsupported Figma features, concurrent ABA edits, and edits after the final read cannot be certified by this point-in-time check. Preserve the interface and explain insufficient evidence instead of inventing fields or deleting output.
