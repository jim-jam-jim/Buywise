'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Pencil,
  Copy,
  Trash2,
  Check,
  ArrowRight,
  ShieldCheck,
  Wallet,
  Info,
  Download,
  Upload,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import { PageHead, useApp, api, NewButton } from './app';
import { authClient } from './auth-screen';
import { Field, Modal, Empty, Badge } from './primitives';
import { minor, money, type RuleData } from '@/lib/engine';
import type { State } from '@/lib/types';
const currencies = ['INR', 'USD', 'GBP', 'EUR'];
function Currency({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {currencies.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  );
}
export function BudgetsPage() {
  const { state, act, busy } = useApp();
  const [editing, setEditing] = useState<State['budgets'][number] | 'new' | null>(null);
  return (
    <>
      <PageHead
        eyebrow="ROOM FOR WHAT MATTERS"
        title="Give your spending a boundary."
        description="Monthly and per-purchase budgets. Clear limits, without connecting your bank."
        action={<NewButton onClick={() => setEditing('new')}>Create budget</NewButton>}
      />
      <div className="notice-box">
        <Info size={17} />
        <p>
          Budgets request a review when exceeded. To prevent approval inside BUYWISE, add a hard
          purchase limit in <Link href="/rules">Purchase rules</Link>. Monthly periods follow India
          time.
        </p>
      </div>
      {state.budgets.length ? (
        <div className="budget-grid">
          {state.budgets.map((b) => (
            <section
              className={`panel budget-card ${!b.enabled ? 'disabled-card' : ''}`}
              key={b.id}
            >
              <div className="card-top">
                <span className="stat-icon">
                  <Wallet size={20} />
                </span>
                <span className="eyebrow">
                  {b.enabled ? 'ACTIVE' : 'DISABLED'} · {b.currency}
                </span>
                <button
                  className="icon-button"
                  aria-label={`Edit ${b.scope} budget`}
                  onClick={() => setEditing(b)}
                >
                  <Pencil size={16} />
                </button>
              </div>
              <h2>
                {b.scope === 'category'
                  ? b.category
                  : b.scope === 'overall'
                    ? 'Overall monthly budget'
                    : 'Per-purchase budget'}
              </h2>
              <div className="budget-amount">
                {money(b.amount, b.currency)}
                <span>{b.scope === 'transaction' ? 'per purchase' : 'per month'}</span>
              </div>
              {b.scope !== 'transaction' && (
                <>
                  <div className={`progress ${b.spent > b.amount ? 'over' : ''}`}>
                    <i style={{ width: `${Math.min(100, (b.spent / b.amount) * 100)}%` }} />
                  </div>
                  <dl className="budget-breakdown">
                    <div>
                      <dt>Approved</dt>
                      <dd>{money(b.spent, b.currency)}</dd>
                    </div>
                    <div>
                      <dt>Pending</dt>
                      <dd>{money(b.pending, b.currency)}</dd>
                    </div>
                    <div>
                      <dt>Remaining</dt>
                      <dd>{money(b.remaining, b.currency)}</dd>
                    </div>
                  </dl>
                </>
              )}
              <div className="budget-card-footer">
                <span>Notify at {b.alertAt}%</span>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    act(
                      `budgets/${b.id}`,
                      {
                        scope: b.scope,
                        category: b.category,
                        amount: b.amount,
                        currency: b.currency,
                        alertAt: b.alertAt,
                        enabled: !b.enabled,
                      },
                      b.enabled ? 'Budget disabled.' : 'Budget enabled.',
                    )
                  }
                >
                  {b.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  className="icon-button danger-text"
                  aria-label={`Delete ${b.scope} budget`}
                  onClick={() => {
                    if (window.confirm('Delete this budget? Existing receipts are preserved.'))
                      act(`budgets/${b.id}`, {}, 'Budget deleted.', 'DELETE');
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty title="Make space for a sensible limit.">
            <p>Start with an overall monthly budget, or set one for a category.</p>
            <button className="primary" onClick={() => setEditing('new')}>
              Create your first budget
            </button>
          </Empty>
        </section>
      )}
      {editing && (
        <Modal
          title={editing === 'new' ? 'Create a budget' : 'Edit budget'}
          onClose={() => setEditing(null)}
        >
          <BudgetForm
            budget={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
function BudgetForm({
  budget: b,
  onDone,
}: {
  budget?: State['budgets'][number];
  onDone: () => void;
}) {
  const { state, act, busy } = useApp();
  const [scope, setScope] = useState(b?.scope ?? 'overall'),
    [category, setCategory] = useState(b?.category ?? ''),
    [amount, setAmount] = useState(b ? String(b.amount / 100) : ''),
    [currency, setCurrency] = useState(b?.currency ?? state.preference.currency),
    [alertAt, setAlertAt] = useState(b?.alertAt ?? 80),
    [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          setError('');
          const result = await act(
            `budgets${b ? '/' + b.id : ''}`,
            {
              scope,
              category: scope === 'category' ? category : null,
              amount: minor(amount),
              currency,
              alertAt,
              enabled: b?.enabled ?? true,
            },
            'Budget saved.',
          );
          if (result) onDone();
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <Field label="Budget scope">
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="overall">Overall monthly</option>
          <option value="category">Category monthly</option>
          <option value="transaction">Per purchase</option>
        </select>
      </Field>
      {scope === 'category' && (
        <Field label="Category">
          <input
            list="categories"
            required
            value={category}
            maxLength={80}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="categories">
            {Array.from(new Set(state.products.map((p) => p.category))).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </datalist>
        </Field>
      )}
      <div className="form-row">
        <Field label="Amount">
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="20,000"
          />
        </Field>
        <Field label="Currency">
          <Currency value={currency} onChange={setCurrency} />
        </Field>
      </div>
      <Field label="Alert threshold (%)">
        <input
          type="number"
          min="1"
          max="100"
          required
          value={alertAt}
          onChange={(e) => setAlertAt(Number(e.target.value))}
        />
      </Field>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary wide" disabled={busy}>
        Save budget <Check size={16} />
      </button>
    </form>
  );
}
const ruleLabels: Record<string, string> = {
  hard_limit: 'Hard purchase limit',
  approval: 'Approval threshold',
  returns: 'Non-returnable items',
  missing: 'Missing information',
  seller: 'Seller feedback minimum',
  attribute: 'Required specification',
  duplicate: 'Repeat purchase in a category',
};
export function RulesPage() {
  const { state, act, busy } = useApp();
  const [editing, setEditing] = useState<RuleData | 'new' | null>(null);
  return (
    <>
      <PageHead
        eyebrow="YOUR PRIORITIES, MADE EXPLICIT"
        title="A few rules. A lot more clarity."
        description="You decide the boundaries. BUYWISE applies them consistently."
        action={<NewButton onClick={() => setEditing('new')}>Create rule</NewButton>}
      />
      <section className="rule-intro">
        <ShieldCheck size={24} />
        <div>
          <h3>Hard limits are always your choice.</h3>
          <p>
            Only an explicit hard limit or blocking seller rule prevents approval. Missing data is
            uncertainty, never evidence of fraud.
          </p>
        </div>
        <span className="count-pill">{state.rules.filter((r) => r.enabled).length} enabled</span>
      </section>
      <div className="rules-list">
        {state.rules.map((r) => (
          <section className={`panel rule-card ${!r.enabled ? 'disabled-card' : ''}`} key={r.id}>
            <span className="rule-type-icon">
              <SlidersHorizontal size={20} />
            </span>
            <div className="rule-card-main">
              <h3>{r.name}</h3>
              <p>
                {ruleLabels[r.type]}
                {r.parameters.amount !== undefined
                  ? ` · ${money(Number(r.parameters.amount), String(r.parameters.currency))}`
                  : ''}
                {r.type === 'seller' ? ` · minimum ${r.parameters.minimum}% positive` : ''}
                {r.type === 'attribute' ? ` · ${r.parameters.field} ≥ ${r.parameters.minimum}` : ''}
              </p>
              <span
                className={`badge ${r.type === 'hard_limit' || r.outcome === 'BLOCK' ? 'badge-block' : 'badge-unknown'}`}
              >
                {r.type === 'hard_limit' || r.outcome === 'BLOCK'
                  ? 'Can block approval'
                  : 'Requests attention'}
              </span>
            </div>
            <label className="switch-label">
              <input
                type="checkbox"
                role="switch"
                aria-label={`Enable ${r.name}`}
                checked={r.enabled}
                disabled={busy}
                onChange={() =>
                  act(
                    `rules/${r.id}`,
                    { ...r, enabled: !r.enabled },
                    r.enabled ? 'Rule disabled.' : 'Rule enabled.',
                  )
                }
              />
              <span />
            </label>
            <button
              className="icon-button"
              aria-label={`Edit ${r.name}`}
              onClick={() => setEditing(r)}
            >
              <Pencil size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={`Duplicate ${r.name}`}
              disabled={busy}
              onClick={() =>
                act('rules', { ...r, name: `${r.name} (copy)`.slice(0, 100) }, 'Rule duplicated.')
              }
            >
              <Copy size={16} />
            </button>
            <button
              className="icon-button danger-text"
              aria-label={`Delete ${r.name}`}
              onClick={() => {
                if (window.confirm('Delete this rule? Previous receipts will keep its evidence.'))
                  act(`rules/${r.id}`, {}, 'Rule deleted.', 'DELETE');
              }}
            >
              <Trash2 size={16} />
            </button>
          </section>
        ))}
      </div>
      {state.rules.length === 0 && (
        <section className="panel">
          <Empty title="Your rules start with you.">
            <button onClick={() => setEditing('new')}>Create a rule</button>
          </Empty>
        </section>
      )}
      {editing && (
        <Modal
          title={editing === 'new' ? 'Create a purchase rule' : 'Edit purchase rule'}
          onClose={() => setEditing(null)}
        >
          <RuleForm
            rule={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
function RuleForm({ rule: r, onDone }: { rule?: RuleData; onDone: () => void }) {
  const { state, act, busy } = useApp();
  const [type, setType] = useState(r?.type ?? 'hard_limit'),
    [name, setName] = useState(r?.name ?? ''),
    [amount, setAmount] = useState(
      r?.parameters.amount ? String(Number(r.parameters.amount) / 100) : '',
    ),
    [currency, setCurrency] = useState(String(r?.parameters.currency ?? state.preference.currency)),
    [minimum, setMinimum] = useState(Number(r?.parameters.minimum ?? 0)),
    [field, setField] = useState(String(r?.parameters.field ?? 'ramGB')),
    [outcome, setOutcome] = useState(r?.outcome ?? 'REVIEW'),
    [sample, setSample] = useState(state.products[0]?.id ?? ''),
    [test, setTest] = useState<{ verdict: string; checks: { explanation: string }[] } | null>(null),
    [error, setError] = useState('');
  function payload() {
    return {
      name: name || ruleLabels[type],
      type,
      parameters: ['hard_limit', 'approval'].includes(type)
        ? { amount: minor(amount), currency }
        : type === 'seller'
          ? { minimum }
          : type === 'attribute'
            ? { field, minimum }
            : type === 'missing'
              ? { fields: ['warrantyMonths', 'returnDays'] }
              : {},
      outcome: type === 'hard_limit' ? 'BLOCK' : type === 'seller' ? outcome : 'REVIEW',
      enabled: r?.enabled ?? true,
    };
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          setError('');
          const result = await act(`rules${r ? '/' + r.id : ''}`, payload(), 'Rule saved.');
          if (result) onDone();
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <Field label="Rule type">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setTest(null);
          }}
        >
          {Object.entries(ruleLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Rule name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder={ruleLabels[type]}
        />
      </Field>
      {['hard_limit', 'approval'].includes(type) && (
        <div className="form-row">
          <Field label="Amount">
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Currency">
            <Currency value={currency} onChange={setCurrency} />
          </Field>
        </div>
      )}
      {type === 'attribute' && (
        <Field label="Specification key">
          <input
            required
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="ramGB"
          />
        </Field>
      )}
      {['attribute', 'seller'].includes(type) && (
        <Field
          label={
            type === 'seller' ? 'Minimum positive feedback (%)' : 'Minimum specification value'
          }
        >
          <input
            type="number"
            required
            min="0"
            max={type === 'seller' ? 100 : 100000}
            value={minimum}
            onChange={(e) => setMinimum(Number(e.target.value))}
          />
        </Field>
      )}
      {type === 'seller' && (
        <Field label="When the seller is below your minimum">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="REVIEW">Ask for review</option>
            <option value="BLOCK">Block approval inside BUYWISE</option>
          </select>
        </Field>
      )}
      <div className="rule-test">
        <Field label="Try this rule on a product">
          <select value={sample} onChange={(e) => setSample(e.target.value)}>
            {state.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          disabled={busy || !sample}
          onClick={async () => {
            try {
              setError('');
              const result = await act<{ verdict: string; checks: { explanation: string }[] }>(
                'rule-test',
                { rule: payload(), productId: sample },
                '',
              );
              if (result) setTest(result);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Test rule
        </button>
        {test && (
          <div className="test-result" role="status">
            <Badge value={test.verdict} />
            <p>{test.checks[0]?.explanation}</p>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary wide" disabled={busy}>
        Save rule <Check size={16} />
      </button>
    </form>
  );
}
export function ManualProposal({ onDone }: { onDone: () => void }) {
  const { state, act, busy } = useApp();
  const router = useRouter();
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          setError('');
          const result = await act<{ id: string }>(
            'reviews',
            {
              manual: {
                name: f.get('name'),
                category: f.get('category'),
                price: minor(String(f.get('price'))),
                fees: f.get('fees') ? minor(String(f.get('fees'))) : 0,
                currency: f.get('currency'),
                warrantyMonths: f.get('warranty') ? Number(f.get('warranty')) : null,
                returnDays: f.get('returns') ? Number(f.get('returns')) : null,
              },
            },
            'Review created.',
          );
          if (result) {
            onDone();
            router.push(`/review/${result.id}`);
          }
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <p className="muted">
        Enter a simulated proposal to test your rules. Blank warranty and returns remain unknown.
      </p>
      <Field label="Product name">
        <input name="name" required maxLength={160} />
      </Field>
      <Field label="Category">
        <input name="category" required maxLength={80} list="proposal-categories" />
        <datalist id="proposal-categories">
          {Array.from(new Set(state.products.map((p) => p.category))).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </datalist>
      </Field>
      <div className="form-row">
        <Field label="Price">
          <input name="price" required inputMode="decimal" />
        </Field>
        <Field label="Known fees">
          <input name="fees" inputMode="decimal" placeholder="0.00" />
        </Field>
        <Field label="Currency">
          <select name="currency" defaultValue={state.preference.currency}>
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field label="Warranty (months)">
          <input name="warranty" type="number" min="0" max="120" />
        </Field>
        <Field label="Return window (days)">
          <input name="returns" type="number" min="0" max="365" />
        </Field>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button disabled={busy} className="primary wide">
        Review against my rules <ArrowRight size={16} />
      </button>
    </form>
  );
}
export function Onboarding() {
  const { state, act, busy } = useApp();
  const router = useRouter();
  const [currency, setCurrency] = useState(state.preference.currency),
    [amount, setAmount] = useState(''),
    [threshold, setThreshold] = useState('10000'),
    [error, setError] = useState('');
  return (
    <div className="onboarding-page">
      <span className="onboarding-icon">
        <ShieldCheck size={32} />
      </span>
      <PageHead
        eyebrow="MAKE BUYWISE YOURS"
        title="Start with what matters."
        description="A few thoughtful defaults. Everything is optional, and everything can change."
      />
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            setError('');
            const monthly = amount ? minor(amount) : null;
            const approval = threshold ? minor(threshold) : null;
            const result = await act(
              'onboarding',
              {
                monthly,
                approval,
                preference: { ...state.preference, currency, onboarded: true },
              },
              'Your workspace is ready.',
            );
            if (result) router.push('/dashboard');
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <Field label="Your preferred currency">
          <Currency value={currency} onChange={setCurrency} />
        </Field>
        <Field
          label="Monthly budget (optional)"
          hint="A review prompt, not a hard block. Leave blank to skip."
        >
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="For example, 20000"
          />
        </Field>
        <Field
          label="Ask me before purchases above"
          hint="You can change or disable this in Purchase rules."
        >
          <input
            inputMode="decimal"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Leave blank to keep the existing setting"
          />
        </Field>
        <p className="muted">
          Comparison starts with price, warranty and return terms. Adjust their weights in Compare
          or Settings. Scores are decision aids, not objective facts.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary wide" disabled={busy}>
          Save and continue <ArrowRight size={16} />
        </button>
        <button
          className="text-button wide"
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await act('preferences', { ...state.preference, onboarded: true }, ''))
              router.push('/dashboard');
          }}
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}
export function SettingsPage() {
  const path = usePathname();
  return (
    <>
      <PageHead
        eyebrow="YOUR WORKSPACE, YOUR WAY"
        title="A little more personal."
        description="Preferences, connections, and control over your data."
      />
      <nav className="settings-tabs" aria-label="Settings sections">
        {[
          ['profile', 'Profile & preferences'],
          ['privacy', 'Privacy & data'],
          ['integrations', 'Providers & imports'],
        ].map(([key, label]) => (
          <Link className={path.endsWith(key) ? 'active' : ''} key={key} href={`/settings/${key}`}>
            {label}
          </Link>
        ))}
      </nav>
      {path.endsWith('privacy') ? (
        <Privacy />
      ) : path.endsWith('integrations') ? (
        <Integrations />
      ) : (
        <Profile />
      )}
    </>
  );
}
function Profile() {
  const { state, act, busy } = useApp();
  const [pref, setPref] = useState(state.preference),
    [name, setName] = useState(state.user.name);
  return (
    <div className="two-column">
      <form
        className="panel settings-card"
        onSubmit={async (e) => {
          e.preventDefault();
          await act('profile', { name }, 'Profile updated.');
        }}
      >
        <h2>Your profile</h2>
        <p className="muted">The essentials for your personal workspace.</p>
        <Field label="Name">
          <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <input value={state.user.email} readOnly />
        </Field>
        <button disabled={busy} className="primary">
          Save profile
        </button>
      </form>
      <form
        className="panel settings-card"
        onSubmit={async (e) => {
          e.preventDefault();
          await act('preferences', pref, 'Preferences saved.');
        }}
      >
        <h2>How you like things</h2>
        <Field label="Display currency">
          <Currency value={pref.currency} onChange={(currency) => setPref({ ...pref, currency })} />
        </Field>
        <p className="field-hint">
          Existing budgets and products retain their original currencies. No exchange rates are
          assumed.
        </p>
        <Field label="Appearance">
          <select value={pref.theme} onChange={(e) => setPref({ ...pref, theme: e.target.value })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={pref.optionalNotifications}
            onChange={(e) => setPref({ ...pref, optionalNotifications: e.target.checked })}
          />
          Optional budget and price notifications
        </label>
        <h3>Default comparison priorities</h3>
        {['price', 'warrantyMonths', 'returnDays'].map((k) => (
          <Field key={k} label={k}>
            <input
              type="number"
              min="0"
              max="100"
              value={pref.priorities[k] ?? 0}
              onChange={(e) =>
                setPref({
                  ...pref,
                  priorities: { ...pref.priorities, [k]: Number(e.target.value) },
                })
              }
            />
          </Field>
        ))}
        <button className="primary" disabled={busy}>
          Save preferences
        </button>
      </form>
      <PasswordForm />
    </div>
  );
}
function PasswordForm() {
  const { notify } = useApp();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="panel settings-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        setError('');
        try {
          const r = await authClient.changePassword({
            currentPassword: String(f.get('currentPassword')),
            newPassword: String(f.get('newPassword')),
            revokeOtherSessions: true,
          });
          if (r.error) throw new Error(r.error.message ?? 'Could not change password.');
          form.reset();
          notify('Password updated. Other sessions have been signed out.');
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Keep your account secure.</h2>
      <p className="muted">Changing your password signs out your other sessions.</p>
      <Field label="Current password">
        <input name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password">
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
      </Field>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy}>
        Update password
      </button>
    </form>
  );
}
function Privacy() {
  const router = useRouter();
  const { busy, notify } = useApp();
  const [confirmed, setConfirmed] = useState(false),
    [deletion, setDeletion] = useState(''),
    [error, setError] = useState(''),
    [working, setWorking] = useState(false);
  async function download(format: string) {
    setWorking(true);
    try {
      setError('');
      const r = await api<{ download: string; format: string }>('export', {
        format,
        confirmation: confirmed,
      });
      const blob = new Blob([r.download], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `buywise-data.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Your data export is ready.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="two-column">
      <section className="panel settings-card">
        <Download size={25} />
        <h2>Your data, to go.</h2>
        <p>
          Export your profile, preferences, budgets, rules, reviews, receipts, watchlist,
          comparisons, notifications and imported or live catalogue records. Passwords and session
          credentials are never included.
        </p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I want to download my personal data to this device.
        </label>
        <div className="button-row">
          <button disabled={!confirmed || working} onClick={() => download('json')}>
            Export JSON <Download size={15} />
          </button>
          <button disabled={!confirmed || working} onClick={() => download('csv')}>
            Export CSV <Download size={15} />
          </button>
        </div>
        <p className="field-hint">
          CSV contains entity and serialized data columns. Cells are protected against spreadsheet
          formula injection.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
      <section className="panel settings-card deletion-card">
        <Trash2 size={25} />
        <h2>Delete your account.</h2>
        <p>
          Deletion is immediate and permanent. Your sessions, preferences, budgets, rules, reviews,
          receipts and user-owned catalogue data are deleted together. Shared demo products remain.
          There is no receipt retention after deletion.
        </p>
        <Field label="Type DELETE to confirm">
          <input
            value={deletion}
            onChange={(e) => setDeletion(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <button
          className="danger-button"
          disabled={deletion !== 'DELETE' || busy || working}
          onClick={async () => {
            setWorking(true);
            try {
              await api('delete-account', { confirmation: deletion });
              router.push('/signup');
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
              setWorking(false);
            }
          }}
        >
          Permanently delete account
        </button>
      </section>
      <section className="panel settings-card">
        <h2>What leaves BUYWISE?</h2>
        <p>
          Demo search stays within this application. Live search sends your query to eBay. Your
          budgets, rules and review reasons are not sent to the provider. No advertising analytics,
          card details or bank connections are used.
        </p>
      </section>
    </div>
  );
}
function Integrations() {
  const { state, act, busy } = useApp();
  const [csv, setCsv] = useState(''),
    [filename, setFilename] = useState(''),
    [preview, setPreview] = useState<{
      rows: Record<string, unknown>[];
      errors: { row: number; message: string }[];
      imported: number;
    } | null>(null),
    [error, setError] = useState('');
  return (
    <>
      <div className="two-column">
        <section className="panel settings-card">
          <div className="card-top">
            <ShieldCheck size={25} />
            <Badge value="demo" />
          </div>
          <h2>Demo catalogue</h2>
          <p>
            A working fictional catalogue for exploring the decision workflow. Product values are
            sample data and never presented as live.
          </p>
          <span className="connection-status">
            <i />
            Available · no credentials required
          </span>
          <Link className="text-link" href="/shop">
            Explore catalogue <ArrowRight size={15} />
          </Link>
        </section>
        <section className="panel settings-card">
          <div className="card-top">
            <ExternalLink size={25} />
            <Badge value="live" />
          </div>
          <h2>eBay Browse API</h2>
          <p>
            Official live search using the free developer quota, subject to eBay’s access approval
            and terms. This release uses the US marketplace and preserves original listing
            currencies.
          </p>
          <span
            className={`connection-status ${state.provider.ebayConnected ? '' : 'disconnected'}`}
          >
            <i />
            {state.provider.ebayConnected
              ? 'Token configured · verified when you search'
              : 'Not connected · access token required'}
          </span>
          <p className="field-hint">
            The workspace owner supplies EBAY_ACCESS_TOKEN securely in server environment settings.
            Tokens expire; reconnect when the provider requests it. Live alerts and email delivery
            are unavailable.
          </p>
          <a
            className="text-link"
            href="https://developer.ebay.com/api-docs/buy/browse/overview.html"
            rel="noopener noreferrer"
            target="_blank"
          >
            Provider documentation <ExternalLink size={14} />
          </a>
        </section>
      </div>
      <section className="panel settings-card import-card">
        <Upload size={25} />
        <h2>Bring your own product data.</h2>
        <p>
          Import an authorized CSV feed. Preview every row before committing. Up to 500 rows and 500
          KB; imported products are private to your account.
        </p>
        <p className="field-hint">
          Required columns: name, brand, model, category, price, currency, sourceUrl (HTTPS).
          Optional: warrantyMonths, returnDays, seller. Price uses major units, for example 1999.50.
        </p>
        <label className="file-drop">
          Choose a CSV file
          <input
            aria-label="Choose product CSV"
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              setPreview(null);
              setCsv('');
              setError('');
              const f = e.target.files?.[0];
              if (!f) return;
              if (!f.name.toLowerCase().endsWith('.csv') || f.size > 512000) {
                setError('Choose a CSV file smaller than 500 KB.');
                return;
              }
              setFilename(f.name);
              setCsv(await f.text());
            }}
          />
        </label>
        {filename && <p>{filename}</p>}
        <button
          disabled={!csv || busy}
          onClick={async () => {
            const r = await act<NonNullable<typeof preview>>('import', { csv, commit: false }, '');
            if (r) setPreview(r);
          }}
        >
          Validate and preview
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {preview && (
          <div className="import-preview">
            <h3>
              {preview.rows.length} valid rows · {preview.errors.length} errors
            </h3>
            {preview.errors.map((e, i) => (
              <p className="error" key={i}>
                Row {e.row}: {e.message}
              </p>
            ))}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i}>
                      <td>{String(r.name)}</td>
                      <td>{String(r.category)}</td>
                      <td>{money(Number(r.price), String(r.currency))}</td>
                      <td>{String(r.sourceUrl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="primary"
              disabled={
                preview.errors.length > 0 ||
                preview.rows.length === 0 ||
                busy ||
                preview.imported > 0
              }
              onClick={async () => {
                const r = await act<NonNullable<typeof preview>>(
                  'import',
                  { csv, commit: true },
                  'Products imported.',
                );
                if (r) setPreview(r);
              }}
            >
              {preview.imported > 0 ? 'Import complete' : `Import ${preview.rows.length} products`}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
export function HelpPage() {
  return (
    <>
      <PageHead
        eyebrow="A LITTLE CONTEXT"
        title="Confidence starts with clarity."
        description="What BUYWISE does, what it doesn’t, and how to use it well."
      />
      <div className="help-grid">
        {[
          [
            'What is Decision Shield?',
            'A deterministic review of a proposed purchase against your enabled rules and budgets. An AI model never decides the verdict.',
          ],
          [
            'How do verdicts work?',
            'Blocked takes precedence over Review, then Unknown, then Allowed. Every check is shown. Missing information never means fraud.',
          ],
          [
            'Does BUYWISE control my orders?',
            'No. Approvals and blocks apply only within BUYWISE. We do not place, cancel, refund or intercept orders on another website.',
          ],
          [
            'What counts toward a budget?',
            'Approved decisions count in the calendar month they were approved, in India time. Pending proposals are shown separately. Rejections and switched proposals do not count. Real refunds and cancellations are not inferred; receipts remain immutable.',
          ],
          [
            'How do comparison scores work?',
            'Each weighted attribute is normalized across the selected products. Lower price scores higher. Missing data scores zero and is flagged. A best match is named only when all weighted data is present and currencies match. Scores describe your chosen trade-offs, not objective quality.',
          ],
          [
            'What is demo data?',
            'Fictional products and prices supplied by the demo provider, clearly labelled. Your account, rules, reviews, receipts and watchlist are real stored records. Simulated alerts are checked on demand, never represented as live.',
          ],
          [
            'How does live search work?',
            'An authorized eBay application token enables official Browse API search on the US marketplace. Queries are sent to eBay; your rules and budgets are not. Missing warranty, delivery costs and returns are explicitly unknown. No INR conversion is invented.',
          ],
          [
            'Can I undo a decision?',
            'Receipts are immutable so you have an honest audit trail. If your intent changes, create a new review and record the context. BUYWISE cannot verify external returns or payments. Account deletion removes all your receipts.',
          ],
        ].map(([title, body]) => (
          <section className="panel settings-card" key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </>
  );
}
