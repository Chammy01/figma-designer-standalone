# Figma Designer v1.2.1-beta.1 — Windows beta candidate

Describe an interface in plain English and refine editable native Figma layers. Beginners do not need to know MCP, programming, or AI agents. Download the prebuilt Windows Release ZIP when publication is authorized.

## Highlights

- Editable native Figma output and focused revisions.
- States/components and supported working Figma interfaces.
- Motion validation with preserved reaction semantics.
- Local browser export/testing with truthful coverage reporting.
- Automatic live source freshness, separate from browser acceptance.
- Hardened reaction validation and preserved custom variants.
- Beginner setup/docs, contributor CI, and allowlisted packaging.

## Requirements

Windows x64, Figma Desktop with development-plugin access, OpenCode, Node.js 20+ with npm. Internet/provider access is needed; provider sign-in, costs, and model availability are separate. No Go/Bun builds for normal users. Historical known-good OpenCode: 2.0.24.

## Installation

Follow [Quick Start](docs/QUICKSTART.md). Extract the entire ZIP, run setup, import the bundled development manifest, keep OpenCode/plugin open, run `/figma/doctor`, then `/figma/design`.

## Beta limitations

Figma is not a complete application runtime; some behavior is FIGMA_LIMITED. Browser PASS is not full state/business/visual validation. Freshness is point-in-time evidence; visual regression is incomplete. Timed writes are indeterminate and require read-back before retrying. Windows ARM64/other systems and real clean-machine onboarding remain unvalidated. See [Known limitations](docs/KNOWN_LIMITATIONS.md).

## Release identity and launch gates

Public metadata: v1.2.1-beta.1. System: 1.2.1. MCP: 1.2.0-standalone-hardening. Manifest/report schemas: 2. Projection/fingerprint versions are unchanged. Project-owned code/docs are MIT licensed; third-party terms remain separate. The public MCP build uses Go -trimpath with preserved runtime behavior. The optional Impeccable engine and launchers are excluded; core Figma commands remain available. GitHub Private vulnerability reporting must be enabled immediately when repository visibility becomes public; see [launch checklist](docs/LAUNCH_CHECKLIST.md). Git/GitHub initialization and publication have not been performed.
