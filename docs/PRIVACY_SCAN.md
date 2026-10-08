# Public candidate privacy scan — v1.2.1-beta.1

Prepared 9 October 2026 (Asia/Manila). **PASS**. 336 text/config files were scanned after blocker fixes and dependency cleanup; 520 matches were reviewed and classified SAFE in PRIVACY_FINDINGS.json. Generated scan files are excluded from recursive match generation and checked for forbidden personal/original-checkout strings separately. Private staging, installed dependencies, and Git metadata are excluded from distribution and scans.

Coverage: credential formats/assignments/terminology, Authorization/Bearer, private Figma file/design/prototype URLs, Windows/Unix user/source roots, all HTTP(S)/WS(S) URLs, and exact known personal/original-checkout identifiers (including escaped source forms). No real credential, private Figma URL, personal machine identity/path, or original-checkout directory was found. Copyright author identities and public notices are preserved.

Reviewed counts: {"credential terminology":373,"URL review":144,"machine path":3}. Terminology refers to source/schema/fixtures/design tokens/docs. URLs are public upstream/docs/packages/licenses, localhost/runtime templates, or synthetic test endpoints. Two release-report locations under a generic GitHub staging folder and the fictional /home/builder scanner fixture are intentional; neither exposes personal identity.

## Distributed binaries

The sole shipped executable is the new MCP build, SHA-256 bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f. ASCII plus aligned/unaligned UTF-16 scanning finds no private Windows/user/builder/checkout/Go compiler workspace path. The old executable is rejected by the scanner; the sanitized and extracted packaged executables pass.

One literal E:/ byte fragment at offset 22007194 is immediately followed by byte 0x12 in encoded data. It is not a printable filesystem string. Other broad path-like matches classify as escaped JSON struct tags, short encoded-data fragments, module-relative filenames, and public CA certificate URLs (some containing /root/). Public identifiers/certificate URLs are acceptable; no private build path is accepted or redacted. See PUBLIC_BINARY_VERIFICATION.json.

The opaque Impeccable binary and download launchers are absent from public source/release; only inactive source references and original license/notice texts remain. This removes its provenance and compiler-path issue rather than claiming a top-level license covers unverified transitive dependencies. See SKILL_ENGINE_AUDIT.md.

The ZIP allowlist/content/hash and extracted setup audits pass. No source candidate entry is a compiled opaque binary. This scan covers these release artifacts and common credential/path formats; it is not a claim of exhaustive vulnerability testing.
