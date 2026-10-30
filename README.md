# CARE-ID

Community respiratory virus surveillance from school-based testing, developed in partnership with SickKids.
Test results are de-identified and aggregated on upload; only weekly counts by FSA, region, age band and sex are stored.

## Setup

```sh
npm install                # also generates the Prisma client
cp .env.example .env
npm run db:up              # Postgres via Docker (or point DATABASE_URL at your own)
npm run db:migrate
npm run db:seed            # loads synthetic.csv
npm run dev
```

Open http://localhost:3000.

### Demo data

`synthetic.csv` holds 60,000 made-up results covering every GTA FSA from September 2025 to October 2026.

- `npm run db:seed` loads it through the same de-identification pipeline as the upload page. Running it again does nothing.
- `npm run db:seed -- example.csv` loads a different file.
- `npm run db:reset` wipes the database, re-applies migrations and loads `synthetic.csv` again.
- `npm run data:synthetic` regenerates `synthetic.csv`; the output is the same each time.

You can also upload files at `/admin/upload`.

### Map boundaries

`public/geo/gta-fsa.geojson` (GTA FSAs, simplified) is committed. To rebuild it, download the Statistics Canada
2021 FSA cartographic boundary file `lfsa000b21a_e.zip` in a browser into `data/raw/`, then run `npm run geo:build`.
Boundaries: Statistics Canada, Open Licence. Basemap: CARTO Positron (override with `NEXT_PUBLIC_BASEMAP_STYLE`).

`/admin` and `/dashboard` return 404 in production builds until authentication is added (`src/proxy.ts`).

## Layout

- `src/lib/ingest/` — CSV parse → validate → de-identify → aggregate (pure, unit-tested)
- `src/lib/privacy.ts` — small-cell suppression rules
- `src/lib/metrics.ts` — positivity, rolling windows, activity levels
- `src/app/globals.css` — design tokens (brand values are placeholders pending SickKids Communications)
- `prisma/schema.prisma` — aggregate-only data model

## Checks

```sh
npm test && npm run typecheck && npm run lint
```
