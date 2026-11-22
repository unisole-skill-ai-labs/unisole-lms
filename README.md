# Unisole LMS Motion & Design System Tokens

## Motion Tokens & Utilities

This repository defines standardized, hardware-accelerated motion tokens optimized for mobile and desktop viewports, with strict reduced-motion accessibility.

### CSS Custom Properties (`src/index.css`)
```css
:root {
  --nav-h: 4rem;                         /* 64px top navigation height */
  --motion-duration-fast: 150ms;         /* Micro-interactions, icons, hover */
  --motion-duration-base: 200ms;         /* Modals, tooltips, fades */
  --motion-duration-moderate: 250ms;     /* Drawers, accordions, sheets */
  --motion-duration-slow: 300ms;         /* Full page / complex layout transitions */
  --motion-ease-out: cubic-bezier(0.16, 1, 0.3, 1);    /* Deceleration curve */
  --motion-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);   /* Smooth bidirectional */
}
```

### Tailwind Utilities & Keyframes (`tailwind.config.js`)
- `animate-fade-in`: 200ms opacity transition (`opacity: 0 -> 1`)
- `animate-slide-up`: 200ms translate-y enter (`translateY(8px) -> translateY(0)`)
- `animate-scale-in`: 200ms modal/dialog scale enter (`scale(0.96) -> scale(1)`)
- `animate-slide-left`: 250ms horizontal drawer/panel slide (`translateX(100%) -> translateX(0)`)
- `animate-slide-right`: 250ms horizontal panel slide (`translateX(-100%) -> translateX(0)`)
- `animate-slide-down`: 200ms dropdown / banner slide (`translateY(-8px) -> translateY(0)`)
- `animate-shimmer`: 2s linear infinite background skeleton shimmer
- `grid-rows-[0fr]` / `grid-rows-[1fr]`: CSS grid accordion height animation over 200-250ms

### Performance Rules
1. **GPU Acceleration**: Animate strictly `transform` and `opacity`. Never animate `height`, `width`, `top`, or `left`.
2. **Reduced Motion**: All animations are automatically clamped to `0.01ms !important` under `@media (prefers-reduced-motion: reduce)`.
3. **No Layout Shift**: Sticky sub-headers maintain fixed layout heights to prevent 60fps scroll feedback thrashing.
