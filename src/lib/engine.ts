export type Verdict = 'ALLOW' | 'UNKNOWN' | 'REVIEW' | 'BLOCK';
export type ProductData = {
  id?: string;
  name: string;
  category: string;
  price: number;
  fees: number;
  currency: string;
  warrantyMonths: number | null;
  returnDays: number | null;
  seller: string | null;
  sellerRating: number | null;
  specifications: Record<string, unknown>;
  dataMode: string;
  observedAt: string;
  sourceUrl: string | null;
  incentive?: string | null;
};
export type RuleData = {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  outcome: string;
  enabled: boolean;
};
export type BudgetData = {
  id: string;
  scope: string;
  category: string | null;
  amount: number;
  currency: string;
  enabled: boolean;
  alertAt?: number;
};
export type Spend = {
  category: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date | string;
  decidedAt?: Date | string | null;
};
export type Check = {
  ruleId: string;
  name: string;
  status: Verdict;
  explanation: string;
  evidence: Record<string, unknown>;
};
const ranks: Record<Verdict, number> = { ALLOW: 0, UNKNOWN: 1, REVIEW: 2, BLOCK: 3 };
export function minor(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error('Enter a positive amount with at most two decimal places.');
  const [whole, part = ''] = value.split('.');
  const n = Number(whole) * 100 + Number(part.padEnd(2, '0'));
  if (!Number.isSafeInteger(n) || n > 1_000_000_000) throw new Error('Amount is too large.');
  return n;
}
export function money(value: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
export function monthKey(date: Date | string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date(date));
}
export function budgetUsage(b: BudgetData, spend: Spend[], now = new Date()) {
  const scoped = spend.filter(
    (s) =>
      s.currency === b.currency &&
      (b.scope !== 'category' || s.category === b.category) &&
      monthKey(s.decidedAt ?? s.createdAt) === monthKey(now),
  );
  const spent = scoped.filter((s) => s.status === 'approved').reduce((a, s) => a + s.amount, 0);
  const pending = scoped.filter((s) => s.status === 'pending').reduce((a, s) => a + s.amount, 0);
  return { spent, pending, remaining: b.amount - spent };
}
export function evaluate(
  p: ProductData,
  rules: RuleData[],
  budgets: BudgetData[],
  spend: Spend[],
  now = new Date(),
): { verdict: Verdict; checks: Check[] } {
  const checks: Check[] = [];
  const total = p.price + p.fees;
  for (const r of rules.filter((r) => r.enabled)) {
    let status: Verdict = 'ALLOW',
      explanation = 'The purchase meets this rule.';
    const evidence: Record<string, unknown> = {};
    const a = r.parameters;
    if (['hard_limit', 'approval'].includes(r.type)) {
      evidence.total = total;
      evidence.limit = a.amount;
      evidence.currency = p.currency;
      if (a.currency !== p.currency) {
        status = 'UNKNOWN';
        explanation = 'Rule currency differs from the offer. No exchange rate is assumed.';
      } else if (total > Number(a.amount)) {
        status = r.type === 'hard_limit' ? 'BLOCK' : 'REVIEW';
        explanation = `Total ${money(total, p.currency)} exceeds ${money(Number(a.amount), p.currency)}.`;
      } else
        explanation = `Total ${money(total, p.currency)} is within ${money(Number(a.amount), p.currency)}.`;
    }
    if (r.type === 'returns') {
      evidence.returnDays = p.returnDays;
      if (p.returnDays === null) {
        status = 'UNKNOWN';
        explanation = 'Return terms were not provided.';
      } else if (p.returnDays === 0) {
        status = 'REVIEW';
        explanation = 'The item is non-returnable.';
      } else explanation = `A ${p.returnDays}-day return window is provided.`;
    }
    if (r.type === 'missing') {
      const fields = (a.fields as string[] | undefined) ?? ['warrantyMonths', 'returnDays'];
      const missing = fields.filter(
        (f) => p[f as keyof ProductData] === null || p[f as keyof ProductData] === undefined,
      );
      evidence.missing = missing;
      status = missing.length ? 'UNKNOWN' : 'ALLOW';
      explanation = missing.length
        ? `Required information not provided: ${missing.join(', ')}.`
        : 'Required warranty and return information is present.';
    }
    if (r.type === 'seller') {
      evidence.sellerRating = p.sellerRating;
      evidence.minimum = a.minimum;
      if (p.sellerRating === null) {
        status = 'UNKNOWN';
        explanation = 'Seller rating was not provided; no risk is inferred.';
      } else if (p.sellerRating < Number(a.minimum)) {
        status = r.outcome === 'BLOCK' ? 'BLOCK' : 'REVIEW';
        explanation = `Seller rating ${p.sellerRating} is below your minimum of ${a.minimum}.`;
      } else explanation = 'Seller rating meets your configured minimum.';
    }
    if (r.type === 'attribute') {
      const field = String(a.field);
      const value = p.specifications[field];
      evidence.attribute = field;
      evidence.actual = value ?? null;
      evidence.minimum = a.minimum;
      if (value === undefined || typeof value !== 'number' || value < Number(a.minimum)) {
        status = 'REVIEW';
        explanation = `Required ${field}: minimum ${a.minimum}; provided ${value ?? 'Not provided'}.`;
      } else explanation = `${field} meets your minimum of ${a.minimum}.`;
    }
    if (r.type === 'duplicate') {
      const found = spend.some(
        (s) =>
          s.status === 'approved' &&
          s.category === p.category &&
          monthKey(s.decidedAt ?? s.createdAt) === monthKey(now),
      );
      status = found ? 'REVIEW' : 'ALLOW';
      explanation = found
        ? 'You already approved an item in this category this month. This may be intentional.'
        : 'No approved purchase in this category this month.';
      evidence.category = p.category;
    }
    checks.push({ ruleId: r.id, name: r.name, status, explanation, evidence });
  }
  for (const b of budgets.filter(
    (b) => b.enabled && (b.scope !== 'category' || b.category === p.category),
  )) {
    const usage = budgetUsage(b, spend, now);
    const projected = b.scope === 'transaction' ? total : usage.spent + total;
    const status: Verdict =
      b.currency !== p.currency ? 'UNKNOWN' : projected > b.amount ? 'REVIEW' : 'ALLOW';
    checks.push({
      ruleId: b.id,
      name: `${b.scope === 'category' ? b.category : b.scope} budget`,
      status,
      explanation:
        status === 'UNKNOWN'
          ? 'Budget currency differs. No currency conversion was applied.'
          : `${b.scope === 'transaction' ? 'Purchase total' : 'Approved spend plus this purchase'}: ${money(projected, p.currency)} against ${money(b.amount, b.currency)}.`,
      evidence: {
        spent: usage.spent,
        pending: usage.pending,
        projected,
        limit: b.amount,
        currency: b.currency,
      },
    });
  }
  checks.push({
    ruleId: 'provenance',
    name: 'Source and commercial disclosure',
    status: 'ALLOW',
    explanation: `${p.dataMode === 'demo' ? 'Simulated catalogue; not a live offer.' : `Source mode: ${p.dataMode}.`} Commercial incentives: ${p.incentive ?? 'Not provided'}. No external order is placed or blocked.`,
    evidence: {
      dataMode: p.dataMode,
      observedAt: p.observedAt,
      sourceUrl: p.sourceUrl,
      incentive: p.incentive ?? null,
    },
  });
  return {
    verdict: checks.reduce<Verdict>((v, c) => (ranks[c.status] > ranks[v] ? c.status : v), 'ALLOW'),
    checks,
  };
}
export function compare(products: ProductData[], weights: Record<string, number>) {
  const fields = Object.keys(weights).filter((k) => weights[k] > 0);
  const value = (p: ProductData, k: string): number | null =>
    k === 'price'
      ? p.price + p.fees
      : k === 'warrantyMonths'
        ? p.warrantyMonths
        : k === 'returnDays'
          ? p.returnDays
          : typeof p.specifications[k] === 'number'
            ? (p.specifications[k] as number)
            : null;
  const total = fields.reduce((s, k) => s + weights[k], 0);
  const complete =
    fields.length > 0 &&
    products.every((p) => fields.every((k) => value(p, k) !== null)) &&
    new Set(products.map((p) => p.currency)).size === 1;
  const rows = products.map((p) => {
    const attributes = fields.map((k) => {
      const values = products.map((x) => value(x, k)).filter((v): v is number => v !== null);
      const v = value(p, k);
      const min = Math.min(...values),
        max = Math.max(...values);
      const normalized =
        v === null
          ? 0
          : max === min
            ? 100
            : k === 'price'
              ? ((max - v) / (max - min)) * 100
              : ((v - min) / (max - min)) * 100;
      return { field: k, value: v, score: normalized, weight: weights[k], missing: v === null };
    });
    return {
      id: p.id,
      name: p.name,
      score: total ? attributes.reduce((s, a) => s + a.score * a.weight, 0) / total : 0,
      attributes,
    };
  });
  const best = complete
    ? rows.filter((r) => r.score === Math.max(...rows.map((x) => x.score))).map((r) => r.id)
    : [];
  return { rows, best, complete };
}
export function alertMatches(
  price: number,
  target: number | null,
  paused: boolean,
  observedAt: string,
  now = new Date(),
) {
  return (
    !paused &&
    target !== null &&
    price <= target &&
    now.getTime() - new Date(observedAt).getTime() <= 86400000
  );
}
export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return '"' + (/^[\s]*[=+\-@]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
}
