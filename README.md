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

After the first setup, `npm run start:local` does the last four steps in one go: it starts Postgres, waits until it's ready, applies migrations, loads `synthetic.csv` (skipped if already loaded) and runs the dev server. `npm run stop:local` stops the dev server and the database container; the data is kept.

### Demo data

`synthetic.csv` holds 60,000 made-up results covering every GTA FSA from September 2025 to October 2026.

- `npm run db:seed` loads it through the same de-identification pipeline as the upload page. Running it again does nothing.
- `npm run db:seed -- example.csv` loads a different file.
- `npm run db:reset` wipes the database, re-applies migrations and loads `synthetic.csv` again.
- `npm run data:synthetic` regenerates `synthetic.csv`; the output is the same each time.

You can also upload files at `/admin/upload` once signed in (see below).

### Sign-in

Everything is public except uploading and the upload file format on the About page, which need a signed-in
account. There is no self sign-up: an administrator creates each account and passes on the generated password privately.

```sh
npm run user:add -- someone@sickkids.ca --name "Full Name"   # add --admin for the ADMIN role
```

For local testing, `npm run db:seed` (and so `start:local` and `db:reset`) creates a demo account:
**`demo@care-id.test`** / **`careid-demo`**. It is never created when `NODE_ENV=production`.

Running `user:add` again for an existing email resets the password and signs that account out everywhere. Sessions last
12 hours and are stored in the `Session` table (only a SHA-256 of the cookie token is kept).

### Map boundaries

`public/geo/gta-fsa.geojson` (GTA FSAs, simplified) is committed. To rebuild it, download the Statistics Canada
2021 FSA cartographic boundary file `lfsa000b21a_e.zip` in a browser into `data/raw/`, then run `npm run geo:build`.
Boundaries: Statistics Canada, Open Licence. Basemap: CARTO Positron (override with `NEXT_PUBLIC_BASEMAP_STYLE`).

### School list

The kids page (`/kids`) lets children find their area by school name. `public/data/gta-schools.json` is committed and
holds publicly funded schools (public and Catholic; no private schools) whose postal code falls in an FSA on the map,
with only name, address, level, grades, board and school number. To refresh it:

```sh
npm run schools:import                      # finds the current English TXT file in the data.ontario.ca catalogue
npm run schools:import -- --file list.txt   # or use a file downloaded by hand
```

The script reads the dataset's catalogue entry rather than a fixed URL, so the monthly file name can change. It prints
how many rows were kept, outside coverage, excluded (summer, adult, continuing-education and custody programs) or
flagged (e.g. no postal code); flagged rows are listed in the JSON and never guessed. The source URL, licence and
import date are recorded in the file. A school only leads to the FSA of its postal code; schools with a PO box are not placed.
Source: Ontario Ministry of Education, [Ontario public school contact information](https://data.ontario.ca/dataset/ontario-public-school-contact-information).
Contains information licensed under the [Open Government Licence – Ontario](https://www.ontario.ca/page/open-government-licence-ontario).

## Layout

- `src/lib/ingest/` — CSV parse → validate → de-identify → aggregate (pure, unit-tested)
- `src/lib/privacy.ts` — small-cell suppression rules
- `src/lib/metrics.ts` — positivity, rolling windows, activity levels
- `src/lib/test-counts.ts` — weekly test counts for the bar charts (definitive results per virus, after suppression)
- `src/lib/schools.ts`, `src/lib/school-import.ts` — school search and the import parser
- `src/app/globals.css` — design tokens (SickKids Brand Tipsheet palette; `src/lib/brand.ts` for literals)
- `src/lib/auth/` — password hashing and database sessions
- `prisma/schema.prisma` — aggregate-only data model

## Checks

```sh
npm test && npm run typecheck && npm run lint
```
