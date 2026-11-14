---
name: CARE-ID
description: Community respiratory virus surveillance from school-based testing, in partnership with SickKids.
colors:
  royal: "#0066ad"
  royal-deep: "#005194"
  ocean: "#01b3d9"
  blueberry: "#002058"
  sky-wash: "#e1f6fa"
  pineapple: "#f1e94d"
  canvas: "#f5f6f8"
  surface: "#ffffff"
  surface-muted: "#f0f2f5"
  border: "#e0e4eb"
  border-strong: "#c7ceda"
  border-control: "#8090ac"
  map-canvas: "#edeff3"
  ink: "#002058"
  ink-muted: "#54575a"
  ink-subtle: "#65686a"
  danger: "#bf4140"
  success: "#1f574e"
  activity-low: "#f0b68b"
  activity-moderate: "#e6863e"
  activity-high: "#bf4140"
  no-data-grey: "#b2b3b5"
  virus-covid: "#0066ad"
  virus-influenza: "#e6863e"
  virus-flu-a: "#002058"
  virus-flu-b: "#bf4140"
  virus-rsv: "#01b3d9"
typography:
  display:
    fontFamily: "Libre Franklin, Franklin Gothic, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Libre Franklin, Franklin Gothic, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Libre Franklin, Franklin Gothic, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "Libre Franklin, Franklin Gothic, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Libre Franklin, Franklin Gothic, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Libre Franklin, Franklin Gothic, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  lg: "8px"
  control: "10px"
  xl: "12px"
  card: "16px"
  full: "9999px"
spacing:
  gutter: "16px"
  gutter-wide: "24px"
  card-sm: "16px"
  card-md: "24px"
  card-lg: "32px"
  section: "56px"
components:
  button-primary:
    backgroundColor: "{colors.royal}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    typography: "{typography.body-small}"
  button-primary-hover:
    backgroundColor: "{colors.royal-deep}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-muted}"
  button-ghost:
    textColor: "{colors.royal}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.sky-wash}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-md}"
  card-privacy:
    backgroundColor: "{colors.blueberry}"
    textColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-lg}"
  site-header:
    backgroundColor: "{colors.royal}"
    textColor: "{colors.surface}"
    height: "72px"
  chip-virus-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 12px"
  segmented-control:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    padding: "4px"
  segmented-control-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  callout:
    backgroundColor: "{colors.sky-wash}"
    textColor: "{colors.blueberry}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
---

# Design System: CARE-ID

## Overview

**Creative North Star: "The Calm Bulletin"**

CARE-ID should read like a trusted public-health notice pinned up at a school: SickKids royal at the top, plain words underneath, and nothing that raises the pulse without a reason. The system is quiet on purpose. A cool, blueberry-tinted page, white cards lifted by hairline rings and faint shadows, royal blue for actions, and a single warm ramp reserved for virus activity. Colour is almost never decorative. When something is orange it means "virus activity". When something is blue it means "you can act here".

Density follows the audience. The community map is spacious and plain-spoken, with one floating panel, one question ("near you") and a few large badges. The public health dashboard is denser, with sticky filters, KPI cards, a chart and a table, but it uses the same tokens, the same cards and the same tone. Both views use the same cards and controls, so they read as one product. Data states are first-class: "Not enough data" has its own diagonal hatch and its own words, and it is never shown as an empty or broken state.

Brand values follow the **SickKids Brand Tipsheet (08.22)**. Every colour is one of its twelve palette colours, a tint of one (the colour at partial opacity, written as `color-mix(… , white)`), or white. Nothing else. The palette lives in `src/app/globals.css` (`--sk-*`) and, for code that needs literals, `src/lib/brand.ts` (`SK`, `tint()`). Logos are in `public/brand/`; SickKids asks Creative Services (creativeservices.requests@sickkids.ca) to approve final artwork that uses its logo.

**Key Characteristics:**
- A royal header bar carrying the white CARE-ID logo marks the product as SickKids.
- White cards on a faint blueberry-tinted canvas, softly lifted.
- One warm, ordinal activity ramp (tangerine tint, tangerine, cherry) for activity levels. Every activity colour is paired with dots and a word.
- A fixed colour for each virus, the same in every chart, chip and legend.
- Libre Franklin throughout (Black for page titles), with tabular figures for numbers.
- The focus ring is pineapple, the system's only loud colour.

## Colors

Only the SickKids Brand Tipsheet palette, its tints and white. Royal and Ocean (the corporate colours) carry identity and action; neutrals are Blueberry tints and Charcoal; the only warmth comes from the data.

### Primary
- **Royal** (#0066ad, corporate): the identity and action colour. The site header bar, primary buttons, text links and link-buttons, eyebrow labels, input focus borders and the active tab underline. **Royal Deep** (royal at 70% over blueberry, #005194) is its hover state only.
- **Ocean** (#01b3d9, corporate): the RSV line and the CARE-ID shield's outer band. **Sky Wash** (ocean at 12%, #e1f6fa) is the tint behind info callouts, step number circles, empty-state icons, ghost-button hovers and the highlighted row in area summaries.
- **Blueberry** (#002058): ink, the privacy card, text on the Sky Wash callout, map selection outlines and the active dashboard tab label.

### Secondary
- **Pineapple** (#f1e94d): reserved for the keyboard focus ring. It is deliberately the only saturated non-data colour, so focus is unmistakable. Pineapple is barely visible against white, so the ring is always edged in Blueberry (see Components → Focus).

### Tertiary: data colours
Defined in `src/lib/display.ts` and `src/lib/viruses.ts` from `SK` and `tint()`, because the map and charts need literal values.
- **Activity ramp**: Low (tangerine at 60%, #f0b68b), Moderate (Tangerine, #e6863e) and High (Cherry, #bf4140). Ordinal, lightness falls with every step. **No-data Grey** (charcoal at 45%, #b2b3b5), with the diagonal hatch, marks "Not enough data".
- **Positivity blues** (`POSITIVITY_BINS`): ocean 25% → ocean 60% → Ocean → Royal → Blueberry, used only on the dashboard map.
- **Virus identities**: COVID-19 (Royal), Influenza (Tangerine), Flu A (Blueberry), Flu B (Cherry), RSV (Ocean). This is the five-colour subset of the palette with the widest separation under deuteranopia, protanopia and tritanopia (min ΔE_ok ≈ 16); the default community trio (COVID-19, Influenza, RSV) is the most distinct three.

### Neutral
- **Canvas** (blueberry 4%, #f5f6f8): the page plane, plus the info-section background below the map.
- **Surface** (white): cards, panels, inputs, the footer and the page-header band.
- **Surface Muted** (blueberry 6%, #f0f2f5): table headers, the segmented-control track, skeletons and quiet inline states.
- **Border** (blueberry 12%, #e0e4eb) and **Border Strong** (blueberry 22%, #c7ceda): hairline dividers and card rings, plus the outlines of secondary buttons, chips and the drop zone, where text identifies the control.
- **Map Canvas** (blueberry 7%, #edeff3): the plane behind the map while tiles load, and behind the "can't display the map" fallback.
- **Border Control** (blueberry 50%, #8090ac): the outline of text inputs and selects. At 3.3:1 against white it meets WCAG 1.4.11, so an empty field is still visibly a field.
- **Ink** (Blueberry), **Ink Muted** (Charcoal, #54575a) and **Ink Subtle** (charcoal 90%, #65686a): the text hierarchy. Primary text, supporting text, then hints and metadata. Ink Subtle passes 4.5:1 on every surface, so the subtle tier is set apart by size more than by lightness.
- **Danger** (Cherry) on a cherry 8% tint with a cherry 30% ring, and **Success** (Pine, #1f574e) on an apple 18% tint with an apple 55% ring: upload errors and confirmations. Warnings keep Ink text on a pineapple 30% tint with a tangerine 55% ring.

### Named Rules
**The Data Owns Warmth Rule.** Orange and red tones belong to virus activity. Interface chrome (buttons, headers, badges, alerts other than errors and warnings) never uses the activity ramp, so a warm colour on screen always means "virus".

**The Never Colour Alone Rule.** Every activity level pairs its colour with filled dots (1, 2 or 3) and a word. Every chart line carries an end label. Every virus chip and summary row pairs its colour dot with the virus name. A design that encodes meaning only in hue is wrong.

**The One Blue Rule.** Royal means "SickKids" on the header bar and "interactive" everywhere else. Don't use it for decoration or other large fills; in data it appears only as the COVID-19 line and inside the dashboard's positivity blues.

**The Palette Only Rule.** No colour outside the tip sheet. New colours are a palette colour, a tint of one, or white; add them as tokens in `globals.css` (and to `INK`/`SK` in `src/lib/brand.ts` if code needs the literal). Never use Tailwind's built-in palette (`red-50`, `amber-900`, …).

## Typography

**Display Font:** Libre Franklin (Black 900 for page titles, Bold 700 for section headings), falling back to Arial, the tip sheet's PC alternative
**Body Font:** Libre Franklin Regular
**Label/Mono Font:** Libre Franklin for labels. The tip sheet prefers Franklin Gothic, which is commercial (Monotype/ITC) with no web licence here; Libre Franklin is an OFL revival of the same Morris Fuller Benton design, loaded from Google Fonts as a variable font, so every weight is real (no synthesised Semibold). The system monospace is used only for CSV column names on the About page and row numbers in upload errors.

**Character:** One neutral, highly legible sans used in every role. Hierarchy comes from weight and size, not from contrasting typefaces. Character variants `cv11` and `ss01` are on globally for a slightly more open, friendly letterform. Numbers in tables, KPIs and tooltips use tabular figures (`.tabular`).

### Hierarchy
- **Display** (700, 1.875rem, tight tracking): page titles at desktop size and KPI values on the dashboard.
- **Headline** (700, 1.5rem, tight tracking): page titles on mobile and section headings like "From a school test to community information".
- **Title** (600–700, 1.125–1.25rem): card and panel headings, area names in the community panel, and technical-notes section headings.
- **Body** (400, 1rem, 1.5 line height; 1.75 line height on the About page): reading text. About-page prose is capped at 37rem (about 75 characters); tables there use the full 44rem column.
- **Body Small** (400–600, 0.875rem): controls, buttons, table cells, nav links, panel copy. This is the workhorse size of the app.
- **Label** (600, 0.75rem, 0.05em tracking, UPPERCASE, Royal): eyebrows above page and section titles ("Public health", "Methods", "How CARE-ID works"). A muted, unbolded 0.75rem is also used for hints and metadata.

### Named Rules
**The Weight Not Face Rule.** Never introduce a second typeface for emphasis. Step up the weight (400 → 600 → 700) or the size.

**The Tabular Numbers Rule.** Any column, KPI or tooltip that shows numbers uses tabular figures so values align and don't jitter when filters change.

## Layout

- **Container:** content is centred in a max width of 90rem (1440px) with 16px gutters, or 24px from 640px up. Reading pages (empty states, technical-notes body) narrow to 48rem or 44rem.
- **Community map:** the map fills the viewport below the header (`100dvh − header`, minimum 560px). On desktop (1024px and up), a 384px panel floats 16px from the left, top and bottom, and the map's fit padding accounts for it. On smaller screens the same panel becomes a bottom sheet. Collapsed, it shows the search, the virus switcher and a one-line summary of the area's activity. The 44px handle or the summary row opens the area details. Open, the sheet stops 13rem short of the top, so the legend, zoom buttons and attribution stay visible. The map's bottom controls track the sheet's height, so they always sit just above it. The legend floats top-right. A "How CARE-ID works ↓" pill sits bottom-centre from 1280px up. Below that it would collide with the map attribution.
- **Dashboard:** a page-header band, then a filter bar that sticks under the site header from 1024px up (translucent white with a blur; on smaller screens it wraps to several rows and scrolls away), a KPI grid (`auto-fit, minmax(15rem, 1fr)`, 16px gaps), and one tabbed card holding the trends, map and table views.
- **About page:** a two-column layout from 1024px up: a sticky 14rem in-page nav with a left rule, beside a 44rem article. Sections are 48px apart.
- **Rhythm:** a 4px base step. The most common gaps are 8, 12, 16 and 24px, sections 56px. Cards pad 16px (dense), 24px (standard) or 32px (feature). Lists and tables use 10px vertical cell padding.
- **Breakpoints:** Tailwind defaults. `sm` 640px widens the gutters, `md` 768px shows the inline main nav, `lg` 1024px floats the map panel and shows the notes side nav.

## Elevation & Depth

Softly lifted. Surfaces sit on the canvas with a hairline ring (Border at 70%) plus a barely-there shadow. Things that float above the map step up to stronger shadows. Shadows are blueberry-tinted (rgb 0 32 88), never grey-black. Depth means "this layer sits above that one", never decoration.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgb(0 32 88 / 0.05), 0 1px 3px rgb(0 32 88 / 0.04)`): cards and primary buttons at rest.
- **Raised** (`0 4px 12px -2px rgb(0 32 88 / 0.08), 0 2px 4px -2px rgb(0 32 88 / 0.05)`): map legends, the "How it works" pill, and the active segment in a segmented control.
- **Header** (`0 2px 6px rgb(0 32 88 / 0.2), 0 1px 2px rgb(0 32 88 / 0.12)`): the sticky site header only, a short soft edge so page content reads as scrolling beneath it.
- **Overlay** (`0 18px 40px -12px rgb(0 32 88 / 0.25), 0 4px 10px -4px rgb(0 32 88 / 0.08)`): the floating map panel or bottom sheet, map tooltips and the skip link.

### Named Rules
**The Three Steps Rule.** There are exactly three elevations: card, raised and overlay. Don't invent a fourth. If something needs more emphasis, change its position or colour, not its shadow.

## Shapes

Gently rounded and friendly, never pill-everything. Cards and floating panels use a 16px radius. Controls (buttons, inputs, selects, the segmented-control track) use 10px. Legends, tables, alerts and callouts use 12px. Nav items and inline messages use 8px. Small ghost buttons use 6px. Full pills are kept for virus filter chips, the trend-change chip, step-number circles, activity dots and the "How it works" pill.

Containers are edged with 1px rings, not borders, so radii stay crisp over shadows. The **diagonal hatch** (135°, blueberry 31% on blueberry 10%) is the system's signature texture. It appears only for "Not enough data", identically in CSS swatches and in the map's fill pattern.

## Components

### Buttons
Restrained and solid.
- **Shape:** gently curved (10px). Label in 600-weight body small, 10px × 16px padding, with an 8px gap for icons.
- **Primary:** Royal fill with white text and a card shadow. Hover darkens to Royal Deep.
- **Secondary:** white with a Border Strong outline and Ink text. Hover fills Surface Muted. Used for "Download CSV".
- **Ghost:** Royal text with no fill. Hover adds a Sky Wash tint.
- **Disabled:** 50% opacity with a not-allowed cursor.
- **Focus:** the global focus ring (see Focus below).

### Chips
- **Virus filter chips** (dashboard): full pills, 36px high. When on, white with a card shadow, a Border Strong ring, Ink text and a filled virus-colour dot. When off, transparent with a Border ring, Ink Subtle text and a hollow dot ringed in the virus colour. They toggle with `aria-pressed`, and at least one always stays on.
- **Trend-change chip** (KPI cards): a Surface Muted tag with an 8px radius, so it can wrap to two lines in French. It holds an up, down or flat arrow icon and "x.x pts higher/lower vs last week".

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Surface. The privacy card is the single Blueberry exception.
- **Shadow Strategy:** the card shadow (see Elevation) plus a 1px Border ring at 70%.
- **Internal Padding:** 16px for KPI and upload stat cards, 24px for step cards and the dashboard tab body, 32px for the privacy and tips cards.

### Inputs / Fields
- **Style:** white with a 1px Border Control outline, 10px radius, 10px × 12px padding, body small text and a 1px inset ink shadow. Placeholders use Ink Subtle.
- **Focus:** the border turns Royal and the global focus ring applies, as on every other control.
- **Selects** (dashboard filters): the same treatment at 36px high, capped at 10.5rem wide.
- **File drop zone:** a 2px dashed Border Strong outline on a 16px radius. While dragging, Royal with a Sky Wash fill.

### Icons
A small stroke set in `src/components/ui/icons.tsx`: 24px grid, 2px stroke, round caps and joins, matching the header's menu icon. Icons are always decorative and paired with a word. They size with the text they sit beside (`size-[1.1em]` inline, `size-4` in buttons, `size-5`–`6` in feature circles). Never use Unicode arrows, check marks or emoji as icons; add a path to the set instead.

### Focus
One indicator for every focusable element: a 3px Pineapple ring flush to the element's edge, wrapped in a 2px Blueberry edge (`outline: 3px solid pineapple; box-shadow: 0 0 0 5px blueberry`). The blueberry carries the 3:1 contrast on light surfaces and the pineapple carries it on the royal header. When a control is visually hidden inside a styled wrapper (the upload drop zone), put `.focus-proxy` on the wrapper so the ring shows there.

### Navigation
- **Site header:** a sticky 72px Royal bar with no rule beneath it. On the left, the negative (white) CARE-ID logo at 52px tall, followed by the tagline "Respiratory Virus Surveillance Tool" in white bold (14px; 13px below 640px, wrapping below 1024px when space is short). Links are body small at medium weight, 85% white. Hover adds a 10% white fill; the active link gets a 15% white fill and `aria-current`. A language switch (a globe icon plus "Français" or "English", written in the target language) follows the links after a thin divider. Below 1024px the links collapse into a menu button that drops a stacked list, and the language switch stays visible beside it. The breakpoint is 1024px, not 768px, because the French labels are much longer.
- **Dashboard tabs:** link tabs with a 2px underline. Active is Blueberry text on a Royal underline; inactive is Ink Muted.
- **Technical-notes nav:** a sticky list on a left rule. On hover, a 2px Royal left border appears.
- **Footer:** white with a top border. A one-line privacy statement sits beside "About" and "Privacy" links.

### Activity Badge (signature)
Three 12px dots (10px when small) ringed and filled in the level's activity colour (1 filled = Low, 2 = Moderate, 3 = High). For "Not enough data" the dots are hatched. Next to them, the level word in 600 Ink (Ink Muted for not-enough-data) and an optional trend in Ink Muted ("↗ Rising", "↘ Falling", "→ Steady"). The text never takes the activity hue, so the label always stays legible.

### Segmented Control
A radio group on a Surface Muted track (4px padding, 10px radius). The active segment is a white tile with the raised shadow and Ink text. Inactive segments are Ink Muted. An optional virus-colour dot leads each label. Arrow keys move the selection.

### Map Legend & Tooltip
The legend is a 95%-white card with a blur, 12px radius and the raised shadow, at 12px text. Swatches are 20 × 12px rectangles. On mobile it compacts to a single wrapping row. Tooltips are white overlay cards (12px radius, overlay shadow) that sit 12px above the pointer.

### Callout
A Sky Wash block in Blueberry text with a faint Royal ring, 12px radius and body small at a relaxed line height. It is used on the About page for privacy guarantees.

## Do's and Don'ts

### Do:
- **Do** pair every activity colour with dots and a word, using `ActivityBadge`. Never render a bare activity swatch as the only signal outside a legend.
- **Do** use the virus colours from `src/lib/viruses.ts` and the activity and positivity colours from `src/lib/display.ts`, never new literals.
- **Do** use the hatch, and the words "Not enough data" or "Too few tests", for suppressed figures.
- **Do** keep primary text in Ink and supporting text in Ink Muted. Use Ink Subtle for hints and metadata, and never anything lighter for text.
- **Do** use the three named shadows (card, raised, overlay) and the radius scale above.
- **Do** keep Royal for the header and interactive elements, and Blueberry for ink.

### Don't:
- **Don't** use the SickKids logo or invent a mark. The header uses a wordmark only until approved co-branding artwork exists.
- **Don't** colour interface chrome with the activity ramp, or use red, orange or alarm styling to dramatise activity levels.
- **Don't** introduce a second typeface or a decorative display face.
- **Don't** add a fourth elevation level or grey-black shadows.
- **Don't** show case counts or test counts on public (community) surfaces. Activity levels only.
- **Don't** hard-code new hex values in components. Add a token in `globals.css`, or a data colour in `display.ts` or `viruses.ts`.
