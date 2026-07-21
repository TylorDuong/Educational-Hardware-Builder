---
version: alpha
name: Workshop Blocks
description: A light, practical hardware-workshop system with flat color blocks, simple type, and clear guidance.
colors:
  blue: "#0172E4"
  coral: "#E65F54"
  yellow: "#F2CA4D"
  neutral: "#FFF8E4"
  surface: "#FFFDF5"
  on-surface: "#1B2838"
  line: "#D8CFB6"
  success: "#26775B"
typography:
  display:
    fontFamily: "Aptos, Segoe UI, Arial"
    fontWeight: 800
    lineHeight: 0.98
  body:
    fontFamily: "Aptos, Segoe UI, Arial"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, Cascadia Code, Consolas"
    fontWeight: 800
    lineHeight: 1.3
rounded:
  surface: 14px
  control: 9px
  button: 9999px
spacing:
  xs: 8px
  sm: 16px
  md: 28px
  lg: 48px
  xl: 72px
---

# Workshop Blocks

## Look and feel

Use a warm light canvas with faint square gridlines. The grid should feel like graph paper on a workshop bench, not a decorative effect.

Use large, solid coral, blue, and yellow shapes. Do not use color fades, glows, or soft drop shadows. Let border lines and flat fills create the hierarchy.

## Color roles

- Blue is for navigation, links, and fit-check tools.
- Coral is for primary actions and active build work.
- Yellow is for status, saved data, and practical reminders.
- The warm off-white surface keeps the app light and easy to read.

## Type and copy

Use large, plain titles. Add one short caption underneath. Keep labels compact and technical when they name a control.

Write explanations in direct sentences. Put longer explanations behind a visible question-mark help button instead of filling every screen with text.

## Layout

Keep the existing five-tab structure. Use wide panels, generous spacing, and one clear next action per screen.

Cards and panels use a 14px radius and a visible dark outline. Buttons are pill-shaped. Large color shapes are allowed in the hero and as panel fills, but content remains on light surfaces.

## Accessibility

Keep keyboard focus visible in blue. Use dark text on light surfaces. Do not depend on color alone for meaning. Respect reduced-motion settings and keep automatic motion off by default.
