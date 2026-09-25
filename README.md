# Veath Crafted

Local US-first prototype for made-to-order natural soap. The page follows one path: check water, see every starting ingredient, then request a custom bar. Customers can also request a soap consultation before the recipe is finalized. The storefront does **not** collect payment, send email, or book appointments.

## Edit the storefront

Change the business name, headline, ingredient list, scent and texture choices, and starting price in [lib/shop-content.ts](lib/shop-content.ts). The page and order API use this same file, so the displayed price and saved estimate stay aligned. The product ID is an internal database value; leave it as `custom-bar` unless you also plan to migrate existing orders.

The listed ingredients are an example starting formula. Replace them with your real recipe when it is ready. The page says that exact amounts and the final ingredient list are confirmed before production. The temporary public contact address and privacy page text are in `components/Experience.tsx` and `app/privacy/page.tsx`.

## Run locally

Requires Node.js 22.13 or newer. From this directory:

```powershell
npm.cmd ci
npm.cmd run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_smiling_pestilence.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_new_tusk.sql
npm.cmd run dev
```

Open the printed local URL. Apply each migration only once to a local database. If you already have the original database, apply only `0001_new_tusk.sql`. On subsequent runs, use `npm.cmd run dev`. Local order data lives in ignored `.wrangler/state`, while the schema migrations stay with the source.

To inspect local order requests:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --command "SELECT id, created_at, status, customer_name, customer_email, base, quantity, consultation_requested, consultation_notes, estimated_total_cents FROM orders ORDER BY created_at DESC"
```

## Water data

- ZIP geocoding: [Zippopotam.us](https://www.zippopotam.us/). It supplies an approximate ZIP location, not a customer's address or tap source.
- Public water supplier candidates: [EPA Public Water System Service Areas](https://www.epa.gov/ground-water-and-drinking-water/public-water-system-service-areas), version 3. Boundaries can be modeled, incomplete, or overlap. The customer must confirm their supplier.
- Public system snapshot: the selected system ID is checked against [EPA ECHO drinking-water services](https://echo.epa.gov/tools/web-services/facility-search-drinking-water). The page shows its primary source-water type, the number of quarters with reported violations in the past three years, and a link to the detailed EPA report when available. [EPA says](https://echo.epa.gov/help/facility-search/drinking-water-search-results-help) these compliance records are delayed and cannot answer current tap-water questions. Violations may concern monitoring or reporting; the number is not a water-safety score.
- The [annual Consumer Confidence Report](https://www.epa.gov/ccr) can provide more specific utility water-quality details. The site links to EPA's report finder, since report availability and format vary by utility.
- Hardness classes: [USGS](https://pubs.usgs.gov/gip/gw/glossary.html): soft 0–60, moderately hard 61–120, hard 121–180, very hard above 180 mg/L as CaCO₃. Supplier lookup does not provide hardness. Customers can enter a utility or tap-test reading.

## Before accepting paid orders

Replace the working brand, example ingredient list, and starting price with the actual business details. Specify bar size, production lead time, shipping rules, final formula disclosures, and any ingredient/allergen notices. Add an authenticated owner view or private order notifications, payment checkout, spam protection, and a privacy policy before public launch. The current order flow is a quote request saved to D1, so no order is charged or automatically emailed.

The app uses Vinext with a Cloudflare-compatible D1 binding named `DB`. `.openai/hosting.json` records that binding for a later Sites deployment.

`GET /api/health` checks the D1 binding and returns `{ "ok": true, "database": "ok" }` when order storage is available. It exposes no order details.
