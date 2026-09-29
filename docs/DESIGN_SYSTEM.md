# CNS Beauty Design System v1.0

## 1. Brand Experience

Concept: **Premium Feminine Beauty Editorial**

The visual system translates CNS Beauty's positioning into a warm, sophisticated and emotionally engaging digital environment.

## 2. Color Tokens

```css
:root {
  --cns-cocoa: #6B3328;
  --cns-cocoa-dark: #43221B;
  --cns-blush: #D98F88;
  --cns-blush-soft: #F7DCD7;
  --cns-peach: #F3C7B8;
  --cns-cream: #FFF9F5;
  --cns-ivory: #FAF7F3;
  --cns-beige: #EDE1D7;
  --cns-gold: #C99A3D;
  --cns-rose-gold: #C77B72;

  --text-primary: #2B2522;
  --text-secondary: #6B625D;
  --text-muted: #9A918B;

  --border: #E7DCD5;
  --surface: #FFFFFF;
  --surface-soft: #FBF6F2;

  --success: #3F6B50;
  --warning: #A97832;
  --error: #B84A4A;

  --ai-surface: #F3EEE8;
  --ai-accent: #8C6F5D;
}
```

Color values are implementation tokens inspired by the approved illustration direction; final brand values should be reconciled with the official CNS brand identity.

## 3. Typography

Display:
`Cormorant Garamond`

Body:
`Inter`

```css
--font-display: "Cormorant Garamond", serif;
--font-body: "Inter", sans-serif;
```

Scale:
- Display XL: 64px
- Display L: 52px
- H1: 44px
- H2: 36px
- H3: 28px
- H4: 22px
- Body L: 18px
- Body: 16px
- Body S: 14px
- Caption: 12px

Mobile:
- Display: 40px
- H1: 32px
- H2: 28px
- H3: 22px
- Body: 16px

## 4. Spacing

Base unit: 4px

4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96

Section:
- Mobile: 64px
- Desktop: 96–128px

## 5. Radius

- sm: 6px
- md: 10px
- lg: 16px
- xl: 24px
- pill: 999px

Product cards: lg.
Buttons: md.
AI launcher: pill/circle.

## 6. Shadows

Use restrained shadows. Premium aesthetic relies more on:
- whitespace
- border
- typography
- photography

than heavy shadows.

## 7. Buttons

Primary:
- cocoa/blush filled
- white text
- medium radius

Secondary:
- outlined
- cocoa text

AI:
- subtle warm neutral surface
- sparkle icon
- distinct but brand-consistent

## 8. Product Cards

Anatomy:

```text
Image
Badge
Brand
Name
Short benefit
Rating
Price
CTA
```

Desktop hover:
- image scale ~1.03
- quick action
- AI recommendation CTA

Mobile:
- no hover dependency.

## 9. Hero

Use editorial split compositions:
- copy on left;
- model/product photography on right;
- product foreground;
- soft floral/water/stone environment;
- generous whitespace.

Hero should never sacrifice readability for decoration.

## 10. Photography

Preferred:
- soft natural light
- warm skin tones
- clean beauty portrait
- premium product closeups
- blush/peach/cream environments
- botanical accents
- marble/stone platforms
- subtle reflections/water

## 11. Iconography

Use:
- outline icons;
- thin strokes;
- rounded geometry;
- restrained blush/cocoa/gold.

## 12. Responsive

<640 mobile
640–1023 tablet
1024–1439 desktop
>=1440 large desktop

Product grid:
2 / 3 / 4 / 4–5 columns.

## 13. Accessibility

Target WCAG 2.2 AA.

Do not use color alone for:
- status
- validation
- selected state.

Focus states must be visible.

## 14. Motion

Motion should be subtle:
- 150–250ms UI transitions;
- 250–450ms section/image transitions;
- respect prefers-reduced-motion.

Avoid excessive parallax.

## 15. AI UI

Persistent entry point.

Desktop:
floating/side panel.

Mobile:
floating button → bottom sheet/full screen.

AI should visually feel part of CNS Beauty, not like an embedded third-party chatbot.
