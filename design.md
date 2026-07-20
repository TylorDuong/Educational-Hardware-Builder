---
version: alpha
name: Mux Motion Mono
description: A bright, technical, and playful developer-focused system with bold contrast, rounded pills, and editorial typography.
colors:
  primary: "#0172E4"
  secondary: "#828c97"
  tertiary: "#ffffff"
  neutral: "#e2e4dd"
  surface: "#ffffff"
  on-surface: "#000000"
  error: "#d94b3d"
  primary-60: "#4798EB"
  primary-70: "#2688E8"
  secondary-20: "#d6dbe1"
  surface-strong: "#242628"
typography:
  headline-display:
    fontFamily: "Rotonto"
    fontSize: "50px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "1px"
  headline-lg:
    fontFamily: "JetBrainsMono"
    fontSize: "39px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0px"
  headline-md:
    fontFamily: "Aeonik"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0px"
  headline-sm:
    fontFamily: "Aeonik"
    fontSize: "23px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0px"
  body-lg:
    fontFamily: "Aeonik"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.02em"
  body-md:
    fontFamily: "Aeonik"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.02em"
  body-sm:
    fontFamily: "Aeonik"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.02em"
  label-lg:
    fontFamily: "JetBrainsMono"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.08em"
  label-md:
    fontFamily: "JetBrainsMono"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.08em"
  label-sm:
    fontFamily: "JetBrainsMono"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  none: 0px
  sm: 4px
  md: 12px
  lg: 28px
  xl: 56px
  full: 9999px
spacing:
  xs: 4px
  sm: 14px
  md: 32px
  lg: 56px
  xl: 76px
  gutter: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "14px 56px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.primary-70}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "14px 56px"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "14px 56px"
    height: "56px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "56px 0px 0px"
  card-strong:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "56px 0px 0px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  chip:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
---

# Mux Motion Mono

## Overview

Mux feels technical, confident, and a little playful, aimed squarely at developers and product teams who want video tooling that feels modern rather than corporate. The visual tone is light and spacious, with an electric-blue accent and crisp black type over a muted warm-gray canvas. The overall mood balances engineering precision with friendly motion and rounded form language.

## Colors

- **Primary (#0172E4):** An electric blue used for the main call to action, energetic highlights, and brand emphasis. It gives the interface its most recognizable burst of clarity.
- **Secondary (#828c97):** A cool gray used for borders, dividers, and quieter UI chrome. It softens the system and keeps the blue from feeling overly loud.
- **Tertiary (#ffffff):** Clean white used for cards, buttons, and content surfaces that need contrast against the warm background.
- **Neutral (#e2e4dd):** The signature page background, a pale warm gray that feels soft, editorial, and slightly industrial.
- **Surface (#ffffff):** The primary elevated surface color for cards, panels, and button fills.
- **On-surface (#000000):** Pure black for headlines, navigation, labels, and core text. The brand relies on this stark contrast instead of heavy shadows.
- **Error (#d94b3d):** A restrained red reserved for destructive or alert states, visually aligned with the system's high-contrast language.
- **Primary-60 (#4798EB) / Primary-70 (#2688E8):** Lighter and deeper action states that can support hover or active interactions while staying in the same blue family.
- **Surface-strong (#242628):** A near-black surface used for dark cards or media tiles when content needs a denser frame.

## Typography

Mux combines three distinct voices. Rotonto is reserved for the largest display moments and gives the hero headline its futuristic, slightly mechanical character. JetBrains Mono carries the UI labels and button text, reinforcing the developer-tool personality with compact monospaced precision. Aeonik handles body copy and secondary headings, bringing readability and a modern humanist balance.

Headlines are clean and mostly unadorned, with the display treatment using a subtle positive letter-spacing of 1px. Body text is open and readable at 18px with modest tracking, while labels are intentionally tight and uppercase-feeling through mono styling rather than explicit caps. Use the mono face for navigational and action-oriented text when the interface should feel technical and exact.

## Layout

The page uses a centered, fixed-max-width composition with generous side gutters and very large vertical spacing between major sections. The rhythm is simple and modular: small 4px adjustments for fine alignment, then jumps to 14px, 32px, 56px, and 76px for hierarchy. This creates a calm, spacious landing-page structure that reads quickly and lets the hero content breathe.

Sections are stacked with clear separation rather than dense grids. Cards and panels often sit in wide bands with rounded corners and consistent internal padding, especially the 56px top inset on feature cards. Use generous horizontal padding inside components, while keeping the overall page background visible as negative space.

## Elevation & Depth

The system is intentionally flat. There are no meaningful shadows; hierarchy comes from contrast, borders, and layered tonal surfaces instead. Thin 1px outlines in the secondary gray define structure, while white cards and darker media tiles create depth through color difference alone.

This restraint makes the blue accent feel sharper and more deliberate. When a surface needs emphasis, prefer stronger fill contrast or a darker card tone over shadow blur. Borders should remain crisp and light, never heavy or decorative.

## Shapes

The shape language is friendly and rounded, especially for interactive elements. Primary buttons use a very large pill radius, while cards use a broad 28px corner radius that feels soft without becoming bubbly. The overall silhouette is approachable, product-led, and modern, with curves used to reduce the severity of the monospaced typography.

## Components

Buttons are the most expressive component. `button-primary` is an electric-blue pill with white mono text, 1px gray border, and substantial horizontal padding; it should read as the dominant action. `button-secondary` remains similarly pill-shaped but can be used for quieter actions with white or neutral fills. `button-tertiary` should stay minimal, with no border and no fill, for utility links or low-emphasis actions. Keep button height at 56px for hero-level CTAs, and preserve the wide, padded proportions.

Cards use `card` for clean white content panels and `card-strong` for dark media-led panels. Both should keep the 28px radius and a thin gray border, with no shadow. Internal spacing is generous, and the top padding is notably larger than the sides to match the airy editorial layout.

Inputs should mirror the same restrained, bordered style as buttons and cards: white fill, gray border, and medium-radius corners. They should feel precise rather than decorative, with strong text contrast and comfortable padding for form-heavy developer workflows.

Chips and badges are small mono labels with pill rounding and subtle neutral fills. They work best for status, product tags, and announcements like beta indicators. Keep them compact and avoid introducing extra ornamentation.

Navigation links and utility actions should remain lightweight and typographic. The system favors simple text buttons with clear spacing over icon-heavy menus. If icons are used, keep them small and functional, not illustrative.

## Do's and Don'ts

- Do use black text on white or warm-gray surfaces for the strongest Mux contrast.
- Do keep corners rounded, especially on CTAs and cards, to preserve the approachable product feel.
- Do rely on borders and color contrast for hierarchy instead of shadows.
- Do use Rotonto only for the largest display moments; use Aeonik for readable content and JetBrains Mono for labels and actions.
- Don't introduce soft drop shadows or glossy effects.
- Don't replace the blue accent with multiple competing brand colors.
- Don't tighten spacing to the point that the layout feels dense or dashboard-like.
- Don't use mixed corner styles within the same component family.
