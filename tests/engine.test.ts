import { describe, it, expect } from 'vitest';
import {
  evaluate,
  minor,
  budgetUsage,
  compare,
  alertMatches,
  csvCell,
  monthKey,
  type ProductData,
  type RuleData,
} from '../src/lib/engine';
import { parseImport } from '../src/lib/import';
import { ruleSchema } from '../src/lib/validation';
const p: ProductData = {
  id: 'p',
  name: 'Laptop',
  category: 'Electronics',
  price: 5500000,
  fees: 0,
  currency: 'INR',
  warrantyMonths: 12,
  returnDays: 14,
  seller: 'Sample',
  sellerRating: 98,
  specifications: { ramGB: 16, storageGB: 512 },
  dataMode: 'demo',
  observedAt: '2026-10-25T00:00:00Z',
  sourceUrl: null,
};
const rule = (
  type: string,
  parameters: Record<string, unknown> = {},
  outcome = 'REVIEW',
): RuleData => ({ id: type, name: type, type, parameters, outcome, enabled: true });
const now = new Date('2026-10-25T00:00:00Z');
describe('deterministic purchase rules', () => {
  it('implements the PRD laptop scenario and keeps every check', () => {
    const r = evaluate(
      p,
      [rule('approval', { amount: 1000000, currency: 'INR' }), rule('returns'), rule('missing')],
      [
        {
          id: 'budget',
          scope: 'category',
          category: 'Electronics',
          amount: 2000000,
          currency: 'INR',
          enabled: true,
        },
      ],
      [],
      now,
    );
    expect(r.verdict).toBe('REVIEW');
    expect(r.checks.filter((c) => c.status === 'REVIEW').map((c) => c.ruleId)).toEqual([
      'approval',
      'budget',
    ]);
  });
  it('blocks only with an enabled explicit hard rule', () => {
    const r = rule('hard_limit', { amount: 5000000, currency: 'INR' });
    expect(evaluate(p, [r], [], [], now).verdict).toBe('BLOCK');
    expect(evaluate(p, [{ ...r, enabled: false }], [], [], now).verdict).toBe('ALLOW');
  });
  it('uses BLOCK > REVIEW > UNKNOWN > ALLOW precedence without hiding checks', () => {
    const result = evaluate(
      { ...p, returnDays: null },
      [
        rule('missing'),
        rule('approval', { amount: 1000000, currency: 'INR' }),
        rule('hard_limit', { amount: 5000000, currency: 'INR' }),
      ],
      [],
      [],
      now,
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.checks.map((c) => c.status)).toEqual(['UNKNOWN', 'REVIEW', 'BLOCK', 'ALLOW']);
  });
  it('flags missing return data as unknown and never fraud', () => {
    const result = evaluate(
      { ...p, returnDays: null },
      [rule('returns'), rule('missing')],
      [],
      [],
      now,
    );
    expect(result.verdict).toBe('UNKNOWN');
    expect(JSON.stringify(result)).not.toMatch(/fraud/i);
  });
  it('allows complete purchases within the limit, including equal boundary', () =>
    expect(
      evaluate(
        p,
        [
          rule('hard_limit', { amount: p.price, currency: 'INR' }),
          rule('returns'),
          rule('missing'),
        ],
        [],
        [],
        now,
      ).verdict,
    ).toBe('ALLOW'));
  it('counts known fees when applying thresholds', () =>
    expect(
      evaluate(
        { ...p, fees: 1 },
        [rule('hard_limit', { amount: p.price, currency: 'INR' })],
        [],
        [],
        now,
      ).verdict,
    ).toBe('BLOCK'));
  it('does not convert currencies or treat an unknown seller as risky', () => {
    expect(
      evaluate(p, [rule('hard_limit', { amount: 1, currency: 'USD' })], [], [], now).verdict,
    ).toBe('UNKNOWN');
    expect(
      evaluate(
        { ...p, sellerRating: null },
        [rule('seller', { minimum: 99 }, 'BLOCK')],
        [],
        [],
        now,
      ).verdict,
    ).toBe('UNKNOWN');
  });
  it('honors configured seller review or block', () => {
    expect(evaluate(p, [rule('seller', { minimum: 99 })], [], [], now).verdict).toBe('REVIEW');
    expect(evaluate(p, [rule('seller', { minimum: 99 }, 'BLOCK')], [], [], now).verdict).toBe(
      'BLOCK',
    );
  });
  it('requests review for missing or insufficient required attributes', () => {
    expect(
      evaluate(p, [rule('attribute', { field: 'ramGB', minimum: 32 })], [], [], now).verdict,
    ).toBe('REVIEW');
    expect(
      evaluate(p, [rule('attribute', { field: 'batteryHours', minimum: 10 })], [], [], now).verdict,
    ).toBe('REVIEW');
  });
  it('detects duplicates only from approved purchases in the same period', () => {
    const spend = {
      category: 'Electronics',
      amount: 1,
      currency: 'INR',
      status: 'approved',
      createdAt: now,
    };
    expect(evaluate(p, [rule('duplicate')], [], [spend], now).verdict).toBe('REVIEW');
    expect(
      evaluate(p, [rule('duplicate')], [], [{ ...spend, status: 'rejected' }], now).verdict,
    ).toBe('ALLOW');
  });
  it('is deterministic for equal inputs', () =>
    expect(evaluate(p, [rule('returns')], [], [], now)).toEqual(
      evaluate(p, [rule('returns')], [], [], now),
    ));
  it('rejects rule attempts to convert missing information into blocks', () =>
    expect(ruleSchema.safeParse(rule('missing', {}, 'BLOCK')).success).toBe(false));
});
describe('money and budgets', () => {
  it('stores exact integer paisa', () => {
    expect(minor('0.10') + minor('0.20')).toBe(30);
    expect(minor('1234.56')).toBe(123456);
    expect(() => minor('1.001')).toThrow();
    expect(() => minor('-1')).toThrow();
    expect(() => minor('1e3')).toThrow();
  });
  it('separates pending, approved and non-spending outcomes', () => {
    const b = {
      id: 'b',
      scope: 'overall',
      category: null,
      amount: 10000,
      currency: 'INR',
      enabled: true,
    };
    const spend = ['approved', 'pending', 'rejected', 'switched'].map((status) => ({
      category: 'Electronics',
      amount: 1234,
      currency: 'INR',
      status,
      createdAt: now,
    }));
    expect(budgetUsage(b, spend, now)).toEqual({ spent: 1234, pending: 1234, remaining: 8766 });
  });
  it('counts approval in the approval month and respects currency/category', () => {
    const b = {
      id: 'b',
      scope: 'category',
      category: 'Electronics',
      amount: 10000,
      currency: 'INR',
      enabled: true,
    };
    expect(
      budgetUsage(
        b,
        [
          {
            category: 'Electronics',
            amount: 1234,
            currency: 'INR',
            status: 'approved',
            createdAt: '2026-09-01',
            decidedAt: now,
          },
          {
            category: 'Electronics',
            amount: 100,
            currency: 'USD',
            status: 'approved',
            createdAt: now,
          },
          { category: 'Home', amount: 100, currency: 'INR', status: 'approved', createdAt: now },
        ],
        now,
      ).spent,
    ).toBe(1234);
  });
  it('uses calendar month in India at the UTC month boundary', () =>
    expect(monthKey('2026-10-31T20:00:00Z')).toBe(monthKey('2026-11-01T05:00:00Z')));
  it('evaluates transaction budget against this transaction only', () =>
    expect(
      evaluate(
        { ...p, price: 1000 },
        [],
        [
          {
            id: 'b',
            scope: 'transaction',
            category: null,
            amount: 2000,
            currency: 'INR',
            enabled: true,
          },
        ],
        [
          {
            category: 'Electronics',
            amount: 999999,
            currency: 'INR',
            status: 'approved',
            createdAt: now,
          },
        ],
        now,
      ).verdict,
    ).toBe('ALLOW'));
});
describe('comparison and alerts', () => {
  it('inverts price and computes weighted means', () => {
    const r = compare([p, { ...p, id: 'cheaper', price: 4000000, warrantyMonths: 24 }], {
      price: 50,
      warrantyMonths: 50,
    });
    expect(r.rows[1].score).toBe(100);
    expect(r.rows[0].score).toBe(0);
    expect(r.best).toEqual(['cheaper']);
  });
  it('assigns zero for missing data and suppresses best match', () => {
    const r = compare([p, { ...p, id: 'unknown', warrantyMonths: null }], { warrantyMonths: 100 });
    expect(r.rows[1].score).toBe(0);
    expect(r.rows[1].attributes[0].missing).toBe(true);
    expect(r.best).toEqual([]);
  });
  it('never names a best match across different currencies or zero weights', () => {
    expect(compare([p, { ...p, id: 'usd', currency: 'USD' }], { price: 100 }).best).toEqual([]);
    expect(compare([p], { price: 0 }).complete).toBe(false);
  });
  it('does not trigger stale or paused alerts', () => {
    expect(alertMatches(100, 100, false, now.toISOString(), now)).toBe(true);
    expect(alertMatches(100, 100, true, now.toISOString(), now)).toBe(false);
    expect(alertMatches(100, 100, false, '2026-10-01T00:00:00Z', now)).toBe(false);
    expect(alertMatches(100, null, false, now.toISOString(), now)).toBe(false);
  });
});
describe('imports and exports', () => {
  it('reports every invalid row before commit', () => {
    const r = parseImport(
      'name,brand,model,category,price,currency,sourceUrl\nReal,A,M,Audio,10.50,INR,https://example.com/item\nBad,A,M,Audio,no,INR,http://example.com',
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].price).toBe(1050);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].row).toBe(3);
  });
  it('neutralizes spreadsheet formula injection including leading whitespace', () => {
    for (const v of ['=SUM(A1)', '+1', '-1', '@fn', '  =1'])
      expect(csvCell(v).startsWith('"\'')).toBe(true);
    expect(csvCell('a"b')).toBe('"a""b"');
  });
  it('rejects oversized and empty imports', () => {
    expect(() => parseImport('a'.repeat(512001))).toThrow();
    expect(parseImport('name,brand').errors.length).toBeGreaterThan(0);
  });
});
