# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Electron packages the local web application for Windows desktop.

## Users

People creating and revising editable Figma designs with AI. The product owner specifies a professional AI design workspace; no narrower audience demographic is established.

## Product Purpose

Describe → Design → Observe progress → Inspect result → Revise → Prototype → QA → Browser validation.

## Positioning

A desktop workspace that runs OpenCode Figma Designer workflows through an owned local MCP bridge into editable native Figma Desktop layers. Browser previews and validation are a separate local Node/Playwright system, never the Figma write path.

## Operating Context

Long desktop work sessions with a Figma Desktop design document and development plugin. External OMP is the developer harness, not the product runtime. Current UI is functionality reference, explicitly not the layout template for V1.5.3.

## Capabilities and Constraints

Preserve Studio, Prototype, read-only QA and critique, Browser Build/Test, run history, AI provider/model preferences, recovery and uncertainty semantics. Preserve Browser Test artifact freezing, SHA-256 verification, capability restrictions, fail-closed behavior, preview isolation and desktop security. Never expose chain-of-thought or fabricate progress percentages/scores. COMPLETED, FAILED, UNVERIFIED, NEEDS ATTENTION and USER_ACCEPTED_CURRENT_STATE are distinct truths. MCP remains 1.1.0/protocol 2/108 tools including combine_as_variants. V1.2.5 remains HOLD. No Native Orca. Beta 3/4 releases remain immutable; no release publication in this task.

## Brand Commitments

Figma Designer. Monochromatic professional creative software with a coherent hue family, accessible luminance hierarchy and status expressed in words as well as visual treatment. No generic chatbot shell, neon, glassmorphism, excessive pills/cards or decorative AI spectacle. Pixel artwork is optional presentation; preserve source assets.

## Evidence on Hand

Existing current-source screenshots: docs/assets/v1.5.2-monochromatic/. Baseline Browser findings: five MEDIUM stroke-width findings, one normal-motion intermediate-frame finding, native parity UNVERIFIED. Fresh captures must distinguish real live state from labeled deterministic state fixtures and expose no secrets or private prompts.

## Product Principles

- The design task outranks artwork and system machinery.
- Next actions follow the creative workflow.
- Healthy status stays quiet; actionable problems remain visible.
- Uncertainty never becomes success by presentation.
- Preserve backend behavior while replacing presentation architecture.

## Accessibility & Inclusion

Visible keyboard focus, labeled controls, meaningful selected state, readable contrast, reduced motion, zoom/reflow and usable controls across 1440×900, 1320×860, 1200×800, 1024×720 and 900×650. Design architecture and presentation decisions are explicitly delegated to OMP by the product owner.
