# BUYWISE

An independent purchase decision workspace. Set budgets and purchase rules, compare products, review proposals, and retain an explainable decision receipt. BUYWISE records intentions; it does not place, cancel, refund, or block orders on other platforms.

Built with Next.js 16, React 19, TypeScript, PostgreSQL, Prisma 7's JavaScript driver, Better Auth, and Zod. The UI is responsive, keyboard accessible, and supports light and dark appearance. No LLM makes purchase decisions.

## Run locally

Requirements: Node.js 24, npm, and a Linux/macOS machine supported by `embedded-postgres`, or an existing PostgreSQL database. No paid services are needed for local development.

```sh
npm ci
npm run setup:local
npm run db:generate
npm run db:local
```

Keep the database terminal running. In another terminal in the same repository:

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Open the application on port 3000. Create an account; there is no shared account or default password. Local configuration generates random database and authentication secrets in the ignored `.env`. Existing configuration is preserved. Local PostgreSQL listens only on `127.0.0.1:54329`, uses SCRAM authentication, and retains its data in `.local/postgres`. Stop with Ctrl+C. Database and app processes must be restarted after a machine restart.

`db:seed` is repeatable. It creates 12 explicitly fictional catalogue products and does not overwrite existing observations or user data. `setup:local` never overwrites an existing `.env`.

For a managed PostgreSQL instance, configure `DATABASE_URL` and skip `setup:local` and `db:local`. Use the settings described in `.env.example` and enable certificate verification for remote database connections. Migrations are checked in under `prisma/migrations`.

## Production

Use a Node.js host and durable PostgreSQL storage. Configure `DATABASE_URL`, a randomly generated `BETTER_AUTH_SECRET` (at least 32 bytes), and `BETTER_AUTH_URL` with the exact public HTTPS origin. Then run:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run build
npm start
```

Seed the demo provider only when you want it available. Terminate TLS at your trusted reverse proxy. Cookies become Secure for an HTTPS `BETTER_AUTH_URL`; the app rejects mutation requests whose Origin differs. Never expose the development database publicly. Back up PostgreSQL using your hosting provider; deployment and backups are not performed by this repository.

The authentication rate limiter uses Better Auth's process memory. Use one application instance initially; configure shared rate-limit storage before horizontally scaling. Email verification, password recovery emails, and email notifications require an email provider and are not configured. Users can change their password while signed in. Account deletion is immediate, including receipts, and invalidates sessions.

## Live catalogue: eBay

The application includes an official eBay Browse API integration. eBay offers developer API quotas without a per-request payment requirement, subject to their current terms, application approval and rate limits. An authorized production application access token is still required; BUYWISE cannot create a developer account or obtain consent on your behalf.

1. Create an eBay developer account and obtain production Browse API access: https://developer.ebay.com/api-docs/buy/browse/overview.html
2. Obtain an application OAuth access token with the Browse scope from your developer account: https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html
3. Supply `EBAY_ACCESS_TOKEN` securely on the server (or through the cloud environment's HTTPS proxy secret binding for `api.ebay.com`). Never paste credentials into chat or commit them.
4. Restart the application if your host injects environment variables at process startup. Open Discover → Live · eBay and search.

Tokens are short-lived. This initial connection accepts a pre-issued token and reports expiration; it does not store client secrets or automatically renew tokens. The provider is restricted to the **US marketplace**, preserves original currencies, and does not invent an INR conversion. Access is read-only. Only the search query is sent to eBay; budgets, rules, preferences and decision reasons stay in BUYWISE. Errors are explicit; there is no fallback to fake live data. Warranty, return terms, delivery fees, and specifications are unknown when the search API does not supply them. Live alerts, a scheduler, and email delivery are not connected.

**Live access has not been verified without an authorized token.** Product workflows and the provider's success/error parsing are tested separately. A deployment with real data requires this connection or an authorized CSV import.

## Import real product data

Settings → Providers & imports accepts a CSV from an authorized source. Products are private to the importing user and labelled **Imported**. Preview and row-level validation run before the atomic import. Maximum 500 rows and 500 KB.

Required columns:

```csv
name,brand,model,category,price,currency,sourceUrl
```

Optional: `warrantyMonths`, `returnDays`, `seller`. Prices are decimal major units, such as `1234.56`; allowed currencies are INR, USD, GBP and EUR. Source URLs must use HTTPS. Missing warranty and returns stay unknown. One row represents one identified variant/offer; no matching or cross-seller authenticity is inferred.

## Decision and money semantics

- Monetary values are integer minor units (paise/cents), validated at the server boundary. No floating-point currency accumulation or silent FX conversion.
- Verdict precedence: **BLOCK > REVIEW > UNKNOWN > ALLOW**. All checks and their evidence are retained. Only an enabled hard limit or an explicit blocking seller rule can block approval.
- Budget and approval thresholds request review. Required numeric specifications, non-returnable items and duplicate category purchases request review. Unknown seller data does not imply seller misconduct.
- Overall and category budgets count approved intentions in the calendar month of approval in `Asia/Kolkata`. Pending proposals appear separately. Per-purchase budgets check only the current total.
- User-scoped row locks and database transactions serialize review decisions with rule/budget changes. Approvals re-evaluate current rules and spending. A pending review can also be rechecked explicitly after editing rules.
- REVIEW and UNKNOWN approvals require a reason. BLOCK cannot be approved. All completed decisions create an immutable snapshot receipt. Switching records the old decision and starts an independently evaluated review for the alternative; it does not auto-approve it.
- Rejected and switched proposals do not count as approved spending. There is no external payment evidence: refunds and cancellations are never inferred and prior receipts cannot be rewritten. A new review can record changed intent.
- Potential savings count only approved, lower-priced alternatives selected from a prior review. Confirmed savings stay zero because no order verification exists.
- Comparison normalizes each weighted numeric attribute across the selected set, inverts price, gives missing attributes zero, and names no best match when weighted data is missing or currencies differ. Equal known values tie. An all-zero weighting cannot be saved.
- Demo alerts are on-demand simulations. Alerts use a freshness gate; live/imported monitoring is unavailable. Optional notifications can be disabled.

## Security and privacy

Better Auth handles password hashing and opaque server sessions. Every protected page and API checks the session; user-owned queries are scoped to the session user. There are no client-supplied owner IDs. PostgreSQL foreign keys cascade account deletion through all private data. All source imports are server-validated, mutations verify Origin, and app errors omit internal stack traces. Export requires explicit confirmation and omits authentication credentials. CSV exports neutralize spreadsheet formulas. No payment credentials or tracking analytics are collected.

Review reasons may contain personal information. Keep database backups private and align any external backup retention policy with the account deletion promise. Do not include `.env`, `.local`, traces, screenshots or test artifacts in version control.

## Verification

Run against a separate development/test database; integration tests create accounts and records.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
# in another terminal, with the app and database running:
npm run test:browser
npm audit --omit=dev
```

`test:browser` uses the Chromium binary distributed through the integrity-checked `@sparticuz/chromium` npm package on supported Linux machines. It removes that package's disabled-browser-security flags before testing. On other platforms use the standard Playwright installation:

```sh
npx playwright install --with-deps chromium
npm run test:e2e
```

The browser suite exercises signup/onboarding, product search and comparison, a blocking rule, a rejected receipt, watchlist and simulated alert, export, persistence, mobile layout, and data isolation. API integration checks cover CSRF, concurrent approvals, reason enforcement, immutable decisions, import validation, and account deletion. Unit tests cover money, verdict precedence, rule types, budget periods, missing data, comparison, alert freshness, CSV safety, and provider response handling.

CI runs lint, type-check, unit tests, build, browser/API tests, and dependency auditing using a disposable PostgreSQL service. Performance on real mobile networks and cross-browser certification require further deployment testing; no universal performance claim is made.

## Repository map

- `src/lib/engine.ts`: pure deterministic rules, budget math, comparison and alert logic.
- `src/lib/providers.ts`, `src/lib/ebay.ts`: catalogue provenance and external provider boundary.
- `src/app/api/`: authenticated, validated data operations.
- `src/components/`: connected product screens and reusable UI.
- `prisma/`: schema, versioned migration and labelled demo seed.
- `tests/`: unit, browser and API integration tests.
- `docs/PRD.md`: supplied product requirements, retained as the product specification.

Deferred capabilities match the PRD's integration dependencies: external orders/payments, live alert scheduling, email delivery, AI summaries and household accounts. No paid provider is activated by this project.
