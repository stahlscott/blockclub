# Block Club Visual Design: "The Community Bulletin Board"

**Date:** 2026-01-19
**Status:** Approved

## Design Philosophy

Block Club's visual identity follows the principle: **clean and trustworthy as the default, with intentional moments of warmth.**

The app should feel like a **well-designed public library or co-op grocery** - warm but understated. The friendliness comes from clarity and respect for your time, not visual flourishes. Users should think "I trust this."

Personality comes through **contextual awareness and thoughtful details**, supported by **friendly copy** - not through decorative illustration or heavy imagery.

### Core Principles

1. **Quiet confidence** - Foundation is clean, functional, trustworthy
2. **Physical neighborhood metaphors** - Design elements subtly evoke bulletin boards, index cards, posted notices
3. **Local specificity** - The neighborhood name is prominent; the app feels like it belongs to *this* community
4. **Temporal awareness** - Light seasonal touches and time-of-day awareness show the app is alive
5. **Utility over engagement** - Functional, helpful, there when you need it - never gamified

### Identity Architecture

- **City-level identity**: Subtle (color palette inspired by Lake Erie, but not explicitly branded)
- **Neighborhood-level identity**: Prominent (neighborhood name is the visual anchor)

This scales naturally - every neighborhood already has its own identity.

---

## Visual Foundation

### Color Palette

**Warm neutral base:**
- Page background: `#FFFEF9` (warm cream) instead of pure `#fafaf9`
- Card/surface: `#FFFFFF` (white gains warmth by contrast)

**Primary colors:**
- Primary (Violet): `#8b5cf6` - For actions, buttons, links, interactive elements
- Secondary (Lake Blue): `#5B8A9A` - For navigation, headers, structural elements

**Supporting colors:**
- Warm grays (stone tones instead of zinc)
- Category colors remain: lake cyan, park green, brick orange (already fit the direction)

**Usage rules:**
- Lake blue for navigation, headers, structural elements
- Violet for actions (buttons, links, interactive elements)
- Category colors only for category indicators (library items)
- Semantic colors (red/yellow/green) only for status, never decoration

### Typography

**Primary font:** Nunito (keep current)

**Optional accent font:** Consider a secondary typeface for specific moments:
- Neighborhood name in header
- Section headers
- Empty state messages
- Small accent moments ("NEW" badges, friendly asides)

Use sparingly - 90% of text stays in Nunito. The accent font is seasoning, not the meal.

### Shadows & Elevation

**Simplified to two levels:**
- **Resting**: Subtle, ambient shadow for cards at rest
- **Elevated**: Slightly larger shadow for hover/focus states

Remove purple-tinted button shadows - use the same warm shadow system everywhere.

### Border Radius

Tighten slightly to `6px` throughout for index-card feel. Full radius (`9999px`) only for avatars and pills/badges.

### Spacing

Standardize on fewer values:
- Page padding: `space-8` (32px)
- Card padding: `space-5` (20px)
- Section gaps: `space-6` (24px)

Be strict about this - consistency creates the "professional" feeling.

---

## Layout Patterns

### Neighborhood Name as Anchor

The header should prominently feature the neighborhood name - not buried or treated as metadata. "Maple Street Block Club" becomes a visual anchor, perhaps in a slightly warmer or bolder treatment.

### Section Headers

Evoke a community board's organization:
- Consider a small pin icon or subtle "posted" quality
- Or a horizontal rule *above* the section title (like a divider strip)
- Keep subtle - the metaphor should be felt, not seen

### Card Grid

Lean into "items posted on a board" feeling:
- Slightly more gap between cards (breathing room)
- Subtle, varied "attachment" indicators for different card types:
  - Pin icon for pinned posts
  - Small clip graphic for library items
  - These should be tiny, muted, almost invisible

### Whitespace

Bulletin boards have margins. Increase page padding slightly. Let content feel "placed" rather than "packed."

---

## Component Specifications

### Cards

**General treatment (paper-like quality):**
- Softer shadows (less sharp drop, more ambient)
- Subtle warm border (1px) in addition to shadow
- Border radius: 6px (index card feel)

**Library item cards:**
- Keep category color top-border, increase to 4px, more matte/solid

**Post cards:**
- Left border works for regular posts
- Pinned posts: small visual "pin" indicator in corner instead of just gold color

**Hover behavior:**
- Instead of lifting (`translateY(-2px)`), consider very slight rotation (0.5deg) + soft shadow expansion
- Like nudging a posted note

### Buttons

**Primary buttons:**
- Keep clean appearance
- Hover: Current lift is good, soften shadow (warm, not purple glow)
- Active/pressed: Subtle "pressed in" state (1px down, slightly darker)

**Secondary buttons:**
- Outlined style works, keep it

### Avatars

- Slightly warmer border color (stone instead of purple-tinted)
- For users without photos: initial letter on warm, muted background color (assigned consistently per user)

### Form Inputs

Keep clean and functional - "quiet confidence" matters most here:
- Slightly warmer border color
- Generous padding (current is good)
- Clear focus states (keep primary color ring)

---

## Voice & Copy

### Principles

The personality lives in the words. Friendly, human microcopy that sounds like a helpful neighbor.

### Empty States

Not dead ends, but invitations:
- "Nothing here yet - add something your neighbors might need"
- "No posts yet. What's happening on your block?"

### Timestamps

Use relative, human language for recent items:
- "Posted yesterday"
- "Shared 3 days ago"

### Form Labels

Selectively conversational:
- "What are you sharing?" instead of "Item name"
- Not every label needs this treatment

### Success Messages

Neighbor-aware feedback:
- "Added to the library - your neighbors can see it now"
- "You're all set - reach out to [name] to arrange pickup"

### Time-of-Day Greetings

Dashboard greeting shifts:
- "Good morning, Scott"
- "Good afternoon, Scott"
- "Good evening, Scott"

### Seasonal Touches

In copy, not visuals:
- "Perfect weather for borrowing that tent" (summer)
- "Snow blower season is here" (winter)
- Light touch, not every screen

---

## Empty States & Special Moments

### Empty State Design

Replace emoji-in-circle pattern with:
- Simple line illustration of empty bulletin board, index card with friendly message, or minimal "posted note" style graphic
- Illustrations in muted lake blue or warm gray
- Simple and warm, not elaborate or cartoonish

### First-Time Experience

Welcome message uses names:
- "Welcome to Maple Street Block Club, Scott"
- "This is your neighborhood's shared space - borrow from neighbors, share what you have, stay connected"
- Don't over-explain

### Success Moments

Quiet celebration:
- Item added: "Added to the library - your neighbors can see it now"
- New member: Subtle toast - "Sarah just joined your block"

---

## Implementation Phases

### Phase 1: Foundation
- Update CSS variables (warm backgrounds, refined shadows, spacing)
- Unify shadow and border-radius values

### Phase 2: Components
- Refine cards, buttons, avatars to new patterns
- Add subtle attachment indicators

### Phase 3: Copy Pass
- Update empty states, success messages, greetings
- Add time-of-day awareness

### Phase 4: Accent Moments
- Add pin graphics, section treatments
- Implement seasonal copy variations

---

## Technical Notes

### CSS Variables to Update

```css
/* Background warmth */
--color-background: #FFFEF9;

/* Secondary color (lake blue) */
--color-secondary: #5B8A9A;
--color-secondary-light: #E8F1F3;

/* Unified shadows */
--shadow-resting: 0 1px 3px rgba(0, 0, 0, 0.08);
--shadow-elevated: 0 4px 8px rgba(0, 0, 0, 0.12);

/* Tighter radius */
--radius-default: 6px;
```

### Theming Considerations

Local identity is at the neighborhood level, not city level. No theming system needed - the neighborhood name itself provides the identity. Color palette is inspired by Lake Erie but not explicitly branded, making future expansion natural.
