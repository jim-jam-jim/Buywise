# BUYWISE: Product Requirements Document

**Version 2.0 (revision of Draft v1.0) · Last updated October 25, 2026 · Status: Ready for review**

**Product:** BUYWISE, an independent decision-control layer for AI-assisted shopping **Tagline:** Your AI shops for you. BUYWISE makes sure it shops for you. **Platform:** Responsive web application (mobile, tablet, laptop) **Market and currency:** Consumer e-commerce, India first; INR (₹) default, configurable

## 1. Executive summary

Personal AI agents are starting to search, compare and propose purchases on people's behalf. That convenience removes the moments where people normally check price, fit and risk. BUYWISE restores those moments.

BUYWISE sits between a proposed purchase and the person's money. It evaluates each proposal against rules the user wrote (budgets, limits, required features, return and warranty conditions), returns one of four plain-language verdicts, explains every check, suggests comparable alternatives, and stores a **decision receipt** the user can audit later.

The initial release is a full-stack web application with a fully working demo catalogue. It never presents demo data as live, and it never claims to place, block or cancel a real order unless an authorized integration genuinely does so.

**What success looks like:** a user can set their rules in under three minutes, review a proposed purchase in under one minute, understand exactly why it was allowed, flagged or blocked, and find that decision in their history afterwards.

## 2. Problem and opportunity

When shopping is delegated to an AI agent, users lose visibility over six things:

1. Whether a recommendation reflects their needs or a commercial incentive.
2. Whether a better-value, comparable product exists.
3. Whether the purchase fits their spending limits.
4. Whether the seller, listing, warranty and return terms are acceptable.
5. Which assumptions and preferences shaped the recommendation.
6. What the agent proposed, and why.

**Opportunity:** no mainstream consumer tool today lets a person define purchase rules once and apply them consistently to any proposed purchase, with an explanation and an audit trail. BUYWISE is that tool, built to be honest about what it can and cannot verify.

## 3. Vision and product principles

**Vision:** people benefit from automated shopping while keeping control of their money, preferences and decisions.

| # | Principle | What it means in practice |
| --- | --- | --- |
| 1 | User rules come first | The user's stated interests outrank opaque ranking. |
| 2 | Explain everything | Every verdict lists the checks run, the data used and the result, in plain language. |
| 3 | Deterministic core | Verdicts come from rules, never from a language model. AI may summarize; it never decides. |
| 4 | Hard rules are explicit | A purchase is only blocked by a rule the user configured or a mandatory security condition. |
| 5 | Unknown is not guilty | Missing data is shown as unknown. It is never scored as positive and never treated as fraud. |
| 6 | Provenance is visible | Every product and offer shows its data mode (live, imported, demo) and freshness. |
| 7 | Honest about limits | BUYWISE records and advises. It does not control third-party purchases without a real integration. |
| 8 | Privacy by default | Collect the minimum; let users export and delete everything. |

## 4. Goals, non-goals and success metrics

### 4.1 Goals (initial release)

- G1. Let users define budgets and purchase rules, and test them before relying on them.
- G2. Evaluate any proposed purchase deterministically and return an explainable verdict.
- G3. Help users search, inspect, save and compare products with transparent scoring.
- G4. Produce a persistent decision receipt for every review.
- G5. Deliver a polished, accessible, responsive experience on phone and desktop.
- G6. Ship a working demo provider behind an adapter boundary so real providers can be added later.
- G7. Protect user data, with export and deletion available from day one.

### 4.2 Non-goals (initial release)

- Executing, cancelling or refunding real purchases or payments.
- Guaranteeing the lowest price on the internet.
- Proving hidden manipulation, price discrimination or product authenticity.
- Scraping sites or bypassing provider terms and access controls.
- Automatically intercepting every third-party AI agent.
- Bank-account aggregation or storing card details.
- Continuous price monitoring without a live provider and scheduler.
- Legal, financial or authenticity guarantees.

### 4.3 Success metrics

Targets below are **proposed** and should be confirmed after the first month of usage data.

| Metric | Definition | Proposed target |
| --- | --- | --- |
| Review completion | Reviews that end in a recorded decision ÷ reviews started | ≥ 80% |
| Explanation clarity | Users answering "I understood why" on the review feedback prompt | ≥ 85% |
| Setup speed | Median time from signup to first saved budget or rule | ≤ 3 minutes |
| Review speed | Median time from opening a review to recording a decision | ≤ 60 seconds |
| Alternative discovery | Reviews where the user opens at least one alternative | Track; set target after baseline |
| False-alert rate | Alerts the user dismisses as irrelevant ÷ alerts shown | ≤ 15% |
| Rule adoption | Active users with at least one enabled rule after 7 days | ≥ 60% |
| Decision confidence | Self-reported confidence on a 5-point scale after a decision | Average ≥ 4.0 |

**Guardrails:** do not optimize for conversion or time spent, and do not build sensitive behavioural profiles.

## 5. Users and personas

| Persona | Who they are | Core need | Key features |
| --- | --- | --- | --- |
| A. Budget-conscious shopper | Wants the right product without overspending | Limits that hold, and better-value options surfaced | Budgets, approval threshold, alternatives |
| B. Delegated shopper | Uses or expects to use an AI agent for shopping | Visibility and approval before consequential purchases | Purchase review, hard rules, receipts |
| C. Careful researcher | Compares specs, warranty, seller and total cost | Side-by-side evidence and adjustable priorities | Compare, weights, provenance labels |
| D. Household buyer | Manages category budgets and avoids duplicates | Spending clarity across a household | Category budgets, duplicate warnings, insights |

Persona D's shared-household features are deferred to a later release; initial release supports a single user per account.

## 6. Scope and release plan

Priorities use MoSCoW: **P0** Must, **P1** Should, **P2** Could.

| Priority | Capability |
| --- | --- |
| P0 | Authentication and per-user data isolation |
| P0 | Onboarding (currency, priorities, optional budget; skippable) |
| P0 | Dashboard driven by real application state |
| P0 | Demo catalogue, search and filters, product detail pages |
| P0 | Comparison of 2 to 4 products |
| P0 | Budgets (overall, per category, per transaction) |
| P0 | Deterministic rule engine and purchase review (Allow, Review, Block, Unknown) |
| P0 | Decision receipts and activity history |
| P0 | Watchlist |
| P0 | Data-mode labels, validation, loading, empty and error states |
| P0 | Privacy settings, data export, deletion request |
| P0 | Responsive layout; automated tests for core logic and critical flows |
| P1 | CSV import of products and offers with preview and validation |
| P1 | Demo price alerts; scheduled alerts when a provider exists |
| P1 | Spending insights, in-app notifications, dark mode |
| P1 | Editable comparison weights, rule testing against a sample purchase |
| P1 | Price history (only where real observations exist); email notifications |
| P1 | Accessibility beyond baseline |
| P2 | Natural-language requirement parsing; plain-language trade-off summaries (LLM-assisted, never deciding) |
| P2 | Additional provider adapters; browser extension or mobile wrapper |
| P2 | Shared household budgets; business purchasing controls |
| Won't | Real orders, payments, cancellations, refunds; bank aggregation; seller-authenticity guarantees; universal live tracking |

## 7. The decision model

This section defines BUYWISE's central behaviour. All other features support it.

### 7.1 Verdicts

| Verdict | Meaning | User can proceed in BUYWISE? |
| --- | --- | --- |
| **ALLOW** | Every enabled rule passes and required data is present | Yes; approval is recorded |
| **REVIEW** | At least one rule asks the user to decide (for example over the approval threshold or projected budget) | Yes, after giving a reason |
| **BLOCK** | A hard rule the user configured (or a mandatory security condition) is violated | No, until the user rejects, chooses an alternative or edits the rule |
| **UNKNOWN** | Required data is missing, so safety cannot be confirmed | Yes, after acknowledging the uncertainty |

**Precedence:** BLOCK > REVIEW > UNKNOWN > ALLOW. The strictest triggered outcome wins, and **every** triggered rule is listed, not just the winner.

### 7.2 Rule types

| Rule | Trigger | Outcome | Default |
| --- | --- | --- | --- |
| Hard limit per purchase | Price above the configured amount | BLOCK | Off |
| Approval threshold | Price above the configured amount | REVIEW | On |
| Category monthly budget | Approved spend plus this purchase exceeds the budget | REVIEW | On |
| Required attributes | A required specification is missing or below minimum | REVIEW | Off |
| Seller rule | Seller data exists and violates a configured condition | REVIEW or BLOCK (user choice) | Off |
| Non-returnable item | Return data exists and states no returns | REVIEW | On |
| Duplicate purchase | Similar item already approved in the same category and period | REVIEW | On |
| Missing data | Warranty, return or other required data not provided | UNKNOWN | On |

Rules can be created, edited, duplicated, enabled, disabled, tested and deleted.

### 7.3 Worked example (the demo scenario)

Setup: electronics budget ₹20,000 per month, approval threshold ₹10,000, no hard limit.

- A simulated agent proposes the **Nimbus Air 14 laptop at ₹55,000**.
- Approval threshold fails (₹55,000 > ₹10,000) → REVIEW.
- Category budget fails (projected ₹55,000 > ₹20,000) → REVIEW.
- Return terms and warranty are present → pass.
- Two comparable cheaper alternatives are found with equal or better specifications.
- **Verdict: REVIEW.** The receipt lists both triggered rules, the alternatives and the user's decision.

If the user then enables a ₹50,000 hard limit, the same proposal becomes **BLOCK**, and the receipt says it was blocked *inside BUYWISE only*.

## 8. Functional requirements

Each requirement has an ID. Acceptance criteria are written to be directly testable.

### FR-1 Account and authentication (P0)

- FR-1.1 Users can sign up, log in, log out and manage their account.
- FR-1.2 Passwords are hashed by a reputable authentication library; plaintext is never stored.
- FR-1.3 Protected routes and APIs require a valid session.
- FR-1.4 Every query on user-owned records is scoped to the authenticated user.

**Acceptance:** a new user can register and sign in. An unauthenticated request to any protected page or API is rejected. User A cannot read or modify User B's budgets, rules, watchlist, reviews or history.

### FR-2 Onboarding and preferences (P0)

- FR-2.1 Users choose currency (INR default), optional monthly budget, shopping priorities (price, quality, durability, warranty, delivery, sustainability) and an approval threshold.
- FR-2.2 Every onboarding step is skippable; settings remain editable later.
- FR-2.3 The product states that preference scores are decision aids, not objective facts.

**Acceptance:** settings persist across refresh and new sessions. Optional fields can stay blank.

### FR-3 Product search and discovery (P0)

- FR-3.1 Search by name, brand, model, category and keyword.
- FR-3.2 Filter and sort only on fields present in the data.
- FR-3.3 Add products to comparison and watchlist from results.
- FR-3.4 Show source, data mode and timestamp where available.

**Acceptance:** results match query and filters. Empty results show a helpful empty state. Demo products are labelled. Ratings, review counts, discounts and availability are never invented.

### FR-4 Product detail (P0)

- FR-4.1 Show identity, variant, specifications, offers, known fees, seller, warranty, return terms, source URL and last-updated time where data exists.
- FR-4.2 Show alternatives and missing-data warnings.
- FR-4.3 Offer actions: save, compare, set price alert, review purchase.

**Acceptance:** missing fields read "Not provided". External links use the stored source URL. Price history appears only when real observations exist.

### FR-5 Comparison (P0, weights P1)

- FR-5.1 Compare 2 to 4 products side by side; add and remove freely.
- FR-5.2 Users set weights for supported attributes (P1); defaults apply otherwise.
- FR-5.3 Show per-attribute scores, trade-offs and missing information.
- FR-5.4 Name a "best match" only when every compared product has data for every weighted attribute.

**Scoring rule:** each attribute is normalized across the compared set (price inverted, so lower is better); the score is the weighted average. **Missing values score zero and are flagged**, never positive.

**Acceptance:** changing a weight recalculates immediately. The reasons behind each score are inspectable.

### FR-6 Budgets (P0)

- FR-6.1 Support overall monthly, category and per-transaction budgets with create, edit, disable and delete.
- FR-6.2 Show spent, pending and remaining separately.
- FR-6.3 Configurable alert thresholds (for example at 80% used).
- FR-6.4 Money uses decimal-safe arithmetic with explicit currency codes.
- FR-6.5 Cancelled and refunded items follow documented rules; no bank data is required.

**Acceptance:** a reviewed purchase updates projected impact correctly to the paisa. Budget calculations are unit tested.

### FR-7 Purchase rules (P0)

- FR-7.1 Support the rule types in section 7.2 with the precedence in section 7.1.
- FR-7.2 Rule evaluation is deterministic: the same inputs always give the same verdict.
- FR-7.3 Users can test a rule against a sample purchase (P1).

**Acceptance:** all triggered rules are listed. A BLOCK requires an explicit configured rule or mandatory security condition. Missing data never produces a fraud label.

### FR-8 Decision Shield: purchase review (P0)

- FR-8.1 A review starts from a product or a manual demo proposal.
- FR-8.2 It evaluates budget, required features, alternatives, seller and listing data, disclosed commercial incentives, return terms and user rules.
- FR-8.3 It returns ALLOW, REVIEW, BLOCK or UNKNOWN with an explanation and evidence per check.
- FR-8.4 The user records a decision: approve, reject or switch to an alternative. REVIEW and UNKNOWN approvals require a reason.
- FR-8.5 The interface never states that an external purchase was blocked, placed or cancelled without a real supporting integration.

**Acceptance (Given/When/Then):**

- Given a ₹50,000 hard limit is enabled, when a ₹55,000 purchase is reviewed, then the verdict is BLOCK.
- Given a ₹10,000 approval threshold, when a ₹12,000 purchase is reviewed, then the verdict is REVIEW.
- Given a product with no return data and the missing-data rule enabled, when it is reviewed, then an UNKNOWN check appears.
- Given any completed review, then a receipt exists and appears in history after refresh.

### FR-9 Watchlist and price alerts (P0 watchlist, P1 alerts)

- FR-9.1 Add, remove, pause, edit and delete watchlist items and target-price alerts.
- FR-9.2 Demo alerts are labelled **Simulated**. Live alerts are enabled only when a provider and scheduler are configured.
- FR-9.3 Each alert shows last-checked time and live or simulated status.

**Acceptance:** watchlist changes persist. Alert evaluation is unit tested.

### FR-10 History and decision receipts (P0)

- FR-10.1 Record reviews, rule triggers, comparisons, approvals, rejections, overrides and relevant settings changes.
- FR-10.2 Filter history and open event details.
- FR-10.3 Never log secrets or unnecessary sensitive details.

**Receipt contents:** receipt ID, timestamp, product and price, verdict, every triggered rule ID with explanation, alternatives shown, user decision and reason, data-source references and data mode.

**Acceptance:** users can only see their own history. Actions appear after refresh.

### FR-11 Insights and notifications (P1)

- FR-11.1 Show spending by category and budget usage from stored records.
- FR-11.2 Separate **potential savings** (an alternative the user chose) from **confirmed savings** (evidenced by real order data). Confirmed savings stay zero in demo mode.
- FR-11.3 In-app notifications for review requests, budget thresholds and alerts; each links to its record; users can disable optional categories.

**Acceptance:** no fabricated totals are ever displayed.

### FR-12 Import and export (P1 import, P0 export)

- FR-12.1 CSV import of product and offer data with a preview and row-level validation before commit.
- FR-12.2 Export user-owned data as JSON and CSV.
- FR-12.3 Account deletion request with documented behaviour.

**Acceptance:** invalid rows are reported before anything is imported. File type and size are restricted. CSV exports neutralize spreadsheet formula injection (cells beginning with =, +, -, @). Export and deletion require authentication and explicit confirmation.

### FR-13 Integrations and data provenance (P0)

- FR-13.1 Provider adapters supply search, offers, seller data and price history.
- FR-13.2 Ship with a fully working demo provider. Later sources must be official APIs, licensed feeds or user-provided data.
- FR-13.3 Every product and offer carries a data mode: **live**, **imported** or **demo**.

**Acceptance:** the interface never mixes modes without clear separation. Provider failures show as stale or unavailable, never silently replaced with fake live values.

### FR-14 Privacy and security (P0)

- FR-14.1 Validate all input server-side and authorize every protected read and write.
- FR-14.2 Protect session cookies and state-changing requests against forgery.
- FR-14.3 Keep secrets in environment variables; never commit them.
- FR-14.4 Never store card or banking credentials.
- FR-14.5 Disclose clearly what data is shared with any external provider.

**Acceptance:** automated tests prove cross-user isolation. Errors never expose stack traces. Integration scopes follow least privilege.

## 9. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | Pages interactive in ≤ 2.5 s on a mid-range phone over 4G; rule evaluation returns in ≤ 300 ms; search results in ≤ 1 s for the demo catalogue |
| Accessibility | WCAG 2.2 AA where practical: semantic HTML, visible focus, full keyboard operation, labelled controls, contrast, reduced-motion support, screen-reader announcements, text summaries for charts |
| Responsiveness | No horizontal page overflow from 320 px width upward; touch targets ≥ 44 px |
| Reliability | Data writes are atomic; failed saves show a clear error and preserve the user's input |
| Security | OWASP ASVS-aligned baseline; rate limiting on authentication; dependency vulnerability scanning in CI |
| Privacy | Data minimization; user-initiated export and deletion; analytics free of personal content |
| Compatibility | Current and previous major versions of Chrome, Safari, Firefox and Edge; iOS Safari and Android Chrome |
| Localization | INR and English at launch; currency, number and date formatting follow locale |
| Maintainability | Provider adapters and the rule engine are isolated modules with their own tests |

## 10. UX and UI requirements

### 10.1 Visual direction

Calm, premium and trustworthy, in the spirit of consumer finance. Light mode by default with optional dark mode. Neutral backgrounds, restrained navy and blue accents. Status colours carry meaning and are never used alone:

| Status | Colour | Always paired with |
| --- | --- | --- |
| Allow / within rules | Green | Check icon and the word "Allowed" |
| Review | Amber | Alert icon and the words "Review required" |
| Block | Red | Cross icon and the words "Blocked by your rule" |
| Unknown | Grey | Question icon and the word "Unknown" |

Avoid cluttered dashboards, excess gradients and decorative charts. A persistent **Demo data** indicator is visible whenever demo data is in use.

### 10.2 Layout

- **Desktop:** collapsible sidebar; top bar with search, notifications, help and profile; content capped at a readable width; contextual review panels.
- **Tablet:** collapsed sidebar; two-column content where space allows.
- **Mobile:** bottom navigation; single-column cards and forms; comparison as labelled cards or a scrollable table with a sticky label column; sticky actions never hide content.

### 10.3 Information architecture

| Route | Purpose |
| --- | --- |
| `/` | Entry page or redirect |
| `/login`, `/signup` | Authentication |
| `/onboarding` | Preferences and first budget |
| `/dashboard` | Budget status, recent reviews, pending proposals |
| `/shop` | Search and discovery |
| `/product/[id]` | Product detail |
| `/compare` | Side-by-side comparison |
| `/review/[id]` | Purchase review and decision |
| `/budgets`, `/rules` | Budgets and purchase rules |
| `/watchlist` | Saved products and alerts |
| `/history` | Decision receipts and activity |
| `/insights` | Spending and savings insights |
| `/notifications` | In-app notifications |
| `/settings/profile`, `/settings/privacy`, `/settings/integrations` | Account, data controls, providers |
| `/help` | Guidance and glossary |

Every route defines loading, empty, error and success states.

### 10.4 Content principles

Plain language and sentence case. Buttons name the action ("Approve and record", not "Submit"). Errors say what happened and how to fix it. Unknown data is labelled "Not provided".

## 11. Data model

Use non-guessable IDs, decimal money types with currency codes, timestamps, foreign keys and indexes. All user-owned entities are authorized per user.

| Entity | Key fields | Notes |
| --- | --- | --- |
| User | id, email, passwordHash, createdAt | Managed by the auth library |
| UserPreference | userId, currency, priorities, approvalThreshold | One per user |
| Budget | userId, scope (overall, category, transaction), category, amount, currency, period, alertAt, enabled | Decimal amounts |
| PurchaseRule | userId, type, parameters, outcome, enabled, order | Evaluated deterministically |
| Product, ProductVariant | brand, model, category, specifications, identifiers | Match on model and variant IDs |
| Offer | variantId, sellerId, price, fees, warranty, returnWindow, sourceUrl, dataMode, observedAt | dataMode is required |
| Seller | name, attributes | Fields may be null |
| PriceObservation | offerId, price, observedAt, dataMode | Only real observations |
| WatchlistItem, PriceAlert | userId, productId, targetPrice, mode (live or simulated), lastCheckedAt |  |
| ProductComparison | userId, productIds, weights |  |
| PurchaseReview, PurchaseReviewCheck | userId, productId, price, verdict; per check: ruleId, status, explanation, evidence |  |
| DecisionReceipt | reviewId, decision, reason, createdAt, sourceRefs | Immutable after creation |
| Notification | userId, type, link, readAt |  |
| ProviderConnection | userId, provider, scopes, status | Secrets stay on the server |
| ImportJob | userId, status, rowErrors |  |
| AuditEvent | userId, action, entity, createdAt | No secrets logged |

## 12. Architecture and integrations

### 12.1 Recommended stack

Next.js, React and TypeScript; Tailwind CSS with reusable primitives; Lucide icons; PostgreSQL with Prisma; an established authentication library; Zod for validation; Vitest or Jest and Playwright for tests; Docker Compose or documented local database setup. An existing repository's suitable stack takes precedence.

### 12.2 Module boundaries

Auth and profile · Preferences and budgets · Product catalogue · Provider adapters · Search and comparison · Rules and purchase evaluation · Watchlist and alerts · Receipts and history · Notifications · Import and export · Privacy and audit logging.

### 12.3 Provider adapter contract

Each adapter implements: `searchProducts(query, filters)`, `getOffers(productId)`, `getSeller(sellerId)` and `getPriceHistory(productId)`. Each response includes `dataMode`, `fetchedAt` and `sourceUrl`. Adapters must handle failure explicitly by returning a stale or unavailable status. The demo adapter ships first. API and LLM keys stay on the server.

### 12.4 Role of AI

AI is optional (P2) and limited to parsing natural-language requirements and summarizing trade-offs from supplied data. Outputs are validated, cite their inputs, and **never** change a verdict.

## 13. Analytics

Collect minimal, privacy-conscious product events: review started, review completed, verdict shown, alternative opened, rule created, alert created, export requested. Events carry no product search text or personal content. Metrics are those in section 4.3.

## 14. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| No real marketplace API available | High | High | Working demo provider; documented adapter boundary; CSV import |
| Incorrect product matching | Medium | High | Match on model and variant identifiers; show uncertainty |
| Stale prices | High | Medium | Timestamps and freshness status; suppress stale alerts |
| False seller-risk flags | Medium | High | Show evidence; keep unknown distinct from risky |
| Overblocking | Medium | Medium | Blocks only from explicit user rules; easy rule editing |
| LLM hallucination | Medium | High | Deterministic core; AI never decides; validated, cited output |
| Privacy leakage | Low | High | Data minimization, per-user authorization, export and deletion |
| Misleading savings claims | Medium | High | Count only evidenced savings; label potential savings |
| Users assume BUYWISE controls real orders | Medium | High | Persistent plain statement of limits; receipts say what was recorded |
| Scope too large for first release | High | Medium | Strict P0 focus; P1 items cut first |

## 15. Testing and release criteria

### 15.1 Unit tests

Budget maths and money precision · Rule precedence · All four verdict outcomes · Comparison weighting and missing-data handling · Alert evaluation · CSV validation · Savings evidence rules.

### 15.2 Integration tests

Authentication and authorization · Budget and rule CRUD · Watchlist and alerts · Review and receipt creation · CSV import and export · **Cross-user data isolation**.

### 15.3 End-to-end scenarios

1. Sign up and complete onboarding.
2. Search and compare products.
3. Set a budget and a hard rule.
4. Submit a purchase above the limit.
5. Inspect triggered rules and alternatives.
6. Record a decision and confirm history updates.
7. Save a product and create a demo alert.
8. Export personal data.
9. Verify mobile navigation.

### 15.4 Release checklist

- Application starts from the documented commands; migrations and seeds work.
- Authentication, authorization and core routes work.
- Mobile and desktop layouts are usable; primary controls function.
- Data persists after refresh.
- Demo, live and imported data are visibly distinct.
- Tests, lint, type-check and production build pass, or failures are reported.
- No committed secrets; no unresolved critical security issues.
- README documents setup, limits and integrations.

## 16. Milestones

| Milestone | Scope | Exit criteria |
| --- | --- | --- |
| M1 Foundation | Auth, data model, demo provider, seed data | Users sign in; data isolated |
| M2 Core decision flow | Rules, budgets, review, receipts | Demo scenario works end to end |
| M3 Discovery | Shop, product detail, compare, watchlist | Search, compare and save work |
| M4 Trust and polish | Privacy, export, accessibility, responsive QA, empty and error states | Release checklist passes |
| M5 P1 features | Import, alerts, insights, notifications, dark mode | P1 acceptance criteria met |

## 17. Assumptions, dependencies and open questions

**Assumptions:** initial users are in India; a single user per account; demo data is sufficient to prove the concept.

**Dependencies:** a hosting environment with PostgreSQL; an authentication library; any future provider's terms and credentials.

**Open questions:**

1. Which official provider or feed should be integrated first?
2. Should email notifications be in the first release or deferred?
3. What retention period applies to receipts after account deletion is requested?
4. How should refunds and cancellations adjust budgets when no order data is available?
5. Is a browser extension the right next step for intercepting agent proposals?

## 18. Definition of done

BUYWISE is ready for initial release when a user on mobile and desktop can create an account, set preferences and budgets, search and compare products, run a purchase review, see explainable rule results, record a decision, manage a watchlist and demo alert, review their history and insights, and export or request deletion of their data.

## Appendix A: Capability honesty matrix

| Capability | Initial release status |
| --- | --- |
| Rule engine, verdicts, receipts, budgets, comparison | Fully functional |
| Product catalogue, prices, availability | Simulated (demo data, labelled) |
| Price alerts | Simulated until a provider and scheduler exist |
| Seller and listing verification | Depends on provider data; unknown when absent |
| Blocking or cancelling third-party orders | Not supported; requires authorized integration |
| Live price tracking | Not supported until a permitted provider is configured |
| Email notifications | Depends on email service configuration |
