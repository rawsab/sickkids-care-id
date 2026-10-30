# CARE-ID

Community respiratory virus surveillance from school-based testing, developed in partnership with SickKids.
Test results are de-identified and aggregated on upload; only weekly counts by FSA, region, age band and sex are stored.

## Setup

```sh
npm install                # also generates the Prisma client
cp .env.example .env
npm run db:up              # Postgres via Docker (or point DATABASE_URL at your own)
npm run db:migrate
npm run dev
```

Open http://localhost:3000. Upload `example.csv` (5 rows) or `synthetic.csv` (60,000 made-up rows covering every GTA FSA for the past year) at `/admin/upload`. Regenerate the synthetic file with `npm run data:synthetic`.

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
