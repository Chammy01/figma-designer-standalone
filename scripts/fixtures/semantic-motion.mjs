import { motionTokens } from '../../rules/figma-motion-semantics.mjs';
const transition = { type: 'DISSOLVE', duration: 0.3, easing: { type: 'EASE_OUT' } };
const state = { type: 'NODE', navigation: 'CHANGE_TO', destinationId: 'fixture:hover', transition };
const nav = { type: 'NODE', navigation: 'NAVIGATE', destinationId: 'fixture:settings', transition: { ...transition, type: 'PUSH', direction: 'LEFT', matchLayers: false } };
const overlay = { type: 'NODE', navigation: 'OVERLAY', destinationId: 'fixture:modal', transition, overlayPositionType: 'MANUAL', overlayRelativePosition: { x: 20, y: 40 } };
export const stateEvidence = { destinationExists: true, sourceSetId: 'fixture:set', destinationSetId: 'fixture:set' };
export const runtimeEvidence = { destinationExists: true, runtimeDestination: true };
const { tolerance, ...normalNav } = motionTokens.NAV_DEFAULT;
export const semanticCases = [
  { id: 'A-state', intent: 'STATE', action: state, evidence: stateEvidence, token: 'STATE_FAST', status: 'MISMATCH' },
  { id: 'B-navigation', intent: 'NAVIGATION', action: nav, evidence: runtimeEvidence, token: 'NAV_DEFAULT', status: 'MISMATCH' },
  { id: 'C-spatial', intent: 'SPATIAL_NAVIGATION', action: { ...nav, destinationId: 'fixture:step2' }, evidence: { ...runtimeEvidence, spatialMeaning: true, direction: 'LEFT', journey: 'horizontal left-to-right step 1 -> 2' }, token: 'NAV_SPATIAL', status: 'MISMATCH' },
  { id: 'D-overlay', intent: 'OVERLAY', action: overlay, evidence: runtimeEvidence, token: 'OVERLAY_DEFAULT', status: 'MISMATCH' },
  { id: 'E-scroll', intent: 'SCROLL', action: { type: 'NODE', navigation: 'SCROLL_TO', destinationId: 'fixture:section', transition: null }, evidence: { destinationExists: true }, token: 'SCROLL_NATIVE', status: 'MATCH' },
  { id: 'F-enter', intent: 'ENTER', action: { type: 'URL', url: 'https://example.test', transition: null }, evidence: {}, token: null, status: 'LIMITED' },
  { id: 'G-consistent', intent: 'NAVIGATION', action: { ...nav, transition }, evidence: runtimeEvidence, token: 'NAV_DEFAULT', status: 'MISMATCH' },
  { id: 'H-normalized', intent: 'NAVIGATION', action: { ...nav, transition: { ...normalNav, duration: Math.fround(normalNav.duration) } }, evidence: runtimeEvidence, token: 'NAV_DEFAULT', status: 'MATCH' },
];
export const motionLanguage = [
  { name: 'subtle', text: 'Keep this screen change subtle.', intent: 'NAVIGATION' },
  { name: 'snappy', text: 'Make this existing state change snappy.', intent: 'STATE' },
  { name: 'forward', text: 'Make step 1 to step 2 feel like moving forward in the stated horizontal left-to-right onboarding journey.', intent: 'SPATIAL_NAVIGATION' },
  { name: 'backward', text: 'Make previous-step navigation feel backward in that horizontal journey.', intent: 'SPATIAL_NAVIGATION' },
  { name: 'modal', text: 'Keep this existing modal transition quiet.', intent: 'OVERLAY' },
  { name: 'less', text: 'Use less motion for these ordinary screen changes.', intent: 'NAVIGATION' },
  { name: 'slide', text: 'Make everything slide.', intent: 'SPATIAL_NAVIGATION', limited: true, clarificationAllowed: true },
  { name: 'animated', text: 'Make it more animated.', clarify: true },
  { name: 'shared', text: 'Use shared-element continuity between these screens.', intent: 'SHARED_ELEMENT' },
  { name: 'scroll', text: 'Scroll smoothly to the existing section.', intent: 'SCROLL_SMOOTH' },
];
