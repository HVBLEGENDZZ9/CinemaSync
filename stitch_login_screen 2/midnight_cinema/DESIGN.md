# Design System Specification: Midnight Cinema Editorial

## 1. Overview & Creative North Star
**The Creative North Star: "The Obsidian Gallery"**

This design system is not a utility; it is a curated experience. Moving away from the "app-like" rigidity of standard SaaS platforms, this system treats the screen as a high-end editorial gallery. It prioritizes the "void"—the deep, dark space between elements—to create an atmosphere of intimacy and prestige. 

By leveraging intentional asymmetry, oversized typography, and depth through light rather than lines, we create a "Midnight Cinema" aesthetic. This system breaks the template look by overlapping elements and using a "slow" UI philosophy: purposeful motion and generous breathing room that commands the user's focus and lowers their cognitive load.

---

## 2. Color Theory: Tonal Depth
Our palette is rooted in the absence of light, using deep obsidian and charcoal tones punctuated by the warmth of "Champagne Gold."

### Primary Palette
- **The Obsidian Base (`surface`, `background`):** `#131313`. This is our canvas. It is deep but never true black, allowing for "pockets" of deeper darkness in shadows.
- **The Amber Accent (`primary`):** `#e9c349`. Used sparingly for primary actions and critical focus points. 
- **The Soft Secondary (`secondary`):** `#ffdf9e`. A muted, creamier gold for supportive elements.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
*   **The Alternative:** Define boundaries through subtle shifts in tonal value. Use `surface-container-low` (`#1c1b1b`) against the `background` (`#131313`) to suggest a change in area.
*   **The "Glass & Gradient" Rule:** Main CTAs or Hero headers should utilize a subtle linear gradient (e.g., `primary` to `primary-container`) with a 15% opacity overlay of a noise texture to provide a "cinematic film grain" feel.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of smoked glass:
1.  **Level 0 (Background):** `surface-container-lowest` (`#0e0e0e`) - The "Floor."
2.  **Level 1 (Sections):** `surface` (`#131313`) - The primary work area.
3.  **Level 2 (Cards/Modules):** `surface-container` (`#201f1f`) - Subtle lift.
4.  **Level 3 (Popovers/Modals):** `surface-container-highest` (`#353534`) - Maximum prominence.

---

## 3. Typography: Editorial Authority
The typography system uses a pairing of **Manrope** for high-impact headlines and **Inter** for functional clarity.

*   **Display & Headlines (Manrope):** Set with a `-0.02em` tracking for a tight, premium "editorial" look. Use `display-lg` (`3.5rem`) for hero moments, ensuring it has enough negative space to "breathe."
*   **Body & Labels (Inter):** Set with a `+0.01em` to `+0.05em` letter spacing. This "generous" spacing mimics luxury fashion branding and improves legibility against dark backgrounds.
*   **Hierarchy as Identity:** Use `on-surface-variant` (`#c4c7c7`) for secondary text to create a natural "fade" effect, ensuring the eye always hits the `primary` or `on-surface` content first.

---

## 4. Elevation & Depth: The Layering Principle
We reject traditional drop shadows in favor of **Ambient Luminance.**

*   **Tonal Layering:** Instead of a shadow, place a `surface-container-high` element inside a `surface-dim` container. The 2-3% difference in hex value is enough for the human eye to perceive depth without visual clutter.
*   **Ambient Shadows:** When an element must "float" (like a dropdown), use a shadow with a `40px` to `60px` blur, set to `4%` opacity. The color should be the `surface-container-lowest` (`#0e0e0e`), not pure black.
*   **Glassmorphism:** For floating navigation or over-content overlays, use a background of `surface` at `70%` opacity with a `20px` backdrop-blur. 
*   **The Ghost Border:** If accessibility requires a container edge, use the `outline-variant` (`#444748`) at `15%` opacity. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (`#e9c349`) with `on-primary` (`#3c2f00`) text. Corner radius: `DEFAULT` (`0.5rem`). No border.
*   **Secondary:** Glassmorphic. `surface-container-high` at `40%` opacity with a `20px` blur.
*   **Tertiary:** Pure text using `label-md`, all-caps with `0.1rem` letter spacing.

### Cards & Lists
*   **The "No-Divider" Rule:** Forbid horizontal lines between list items. Use the **Spacing Scale** `spacing-4` (`1.4rem`) to separate items.
*   **Interactive State:** On hover, a card should transition from `surface-container` to `surface-container-high` with a `300ms` ease-out.

### Input Fields
*   **Styling:** Ghost-style. No bottom line. A subtle `surface-container-low` background with a `sm` (`0.25rem`) radius. 
*   **Focus:** The border should never change color; instead, the background should shift to `surface-container-highest`.

### Signature Component: The "Cinematic Scrim"
A full-width gradient overlay that sits at the bottom of the viewport (or top of a hero image), transitioning from `background` (100% alpha) to `background` (0% alpha). This ensures text remains readable while images feel "embedded" into the interface.

---

## 6. Do's & Don'ts

### Do
*   **Use Asymmetry:** Place a `headline-lg` on the left and a small `body-sm` description on the far right of a grid to create visual tension.
*   **Embrace the Dark:** Allow large areas of the screen to remain empty (`surface`).
*   **Soft Roundness:** Use the `lg` (`1rem`) radius for large containers to soften the "tech" feel and make it feel more "lifestyle."

### Don't
*   **Don't use pure white:** Never use `#FFFFFF`. Always use `on-surface` (`#e5e2e1`) to avoid eye strain and maintain the "warm" amber glow.
*   **Don't use 1px borders:** These create "boxes" that trap the user. We want the experience to feel like a continuous flow.
*   **Don't use fast easing:** Avoid "snappy" animations. Use `cubic-bezier(0.4, 0, 0.2, 1)` for all transitions to mimic the slow, weighted feel of a cinema projector.

---

## 7. Spacing & Rhythm
Use the **Spacing Scale** to create "Golden Ratios" in your layout. 
*   **Hero Padding:** Always use `spacing-20` (`7rem`) or `spacing-24` (`8.5rem`) for top-level sections. 
*   **In-Card Padding:** Use `spacing-5` (`1.7rem`) to ensure content doesn't feel "choked" by its container.