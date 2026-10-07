# Veath Crafted

US-first storefront for made-to-order natural soap and finished batches. Custom bars remain reviewed quotes: customers can choose ingredients they prefer or wish to avoid, and can optionally describe their water or request a consultation. The owner can manage ingredients and ready-made soaps at `/studio`. Finished batches can use Stripe-hosted Checkout after payment setup; card details never enter this Site.

The public site has four routes: `/` introduces the choices, `/shop` lists available finished batches (or an empty state), `/custom` holds the quote form and optional water check, and `/ingredients` explains the current starting formula. The shared navigation links to each page. The studio controls the ingredient and ready-made listings shown on these pages.

## Edit the storefront

Change the business name, headline, scent, and texture choices in [lib/shop-content.ts](lib/shop-content.ts). The starting price is zero until you set a real price; custom requests are quoted after review. The product ID is an internal database value; leave it as `custom-bar` unless you also plan to migrate existing orders.

The listed ingredients are an example starting formula. The first ingredient edit in `/studio` copies them into D1, where you can add, edit, or remove them from the public site. Mark an ingredient as part of the starting bar and/or selectable for a customer's quote. The final formula and amounts are confirmed before production; customer choices are preferences, not an automatically generated recipe. Ready-made batches have a separate fixed ingredient list for each listing. The public contact address is `shopContent.contactEmail` in `lib/shop-content.ts`.

## Protected shop studio

`/studio` uses Sites' ChatGPT sign-in and a server-side email allowlist. Set `ADMIN_EMAILS` through Sites to comma-separated authorized addresses; a hidden URL alone is not access control. Both the page and every catalog/photo write check identity, and writes also require a same-origin request. No admin email configured means access is denied. The current intended addresses are `cveath@icloud.com,daughertybrad56@gmail.com`.

The studio starts with a **Homepage photo** section. An owner can preview and upload a replacement JPG, PNG, or WebP image, edit its screen-reader description, or restore the bundled default. The chosen image is stored in R2 and its setting in D1; it appears in the home-page hero without a code deployment. The same editor can publish or remove finished bars, set the price and available quantity, write the actual ingredient list, and upload an optional product photo to R2. Removal unpublishes a listing or ingredient rather than erasing order history. No finished bars are seeded or published by default. The studio also shows recent paid orders for fulfillment.

## Ready-made Stripe Checkout

Payment is off by default. Configure these server-side Sites values before switching `CHECKOUT_ENABLED` from `0` to `1`:

- `STRIPE_SECRET_KEY` — Stripe secret key, stored as a Sites secret.
- `STRIPE_WEBHOOK_SECRET` — signing secret for `https://veathcrafted.com/api/stripe-webhook`, stored as a Sites secret.
- `SHIPPING_CENTS` — fixed US shipping charge in cents, including `0` if shipping is included in the bar price.
- `CHECKOUT_ENABLED` — set to `1` only after test checkout, webhook delivery, shipping, and tax settings are reviewed. While off, listed bars use an email inquiry link.

In Stripe, send `checkout.session.completed` and `checkout.session.expired` events to the webhook URL. The site creates a new Stripe-hosted Checkout Session for each purchase. It uses the server's stored price, reserves the requested bars for about 31 minutes, and releases them on the signed expiration event. Signed paid events mark an order paid and email the owner inbox through Resend. Fulfillment must be confirmed against Stripe; the browser success page is not proof of payment. Checkout currently accepts cards, one soap type per session, and US shipping with a flat charge. No live product or price has been added yet.

## Request email

The Site uses Resend for owner notifications. Set the following **server-only runtime values** through Sites; never put a key in source or a browser bundle:

- `RESEND_API_KEY` — secret API key with sending permission.
- `ORDER_EMAIL_FROM` — a sender on a domain verified for sending in the same Resend account, such as `Veath Crafted <orders@veathcrafted.com>` **after** that domain is verified. The iCloud contact address is a recipient and reply contact, not an authenticated sender for a domain the business controls.
- `ORDER_EMAIL_TO` — owner notification inbox: `cveath@icloud.com`.

Resend accepts one branded HTML message with a plain-text version addressed to the owner inbox, with the customer's email as `reply_to`. It includes the reference, customer and delivery details, ingredient preferences, water details, consultation notes, and starting estimate. Its idempotency key is derived from the stored request ID. **An accepted API call is not proof of inbox delivery**; check the inbox and provider delivery events with a real test request.

The order is saved before the notification is attempted. If email is missing or rejected, the API still returns the saved reference and the form directs the customer to email that reference to the public contact address. The saved request remains in D1 for manual recovery. This initial implementation does not automatically retry failed mail or email the customer.

## Run locally

Requires Node.js 22.13 or newer. From this directory:

```powershell
npm.cmd ci
npm.cmd run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_smiling_pestilence.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_new_tusk.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_steady_wendell_rand.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_clean_hiroim.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0004_brainy_deathbird.sql
npm.cmd run dev
```

Open the printed local URL. Apply each migration only once to a local database. If you already have migrations 0000 and 0001, apply only 0002 through 0004. On subsequent runs, use `npm.cmd run dev`. Local data lives in ignored `.wrangler/state`, while the schema migrations stay with the source.

To inspect local order requests:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --command "SELECT id, created_at, status, customer_name, customer_email, base, quantity, consultation_requested, consultation_notes, estimated_total_cents FROM orders ORDER BY created_at DESC"
```

## Water data

- ZIP geocoding: [Zippopotam.us](https://www.zippopotam.us/). It supplies an approximate ZIP location, not a customer's address or tap source.
- Public water supplier candidates: [EPA Public Water System Service Areas](https://www.epa.gov/ground-water-and-drinking-water/public-water-system-service-areas), version 3. Boundaries can be modeled, incomplete, or overlap. The customer must explicitly select a supplier after checking their bill, even if only one candidate appears. They can enter a utility name manually when the map misses it; that name has no EPA system ID or automatic EPA snapshot.
- Public system snapshot: the selected system ID is checked against [EPA ECHO drinking-water services](https://echo.epa.gov/tools/web-services/facility-search-drinking-water). The page shows its primary source-water type, a link to the detailed EPA report when available, and compliance history under an explanation. [EPA says](https://echo.epa.gov/help/facility-search/drinking-water-search-results-help) these compliance records can lag and cannot answer current tap-water questions. Violations may concern monitoring or reporting; the number is not a water-safety score.
- The [annual Consumer Confidence Report](https://www.epa.gov/ccr) can provide more specific utility water-quality details. The site links to EPA's report finder, since report availability and format vary by utility.
- Hardness classes: [USGS](https://www.usgs.gov/water-science-school/science/hardness-water): soft 0–60, moderately hard 61–120, hard 121–180, very hard above 180 mg/L as CaCO₃. One grain per gallon is about 17.1 mg/L. Supplier lookup does not provide hardness. Customers can enter a utility or tap-test reading, identify its source, and report low lather, residue, or slippery rinsing. The API stores hardness in mg/L and adds reading provenance and washing observations to the request notes.
- A home softener may change the tap water from a utility's published figures. Private well users are directed to [EPA well testing guidance](https://www.epa.gov/privatewells/protect-your-homes-water). Water profile copy discusses lather and rinse feel; it does not claim a measured safety assessment or automatically select a final soap formula.

## Before accepting paid orders

Add the real ready-made batch details, including ingredients, bar size, price, available quantity, and a shipping policy. Configure Stripe and verify a test payment plus signed webhook before setting `CHECKOUT_ENABLED=1`. The custom bar flow remains a quote request saved to D1; it never charges the customer.

The app uses Vinext with a Cloudflare-compatible D1 binding named `DB`. `.openai/hosting.json` records that binding for a later Sites deployment.

`GET /api/health` checks the D1 binding and reports `emailNotifications: "configured"` only when all three mail settings are present. That field confirms configuration is present, not that Resend has verified the domain or delivered an email. It exposes no order details or secrets.
