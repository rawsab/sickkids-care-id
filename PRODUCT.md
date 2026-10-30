# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CARE-ID serves two audiences with equal weight. Each has its own surface and its own priorities:

- **Families and schools** use the public community map (`/`). They want to know how much COVID-19, influenza and RSV is going around in their area (FSA) this week, whether it is rising or falling, and what they can do about it. Many are parents checking on a phone and have no epidemiology background.
- **Public health teams** use the dashboard (`/dashboard`). They read detailed weekly trends by virus, region, FSA, age band and sex, filter and compare them, and export figures.

A third, operational audience is **staff who upload results** (`/admin/upload`). They load CSV files of school test results and roll back uploads when needed.

## Product Purpose

CARE-ID runs community respiratory virus surveillance on school-based testing done in partnership with SickKids. It turns individual test results into de-identified weekly counts by area. Families get a plain read of activity in their community, and public health teams get trend data they can act on.

The current stage is **prototype / proposal**: a working demo that SickKids can evaluate and adopt. It runs on synthetic data (`synthetic.csv`) and has no live deployment. Success right now means a demo that shows SickKids and public health partners the product is credible, privacy-safe and useful.

## Positioning

The data comes from school-based testing of children, so it gives an early, community-level signal by neighbourhood (FSA), which hospital or lab reporting does not. Privacy is built into the data pipeline. Raw results are never stored, and suppression of small numbers happens on the server, so hidden figures never reach the browser. One dataset feeds a public view and a professional view, and each audience gets a different privacy threshold.

## Operating Context

- **Data flow:** schools test → staff upload a CSV → it is parsed, validated, de-identified and aggregated in memory → only weekly counts (epi week × FSA × region × virus × age band × sex) are stored.
- **Geography:** FSAs in the Greater Toronto Area (Statistics Canada 2021 boundaries), grouped into Toronto, Peel, York, Durham and Halton. The basemap is CARTO Positron.
- **Public view:** shows activity levels (low / moderate / high / not enough data) from pooled 3-week positivity, with a rising or falling trend. It never shows case counts or test counts. A visitor's location, if shared, stays in their browser.
- **Public health view:** shows detailed positivity and trends, has filters, and exports figures.
- **Technical notes** (`/notes`) document methods, suppression, activity bands and the upload file format.

## Capabilities and Constraints

- **Viruses:** influenza A, influenza B, influenza (any), SARS-CoV-2 (COVID-19) and RSV.
- **Privacy rules:** the public view suppresses cells with fewer than 10 definitive tests and the public health view fewer than 5. Where a breakdown adds up to a shown total, a second cell is also suppressed so a hidden value can't be worked out by subtraction. "Not enough data" is a first-class state, not an error.
- **Provisional numbers:** the activity bands are provisional and will be set with public health partners. Present them as provisional, not final.
- **Authentication:** none yet. `/admin` and `/dashboard` return 404 in production builds until it is added (`src/proxy.ts`). Role names: `ADMIN`, `PH_USER`.
- **Planned:** reporting by individual school (v2, `schoolId`). Undecided.
- **Language:** English and French, at `/en/…` and `/fr/…`. A visitor's language is chosen from a cookie, then their browser language. All interface text lives in `src/i18n/dictionaries/`. **The French text is a draft by the development team and must be reviewed by a professional translator before any public release.** CSV column names and the literal result values in uploaded files ("Detected", …) stay in English in both languages.
- **Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Prisma and Postgres, MapLibre, and Recharts.

## Brand Commitments

- The product is named **CARE-ID**, presented as "in partnership with SickKids".
- SickKids brand values in `src/app/globals.css` (colours, typeface) are **placeholders** until SickKids Communications confirms them.
- The SickKids logo must not be used until approved co-branding artwork is supplied. Until then, the header shows a wordmark only.
- Voice: plain and calm, and factual rather than alarming. Public copy speaks to parents directly ("Stay home when sick").

## Evidence on Hand

- `synthetic.csv` has 60,000 made-up results covering every GTA FSA from September 2025 to October 2026. `example.csv` is a small sample.
- `public/geo/gta-fsa.geojson` holds the simplified GTA FSA boundaries.
- There are no real surveillance data, partner endorsements, testimonials, pilot results or approved logos. Future work must not invent them, or imply that SickKids has endorsed or deployed the product.

## Product Principles

1. **Privacy is visible.** Users should see that individual results are never stored and that small numbers are hidden. Suppressed states are explained honestly, never disguised.
2. **One dataset, two depths.** The public gets activity levels in plain language, and public health gets detailed figures. Neither view should leak the other's level of detail.
3. **Calm, not alarming.** The product informs parents' decisions without causing panic. Levels and trends come with what to do about them.
4. **Methods are inspectable.** Every number shown can be traced to a documented method in the technical notes.
5. **Honest about being a prototype.** Thresholds, branding and data are marked provisional until partners confirm them.

## Accessibility & Inclusion

- **WCAG 2.1 AA / AODA** compliance is required (Ontario public sector).
- A **French** version is required. Layouts and copy must allow for longer French strings and for switching language.
- **Plain language** is required on public surfaces, for parents with limited health literacy. Any epidemiology terms in the public view need explaining.
- Activity levels must never rely on colour alone. The map and badges also need text labels or patterns.
