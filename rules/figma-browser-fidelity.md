# Browser fidelity contract 1.3.2

Validation reports differences; it never repairs Figma, generated HTML/CSS/JS or goldens.
The pure model consumes captured source and actual browser measurements. It performs
no I/O. The browser adapter uses existing hooks and local Chromium measurements.

Keep SOURCE_FIDELITY, BROWSER_VISUAL_REGRESSION and NATIVE_RENDER_PARITY separate.
Missing/unbound source is UNVERIFIED, never a fabricated PASS. A live design without
an explicitly accepted browser baseline has BROWSER_VISUAL_REGRESSION: UNVERIFIED.
Fixture screenshot success is not evidence of native Figma pixel parity.

Normalize source parent-relative coordinates to screen-local coordinates; ignore
root canvas translations. Normalize viewport DOM bounds by the actual screen origin
and ancestor scrolling. Rotation/scale/skew is uncertain, not an invented offset.
Screen-local modal geometry and viewport-centered overlay placement are separate.

For x/y/width/height the maximum absolute difference is MATCH at <=1 CSS px,
MINOR_DRIFT at <=3 px, otherwise MAJOR_DRIFT. Fixtures exercise each boundary;
accepted live geometry establishes that these thresholds do not hide major drift.
Minor drift is LOW; major drift is HIGH. Missing controls are BLOCKER. Wrong text
is HIGH; simple property mismatch is MEDIUM. Limitations and minor drift yield WARN;
BLOCKER/HIGH/MEDIUM yield FAIL. Stable sorting is severity, screen ID, node ID, code.

Compare exact directly exported text, simple RGBA fills/strokes (1 channel byte,
0.005 alpha tolerance), opacity, uniform radius, stroke width, font size and explicit
pixel line height (0.1 tolerance). Empty/unknown properties are not invented.
Complex paints/effects/masks and unmodeled graphic node types are limitations.
Meaningful source frames, text, instances and declared controls must have unique,
visible hooks. This is not a full vector renderer or complete decorative coverage.

CDP reports fonts actually used for glyphs, independently of the CSS family stack:
AVAILABLE_LOCAL / FALLBACK_USED / UNKNOWN. Record family/style, CSS stack, actual
fonts, line count and text-range bounds. No font downloads. Missing fonts are
FONT_FIDELITY_LIMITATION. Intrinsic fallback text sizing can be a limitation;
wrong explicit CSS bounds, content or type size still fail. Native line-wrap
equivalence is unknown without a rendered comparison.

Coverage denominators are the modeled nodes of declared source screens, not every
Figma layer. Report screens/nodes/text/controls compared and unsupported/font counts.
No overall accuracy score. Freshness remains independent; no visual result upgrades
STALE or UNVERIFIED source. The runner rebinds its existing report after testing.

Native reference: use only approved get_screenshot, requested FRAME, PNG, scale 1.
captureNativeReference validates identity, PNG dimensions and source fingerprint.
Collect stable source before/after; discard the reference if the source changed.
Align dimensions/crop/background before comparison. Never use UI/clipboard/REST.
The approved export lacks an explicit crop/background override; mismatched native
export bounds are UNVERIFIED. Native screenshots alone do not certify parity.

Fixture goldens: Windows, pinned Playwright Chromium, 800x600 CSS px, DPR 1,
Arial/system fallback, light scheme, UTC/en-US, reduced motion, static local content,
no network, disabled animations, hidden caret, settled routes/focus/scroll. Threshold
0.05, zero differing pixels permitted above that threshold. The default 0.2 missed
a white/gray boundary regression; the negative fixture verifies the tighter policy.
Explicit maintainer-only baseline creation uses --update-snapshots with positive
fixture tests; normal validation uses updateSnapshots: none. Negative tests refuse
baseline-update mode. CI never accepts new screenshots automatically.

Live captures are ephemeral/local, ignored and outside distributable inputs; do not
persist sensitive designs without explicit authorization. No raw screenshots in JSON.
Fixture failure expected/actual/diff live under ignored test-results. Only synthetic
fixture goldens enter source archives; they never enter release ZIPs.
