'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Wallet,
  Bookmark,
  Search,
  Plus,
  Check,
  Download,
  X,
  Clock,
  ChevronRight,
  Scale,
  Info,
} from 'lucide-react';
import { PageHead, useApp } from './app';
import { Badge, Empty, ProductArt, ProductCard, Field, date } from './primitives';
import { compare, money, minor, monthKey } from '@/lib/engine';
import type { Product } from '@/lib/types';
export function Dashboard({ onReview }: { onReview: () => void }) {
  const { state: s } = useApp();
  const currency = s.preference.currency;
  const approved = s.reviews.filter(
    (r) =>
      r.status === 'approved' &&
      r.currency === currency &&
      monthKey(r.decidedAt ?? r.createdAt) === monthKey(new Date()),
  );
  const spent = approved.reduce((a, r) => a + r.amount, 0);
  const budget = s.budgets.find(
    (b) => b.enabled && b.scope === 'overall' && b.currency === currency,
  );
  const pending = s.reviews.filter((r) => r.status === 'pending');
  const reviewed = s.reviews.filter((r) => r.status !== 'pending');
  return (
    <>
      <PageHead
        eyebrow="A CLEARER PICTURE"
        title={`Your next purchase. Your call.`}
        description={`Welcome back, ${s.user.name.split(' ')[0]}. Here’s where things stand.`}
        action={
          <button className="primary" onClick={onReview}>
            <Plus size={16} />
            Review a purchase
          </button>
        }
      />
      {!s.preference.onboarded && (
        <div className="onboarding-nudge">
          <div>
            <ShieldCheck size={21} />
            <span>
              <strong>A few preferences. A more personal experience.</strong> Set your first budget
              and approval threshold.
            </span>
          </div>
          <Link href="/onboarding">
            Finish setup <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <div className="overview-grid">
        <section className="budget-hero">
          <div className="card-kicker">
            <span>YOUR MONTH, IN BALANCE</span>
            <Wallet size={19} />
          </div>
          <div className="hero-amount">
            {money(budget ? budget.remaining : spent, currency)}
            <span>{budget ? 'remaining this month' : 'approved this month'}</span>
          </div>
          <div className="hero-meter">
            <i style={{ width: `${budget ? Math.min((spent / budget.amount) * 100, 100) : 0}%` }} />
          </div>
          <div className="hero-bottom">
            <span>
              {budget
                ? `${money(spent, currency)} of ${money(budget.amount, currency)} approved`
                : 'Set a monthly budget to see your remaining balance.'}
            </span>
            <Link href="/budgets" aria-label="Manage budgets">
              <ArrowUpRight size={20} />
            </Link>
          </div>
          <span className="hero-decoration" aria-hidden="true" />
        </section>
        <section className="stat-card">
          <div className="stat-icon">
            <ShieldCheck size={21} />
          </div>
          <strong>{s.rules.filter((r) => r.enabled).length}</strong>
          <h3>Rules looking out for you</h3>
          <p>Your preferences, applied to every review.</p>
          <Link href="/rules">
            Manage rules <ArrowUpRight size={15} />
          </Link>
        </section>
        <section className="stat-card">
          <div className="stat-icon warm">
            <Clock size={21} />
          </div>
          <strong>{pending.length.toString().padStart(2, '0')}</strong>
          <h3>Awaiting your decision</h3>
          <p>
            {pending.length
              ? 'A moment to pause before you purchase.'
              : 'Nothing waiting. You’re all caught up.'}
          </p>
          <Link href="/history?status=pending">
            View reviews <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Your decision desk</h2>
              <p>A little context before you commit.</p>
            </div>
            <span className="count-pill">{pending.length} pending</span>
          </div>
          {pending.length ? (
            pending.slice(0, 3).map((r) => (
              <Link href={`/review/${r.id}`} className="review-row" key={r.id}>
                <ProductArt product={r.product} small />
                <div className="review-row-main">
                  <h3>{r.product.name}</h3>
                  <p>
                    {money(r.amount, r.currency)} <span>·</span>{' '}
                    <Badge value={r.product.dataMode} />
                  </p>
                </div>
                <Badge value={r.verdict} />
                <ChevronRight size={17} />
              </Link>
            ))
          ) : (
            <Empty title="A considered purchase starts here.">
              Pick a product or enter a proposal to see how it fits your rules.
              <button className="secondary" onClick={onReview}>
                Review a purchase <ArrowRight size={15} />
              </button>
            </Empty>
          )}
          <div className="panel-bottom">
            <ShieldCheck size={15} />
            Your rules advise. You always make the final decision.
          </div>
        </section>
        <section className="panel quiet-panel">
          <span className="eyebrow">THE BUYWISE APPROACH</span>
          <h2>
            Less second-guessing.
            <br />
            More clarity.
          </h2>
          <p>
            Every review checks your budget, your priorities, and the details that are easy to miss.
          </p>
          <ul className="check-list">
            <li>
              <Check size={16} />
              Rules you can see and change
            </li>
            <li>
              <Check size={16} />
              Unknowns called out clearly
            </li>
            <li>
              <Check size={16} />A receipt for every decision
            </li>
          </ul>
          <Link className="text-link" href="/help">
            Get to know your shield <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">A PLACE TO START</span>
          <h2>Find your next good fit.</h2>
        </div>
        <Link href="/shop">
          Explore catalogue <ArrowRight size={16} />
        </Link>
      </div>
      <div className="product-grid dashboard-products">
        {s.products
          .filter((p) => p.dataMode === 'demo')
          .slice(0, 3)
          .map((p) => (
            <ConnectedProduct key={p.id} p={p} />
          ))}
      </div>
      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <h2>Recently considered</h2>
            <p>Your decisions, kept in view.</p>
          </div>
          <Link href="/history">
            View history <ArrowUpRight size={15} />
          </Link>
        </div>
        {reviewed.length ? (
          reviewed.slice(0, 4).map((r) => (
            <Link className="history-row" key={r.id} href={`/review/${r.id}`}>
              <span className="receipt-icon">
                <ShieldCheck size={18} />
              </span>
              <div>
                <h3>{r.product.name}</h3>
                <small>{date(r.decidedAt ?? r.createdAt)}</small>
              </div>
              <Badge value={r.status} />
              <strong>{money(r.amount, r.currency)}</strong>
              <ChevronRight size={15} />
            </Link>
          ))
        ) : (
          <div className="simple-empty">Your first recorded decision will appear here.</div>
        )}
      </section>
    </>
  );
}
function ConnectedProduct({ p }: { p: Product }) {
  const { state, act, compareIds, toggleCompare } = useApp();
  return (
    <ProductCard
      product={p}
      saved={state.watches.some((w) => w.productId === p.id)}
      selected={compareIds.includes(p.id)}
      onSave={() => act('watchlist', { productId: p.id }, 'Saved to your watchlist.')}
      onCompare={() => toggleCompare(p.id)}
    />
  );
}
export function Shop() {
  const params = useSearchParams();
  return <ShopResults key={params.get('q') ?? ''} initialQuery={params.get('q') ?? ''} />;
}
function ShopResults({ initialQuery }: { initialQuery: string }) {
  const { state, act, busy } = useApp();
  const [query, setQuery] = useState(initialQuery),
    [category, setCategory] = useState(''),
    [mode, setMode] = useState('demo'),
    [sort, setSort] = useState('name'),
    [max, setMax] = useState(''),
    [currency, setCurrency] = useState(''),
    [liveIds, setLiveIds] = useState<string[] | null>(null);
  const products = state.products
    .filter(
      (p) =>
        p.dataMode === mode &&
        (!category || p.category === category) &&
        (!currency || p.currency === currency) &&
        (!max || p.price + p.fees <= Number(max) * 100) &&
        (mode === 'live'
          ? liveIds
            ? liveIds.includes(p.id)
            : false
          : `${p.name} ${p.brand} ${p.model} ${p.category} ${p.description}`
              .toLowerCase()
              .includes(query.toLowerCase())),
    )
    .sort((a, b) =>
      sort === 'priceAsc'
        ? a.currency.localeCompare(b.currency) || a.price + a.fees - b.price - b.fees
        : sort === 'priceDesc'
          ? a.currency.localeCompare(b.currency) || b.price + b.fees - a.price - a.fees
          : a.name.localeCompare(b.name),
    );
  return (
    <>
      <PageHead
        eyebrow="DISCOVER, WITH INTENTION"
        title="Find what fits."
        description="A clearer view of the products, the details, and the trade-offs."
        action={
          <Link className="button secondary" href="/compare">
            <Scale size={16} />
            Open comparison
          </Link>
        }
      />
      <div className="catalog-toolbar">
        <div className="segmented" aria-label="Data source">
          {['demo', 'live', 'imported'].map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              className={mode === m ? 'active' : ''}
              onClick={() => {
                setMode(m);
                setCategory('');
              }}
            >
              {m === 'demo' ? 'Demo catalogue' : m === 'live' ? 'Live · eBay' : 'Your imports'}
            </button>
          ))}
        </div>
        <span className="source-note">
          <Info size={14} />
          {mode === 'demo'
            ? 'Fictional products. Real decision tools.'
            : mode === 'live'
              ? 'Official eBay API · US marketplace · original currencies'
              : 'Data you supplied. Verify details at the source.'}
        </span>
      </div>
      <form
        className="filter-bar"
        onSubmit={async (e) => {
          e.preventDefault();
          if (mode === 'live') {
            const r = await act<{ products: Product[] }>(
              'live-search',
              { query },
              'Live search complete.',
            );
            if (r) setLiveIds(r.products.map((p) => p.id));
          }
        }}
      >
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Search catalogue"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, brands, or categories"
          />
        </div>
        <select
          aria-label="Filter category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {Array.from(
            new Set(state.products.filter((p) => p.dataMode === mode).map((p) => p.category)),
          )
            .sort()
            .map((c) => (
              <option key={c}>{c}</option>
            ))}
        </select>
        <select
          aria-label="Filter currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          <option value="">All currencies</option>
          {['INR', 'USD', 'GBP', 'EUR'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          className="max-price"
          type="number"
          min="0"
          aria-label="Maximum price"
          placeholder="Max. price"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
        {mode === 'live' && (
          <button className="primary" disabled={busy || query.trim().length < 2}>
            Search live
          </button>
        )}
      </form>
      <div className="results-heading">
        <p>
          <strong>{products.length}</strong> products{' '}
          <span className="muted">{query && `for “${query}”`}</span>
        </p>
        <label className="sort-label">
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Name</option>
            <option value="priceAsc">Price: low to high (by currency)</option>
            <option value="priceDesc">Price: high to low (by currency)</option>
          </select>
        </label>
      </div>
      {products.length ? (
        <div className="product-grid">
          {products.map((p) => (
            <ConnectedProduct key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title={
              mode === 'live'
                ? 'Search the live marketplace.'
                : mode === 'imported'
                  ? 'Your own catalogue starts here.'
                  : 'No products match just yet.'
            }
          >
            {mode === 'live' ? (
              'Enter a search above. An authorized eBay token is required; demo data is never substituted.'
            ) : mode === 'imported' ? (
              <Link href="/settings/integrations">
                Import products from CSV <ArrowRight size={15} />
              </Link>
            ) : (
              'Try a different search or clear your filters.'
            )}
          </Empty>
        </section>
      )}
    </>
  );
}
export function ProductPage({ id }: { id: string }) {
  const { state, act, busy, compareIds, toggleCompare } = useApp();
  const router = useRouter();
  const p = state.products.find((p) => p.id === id);
  if (!p)
    return (
      <Empty title="Product not found">
        This product is unavailable or belongs to another account.
      </Empty>
    );
  const alts = state.products
    .filter(
      (x) =>
        x.id !== p.id &&
        x.category === p.category &&
        x.currency === p.currency &&
        x.dataMode === p.dataMode &&
        x.price + x.fees < p.price + p.fees,
    )
    .slice(0, 3);
  return (
    <>
      <Link className="back-link" href="/shop">
        Discover <ChevronRight size={13} />
        {p.category}
      </Link>
      <div className="detail-grid">
        <section className="detail-visual">
          <ProductArt product={p} />
          <span className="illustration-label">
            Category illustration · not a product photograph
          </span>
        </section>
        <section className="detail-info">
          <div className="inline">
            <Badge value={p.dataMode} />
            <span className="eyebrow">
              {p.brand} / {p.model}
            </span>
          </div>
          <h1>{p.name}</h1>
          <p>{p.description}</p>
          <div className="detail-price">
            {money(p.price + p.fees, p.currency)}
            <small>
              {p.fees
                ? `Includes ${money(p.fees, p.currency)} known fees`
                : 'Listed price · no additional fees provided'}
            </small>
          </div>
          <div className="detail-facts">
            <div>
              <ShieldCheck size={18} />
              <span>
                Warranty
                <strong>
                  {p.warrantyMonths === null ? 'Not provided' : `${p.warrantyMonths} months`}
                </strong>
              </span>
            </div>
            <div>
              <HistoryIcon />
              <span>
                Returns
                <strong>
                  {p.returnDays === null
                    ? 'Not provided'
                    : p.returnDays === 0
                      ? 'Non-returnable'
                      : `${p.returnDays} days`}
                </strong>
              </span>
            </div>
          </div>
          {(p.returnDays === null || p.warrantyMonths === null || p.dataMode === 'live') && (
            <div className="notice-box">
              <Info size={17} />
              <p>
                Some purchase details are not provided. Your review will call out uncertainty.
                Confirm shipping and total cost before deciding.
              </p>
            </div>
          )}
          <button
            className="primary wide"
            disabled={busy}
            onClick={async () => {
              const r = await act<{ id: string }>(
                'reviews',
                { productId: p.id },
                'Review created.',
              );
              if (r) router.push(`/review/${r.id}`);
            }}
          >
            <ShieldCheck size={17} />
            Review this purchase
            <ArrowRight size={16} />
          </button>
          <div className="button-row">
            <button
              disabled={state.watches.some((w) => w.productId === p.id) || busy}
              onClick={() =>
                act(
                  'watchlist',
                  { productId: p.id },
                  'Saved. Set a target price in your watchlist.',
                )
              }
            >
              <Bookmark size={16} />
              {state.watches.some((w) => w.productId === p.id)
                ? 'Saved to watchlist'
                : 'Save & set alert'}
            </button>
            <button onClick={() => toggleCompare(p.id)}>
              <Plus size={16} />
              {compareIds.includes(p.id) ? 'Remove comparison' : 'Compare'}
            </button>
          </div>
        </section>
      </div>
      <div className="two-column">
        <section className="panel">
          <div className="panel-heading">
            <h2>The details</h2>
          </div>
          <dl className="spec-list">
            {Object.entries(p.specifications).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
            {Object.keys(p.specifications).length === 0 && (
              <div>
                <dt>Specifications</dt>
                <dd>Not provided</dd>
              </div>
            )}
            <div>
              <dt>Availability</dt>
              <dd>{p.availability ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt>Seller</dt>
              <dd>{p.seller ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt>Seller feedback</dt>
              <dd>{p.sellerRating === null ? 'Not provided' : `${p.sellerRating}% positive`}</dd>
            </div>
          </dl>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Know the source</h2>
            <Badge value={p.dataMode} />
          </div>
          <dl className="spec-list">
            <div>
              <dt>Observed</dt>
              <dd>{date(p.observedAt)}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                {p.sourceUrl ? (
                  <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                    View original listing <ArrowUpRight size={13} />
                  </a>
                ) : (
                  'Fictional demo provider'
                )}
              </dd>
            </div>
            <div>
              <dt>Commercial incentive</dt>
              <dd>{p.incentive ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt>Price history</dt>
              <dd>No verified observations available.</dd>
            </div>
          </dl>
        </section>
      </div>
      {alts.length > 0 && (
        <>
          <div className="section-heading">
            <div>
              <span className="eyebrow">ALSO WORTH A LOOK</span>
              <h2>Lower-priced in this category.</h2>
              <p className="muted">
                Check the specifications. A lower price doesn’t guarantee a better fit.
              </p>
            </div>
          </div>
          <div className="product-grid">
            {alts.map((p) => (
              <ConnectedProduct key={p.id} p={p} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
function HistoryIcon() {
  return <Clock size={18} />;
}
export function ComparePage() {
  const { state, compareIds, toggleCompare, setCompareIds, act, busy } = useApp();
  const [weights, setWeights] = useState(state.preference.priorities);
  const products = state.products.filter((p) => compareIds.includes(p.id));
  const result = compare(products, weights);
  return (
    <>
      <PageHead
        eyebrow="SIDE BY SIDE"
        title="The details make the difference."
        description="Compare two to four products. Make the trade-offs visible."
        action={
          <Link className="button" href="/shop">
            <Plus size={16} />
            Add products
          </Link>
        }
      />
      <section className="panel weights-panel">
        <div>
          <h2>What matters to you?</h2>
          <p>
            Scores are decision aids, not objective product quality. Each attribute is normalized
            across this comparison; lower price is better. Missing values score zero.
          </p>
        </div>
        <div className="weight-controls">
          {['price', 'warrantyMonths', 'returnDays', 'ramGB', 'storageGB'].map((k) => (
            <label key={k}>
              {
                (
                  {
                    price: 'Price',
                    warrantyMonths: 'Warranty',
                    returnDays: 'Returns',
                    ramGB: 'Memory',
                    storageGB: 'Storage',
                  } as Record<string, string>
                )[k]
              }
              <span>{weights[k] ?? 0}</span>
              <input
                aria-label={`${k} weight`}
                type="range"
                min="0"
                max="100"
                value={weights[k] ?? 0}
                onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
      </section>
      {products.length < 2 ? (
        <section className="panel">
          <Empty title="Good decisions need a little perspective.">
            <p>Select at least two products to compare.</p>
            <Link className="button primary" href="/shop">
              Explore products <ArrowRight size={16} />
            </Link>
          </Empty>
        </section>
      ) : (
        <>
          <div
            className="comparison-grid"
            style={{ gridTemplateColumns: `repeat(${products.length}, minmax(220px,1fr))` }}
          >
            {products.map((p) => {
              const score = result.rows.find((r) => r.id === p.id)!;
              return (
                <article className="panel compare-card" key={p.id}>
                  <button
                    className="remove-product icon-button"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => toggleCompare(p.id)}
                  >
                    <X size={16} />
                  </button>
                  <ProductArt product={p} />
                  <Badge value={p.dataMode} />
                  <h2>{p.name}</h2>
                  <strong className="compare-price">{money(p.price + p.fees, p.currency)}</strong>
                  {result.best.includes(p.id) && (
                    <span className="best-match">
                      <Check size={14} />
                      Best match for these weights
                    </span>
                  )}
                  <div className="score">
                    <strong>{Math.round(score.score)}</strong>
                    <span>
                      / 100
                      <br />
                      weighted score
                    </span>
                  </div>
                  <dl className="spec-list">
                    {score.attributes.map((a) => (
                      <div key={a.field}>
                        <dt>
                          {a.field}
                          <small>Weight {a.weight}</small>
                        </dt>
                        <dd>
                          {a.missing
                            ? 'Not provided'
                            : a.field === 'price'
                              ? money(a.value!, p.currency)
                              : a.value}
                          <small>{Math.round(a.score)} / 100</small>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Link className="button wide" href={`/product/${p.id}`}>
                    View product <ArrowUpRight size={15} />
                  </Link>
                </article>
              );
            })}
          </div>
          {!result.complete && (
            <div className="notice-box">
              <Info size={17} />
              <p>
                No best match is named: information is missing, currencies differ, or all weights
                are zero.
              </p>
            </div>
          )}
          <div className="button-row">
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                act(
                  'comparisons',
                  { productIds: compareIds, weights },
                  'Comparison saved to history.',
                )
              }
            >
              <Check size={16} />
              Save comparison
            </button>
            <button onClick={() => setCompareIds([])}>Clear selection</button>
          </div>
        </>
      )}
      {state.comparisons.length > 0 && (
        <section className="panel saved-comparisons">
          <div className="panel-heading">
            <h2>Saved comparisons</h2>
          </div>
          {state.comparisons.map((c) => (
            <button
              key={c.id}
              className="saved-comparison"
              onClick={() => {
                setCompareIds(c.productIds);
                setWeights(c.weights);
              }}
            >
              {c.productIds
                .map((id) => state.products.find((p) => p.id === id)?.name ?? 'Unavailable')
                .join(' / ')}
              <ArrowRight size={16} />
            </button>
          ))}
        </section>
      )}
    </>
  );
}
export function ReviewPage({ id }: { id: string }) {
  const { state, act, busy } = useApp();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const r = state.reviews.find((r) => r.id === id);
  if (!r)
    return <Empty title="Review not found">Only reviews in your account are accessible.</Empty>;
  async function decide(decision: string, alternativeId?: string) {
    const result = await act<{ id: string }>(
      `reviews/${id}`,
      { decision, reason, alternativeId },
      decision === 'switch' ? 'Alternative ready for review.' : 'Decision recorded.',
    );
    if (result && result.id !== id) router.push(`/review/${result.id}`);
  }
  return (
    <>
      <PageHead
        eyebrow="DECISION SHIELD"
        title="A pause with a purpose."
        description="Your priorities, checked against this purchase. Every result explained."
        action={<Badge value={r.verdict} />}
      />
      <div className="review-layout">
        <div>
          <section className="panel review-product">
            <ProductArt product={r.product} small />
            <div>
              <Badge value={r.product.dataMode} />
              <h2>{r.product.name}</h2>
              <p>
                {r.category} · Reviewed {date(r.createdAt)}
              </p>
            </div>
            <strong>{money(r.amount, r.currency)}</strong>
          </section>
          <section className="panel checks-panel">
            <div className="panel-heading">
              <div>
                <h2>Your rules, checked</h2>
                <p>All checks are included, including those that passed.</p>
              </div>
              <ShieldCheck size={21} />
            </div>
            {r.checks.map((c) => (
              <details className="rule-check" key={c.ruleId} open={c.status !== 'ALLOW'}>
                <summary>
                  <span className={`check-symbol ${c.status.toLowerCase()}`}>
                    {c.status === 'ALLOW' ? <Check size={16} /> : <Info size={16} />}
                  </span>
                  <strong>{c.name}</strong>
                  <Badge value={c.status} />
                </summary>
                <div className="check-detail">
                  <p>{c.explanation}</p>
                  <dl>
                    {Object.entries(c.evidence).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>
                          {v === null
                            ? 'Not provided'
                            : typeof v === 'object'
                              ? JSON.stringify(v)
                              : String(v)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <small>Rule reference: {c.ruleId}</small>
                </div>
              </details>
            ))}
          </section>
          {r.alternatives.length > 0 && (
            <section className="panel alternatives-panel">
              <div className="panel-heading">
                <div>
                  <h2>Other ways to meet the need</h2>
                  <p>Lower-priced in the same category. Review specifications before switching.</p>
                </div>
              </div>
              {r.alternatives.map((p) => (
                <div className="alternative-row" key={p.id}>
                  <ProductArt product={p} small />
                  <div>
                    <Link href={`/product/${p.id}`}>
                      <h3>{p.name}</h3>
                    </Link>
                    <span>{money(p.price + p.fees, p.currency)}</span>
                  </div>
                  {r.status === 'pending' && (
                    <button disabled={busy} onClick={() => decide('switch', p.id)}>
                      Review alternative <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
        <aside>
          <section className="panel decision-card">
            <ShieldCheck size={28} />
            <h2>{r.status === 'pending' ? 'The decision is yours.' : 'Decision recorded.'}</h2>
            <p>
              {r.status === 'pending'
                ? 'BUYWISE records your choice. It does not order, cancel, or block a purchase on another platform.'
                : 'This receipt preserves the rules, evidence and choice at the time of your decision.'}
            </p>
            {r.status === 'pending' ? (
              <>
                {r.verdict === 'BLOCK' && (
                  <div className="notice-box danger">
                    <p>
                      An explicit rule blocks approval inside BUYWISE. You can reject, choose an
                      alternative, or <Link href="/rules">edit your rule</Link>.
                    </p>
                  </div>
                )}
                <Field
                  label={
                    ['REVIEW', 'UNKNOWN'].includes(r.verdict)
                      ? 'Your reason (required to approve)'
                      : 'Your reason (optional)'
                  }
                >
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder="What informed your decision? Acknowledge any missing details."
                  />
                </Field>
                <button
                  className="primary wide"
                  disabled={
                    busy ||
                    r.verdict === 'BLOCK' ||
                    (['REVIEW', 'UNKNOWN'].includes(r.verdict) && !reason.trim())
                  }
                  onClick={() => decide('approved')}
                >
                  <Check size={16} />
                  Approve and record
                </button>
                <button className="wide" disabled={busy} onClick={() => decide('rejected')}>
                  Reject proposal
                </button>
                <button
                  className="wide text-button"
                  disabled={busy}
                  onClick={() =>
                    act(`reviews/${id}/recheck`, {}, 'Review updated with your current rules.')
                  }
                >
                  Recheck current rules
                </button>
                <small>Current rules and budget are rechecked when you record your choice.</small>
              </>
            ) : (
              <>
                <Badge value={r.status} />
                <blockquote>{r.reason || 'No additional reason recorded.'}</blockquote>
                <dl className="receipt-details">
                  <dt>Receipt ID</dt>
                  <dd>{r.receipt?.id ?? 'Not available'}</dd>
                  <dt>Recorded</dt>
                  <dd>{r.decidedAt ? date(r.decidedAt) : 'Not provided'}</dd>
                </dl>
                <button
                  className="wide"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(r.receipt, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `buywise-receipt-${r.receipt?.id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download size={15} />
                  Download receipt
                </button>
                <Link className="text-link" href="/history">
                  Back to decision history <ArrowRight size={15} />
                </Link>
              </>
            )}
          </section>
          <div className="fine-print review-footnote">
            <Info size={14} />A BUYWISE approval is a recorded intention, not proof of payment.
          </div>
        </aside>
      </div>
    </>
  );
}
export function HistoryPage() {
  const { state } = useApp();
  const search = useSearchParams();
  const [status, setStatus] = useState(search.get('status') ?? ''),
    [query, setQuery] = useState(''),
    [tab, setTab] = useState('decisions');
  const reviews = state.reviews.filter(
    (r) =>
      (!status || r.status === status) &&
      r.product.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHead
        eyebrow="A RECORD YOU CAN RETURN TO"
        title="Nothing lost in the decision."
        description="Purchase reviews, recorded choices, and the settings behind them."
      />
      <div className="filter-bar">
        <div className="segmented">
          {['decisions', 'activity'].map((t) => (
            <button className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>
              {t === 'decisions' ? 'Decisions' : 'All activity'}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search decision history"
            placeholder="Search decisions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter decision status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All decisions</option>
          {['pending', 'approved', 'rejected', 'switched'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <section className="panel">
        {tab === 'decisions' ? (
          reviews.length ? (
            reviews.map((r) => (
              <Link className="history-row" key={r.id} href={`/review/${r.id}`}>
                <span className="receipt-icon">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h3>{r.product.name}</h3>
                  <small>
                    {date(r.createdAt)} · {r.product.dataMode}
                  </small>
                </div>
                <Badge value={r.verdict} />
                <Badge value={r.status} />
                <strong>{money(r.amount, r.currency)}</strong>
                <ChevronRight size={16} />
              </Link>
            ))
          ) : (
            <Empty title="A clean slate.">
              Reviews and receipts appear here as you make decisions.
            </Empty>
          )
        ) : state.events.length ? (
          state.events
            .filter((e) => e.detail.toLowerCase().includes(query.toLowerCase()))
            .map((e) => (
              <div className="history-row" key={e.id}>
                <span className="receipt-icon">
                  <Clock size={18} />
                </span>
                <div>
                  <h3>{e.detail}</h3>
                  <small>
                    {date(e.createdAt)} · {e.action}
                  </small>
                </div>
                {e.action.startsWith('review.') && e.entityId && (
                  <Link href={`/review/${e.entityId}`}>
                    View review <ArrowUpRight size={14} />
                  </Link>
                )}
              </div>
            ))
        ) : (
          <Empty title="No activity yet." />
        )}
      </section>
    </>
  );
}
export function WatchlistPage() {
  const { state, act, busy } = useApp();
  return (
    <>
      <PageHead
        eyebrow="KEEP THE GOOD FINDS CLOSE"
        title="Worth coming back to."
        description="Your saved products and price targets. No pressure to decide today."
        action={
          <button
            disabled={busy}
            onClick={async () => {
              const r = await act<{ triggered: number }>(
                'check-alerts',
                {},
                'Simulated alert check completed.',
              );
              void r;
            }}
          >
            <Clock size={16} />
            Check demo alerts
          </button>
        }
      />
      <div className="notice-box">
        <Info size={17} />
        <p>
          Demo alerts are simulated and checked when you ask. Live and imported listings are saved
          without continuous price tracking.
        </p>
      </div>
      {state.watches.length ? (
        <div className="watch-grid">
          {state.watches.map((w) => {
            const p = state.products.find((p) => p.id === w.productId);
            return p ? <WatchCard key={w.id} p={p} watch={w} /> : null;
          })}
        </div>
      ) : (
        <section className="panel">
          <Empty title="Give a good find a place to stay.">
            <Link className="button primary" href="/shop">
              Explore products <ArrowRight size={16} />
            </Link>
          </Empty>
        </section>
      )}
    </>
  );
}
function WatchCard({ p, watch: w }: { p: Product; watch: import('@/lib/types').Watch }) {
  const { act, busy } = useApp();
  const [target, setTarget] = useState(w.targetPrice === null ? '' : String(w.targetPrice / 100)),
    [error, setError] = useState('');
  return (
    <article className="panel watch-card">
      <div className="watch-product">
        <ProductArt product={p} small />
        <div>
          <Badge value={p.dataMode} />
          <Link href={`/product/${p.id}`}>
            <h3>{p.name}</h3>
          </Link>
          <strong>{money(p.price + p.fees, p.currency)}</strong>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            setError('');
            const amount = target ? minor(target) : null;
            await act(
              `watchlist/${w.id}`,
              { targetPrice: amount, paused: w.paused },
              'Target saved.',
            );
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <Field label={`Target price (${p.currency})`}>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="decimal"
            placeholder="Set an optional target"
          />
        </Field>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button disabled={busy}>Save target</button>
      </form>
      <div className="watch-status">
        <span>
          {p.dataMode === 'demo'
            ? `Simulated · ${w.paused ? 'paused' : 'on demand'}`
            : 'Live monitoring unavailable'}
        </span>
        <small>Last checked: {w.lastCheckedAt ? date(w.lastCheckedAt) : 'Not checked'}</small>
      </div>
      <div className="button-row">
        <button
          disabled={busy}
          onClick={() =>
            act(
              `watchlist/${w.id}`,
              { targetPrice: w.targetPrice, paused: !w.paused },
              w.paused ? 'Alert resumed.' : 'Alert paused.',
            )
          }
        >
          {w.paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="text-button danger-text"
          disabled={busy}
          onClick={() => act(`watchlist/${w.id}`, {}, 'Removed from watchlist.', 'DELETE')}
        >
          Remove
        </button>
      </div>
    </article>
  );
}
export function InsightsPage() {
  const { state } = useApp();
  const currency = state.preference.currency;
  const approved = state.reviews.filter(
    (r) =>
      r.status === 'approved' &&
      r.currency === currency &&
      monthKey(r.decidedAt ?? r.createdAt) === monthKey(new Date()),
  );
  const total = approved.reduce((sum, r) => sum + r.amount, 0);
  const potential = approved.reduce(
    (sum, r) => sum + (r.switchedFromAmount ? Math.max(0, r.switchedFromAmount - r.amount) : 0),
    0,
  );
  const groups = Object.entries(
    approved.reduce<Record<string, number>>(
      (a, r) => ({ ...a, [r.category]: (a[r.category] ?? 0) + r.amount }),
      {},
    ),
  );
  return (
    <>
      <PageHead
        eyebrow="MAKE SENSE OF YOUR CHOICES"
        title="Patterns, without the noise."
        description="This month’s recorded approvals. No bank connection. No invented totals."
      />
      <div className="insight-grid">
        <section className="panel metric">
          <span>Recorded approvals</span>
          <strong>{money(total, currency)}</strong>
          <small>
            {approved.length} approved {approved.length === 1 ? 'purchase' : 'purchases'} this month
          </small>
        </section>
        <section className="panel metric">
          <span>Potential savings</span>
          <strong>{money(potential, currency)}</strong>
          <small>Lower-priced alternatives you chose and approved</small>
        </section>
        <section className="panel metric">
          <span>Confirmed savings</span>
          <strong>{money(0, currency)}</strong>
          <small>No verified order data is connected</small>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Where your approvals go</h2>
            <p>Grouped by category · {currency} · calendar month in India</p>
          </div>
        </div>
        {groups.length ? (
          <div className="category-bars">
            {groups.map(([category, value]) => (
              <div key={category}>
                <div>
                  <span>{category}</span>
                  <strong>{money(value, currency)}</strong>
                </div>
                <div className="progress">
                  <i style={{ width: `${(value / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="A picture that grows with your decisions.">
            Approve a purchase to see your category breakdown.
          </Empty>
        )}
      </section>
      <div className="notice-box">
        <Info size={17} />
        <p>
          Approved amounts are intentions recorded in BUYWISE, not verified spending. Rejections and
          switched proposals do not count. External refunds and cancellations are not inferred.
        </p>
      </div>
    </>
  );
}
