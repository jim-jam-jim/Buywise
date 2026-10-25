import { z } from 'zod';
export const currency = z.enum(['INR', 'USD', 'GBP', 'EUR']);
export const amount = z.number().int().min(1).max(1_000_000_000);
export const budgetSchema = z
  .object({
    scope: z.enum(['overall', 'category', 'transaction']),
    category: z.string().trim().max(80).nullable().optional(),
    amount,
    currency,
    alertAt: z.number().int().min(1).max(100),
    enabled: z.boolean(),
  })
  .refine((x) => x.scope !== 'category' || !!x.category, 'Choose a category.');
export const ruleSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: z.enum([
      'hard_limit',
      'approval',
      'returns',
      'missing',
      'seller',
      'attribute',
      'duplicate',
    ]),
    parameters: z.record(z.string(), z.unknown()),
    outcome: z.enum(['REVIEW', 'BLOCK']),
    enabled: z.boolean(),
  })
  .superRefine((r, c) => {
    const a = r.parameters;
    const fail = (message: string) => c.addIssue({ code: 'custom', message });
    if (
      ['hard_limit', 'approval'].includes(r.type) &&
      (!amount.safeParse(a.amount).success || !currency.safeParse(a.currency).success)
    )
      fail('Provide a valid amount and currency.');
    if (r.type === 'seller' && (typeof a.minimum !== 'number' || a.minimum < 0 || a.minimum > 100))
      fail('Seller rating must be between 0 and 100 percent.');
    if (
      r.type === 'attribute' &&
      (typeof a.field !== 'string' ||
        !a.field.trim() ||
        typeof a.minimum !== 'number' ||
        a.minimum < 0 ||
        !Number.isFinite(a.minimum))
    )
      fail('Provide an attribute and minimum value.');
    if (
      r.type === 'missing' &&
      a.fields !== undefined &&
      !z
        .array(z.enum(['warrantyMonths', 'returnDays', 'seller', 'sellerRating']))
        .min(1)
        .safeParse(a.fields).success
    )
      fail('Choose supported required fields.');
    if (r.outcome === 'BLOCK' && !['hard_limit', 'seller'].includes(r.type))
      fail('Only hard limits and explicit seller rules can block.');
  });
export const manualSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  price: amount,
  fees: z.number().int().min(0).max(100_000_000).default(0),
  currency,
  warrantyMonths: z.number().int().min(0).max(120).nullable().default(null),
  returnDays: z.number().int().min(0).max(365).nullable().default(null),
  seller: z.string().max(120).nullable().default(null),
  sellerRating: z.number().min(0).max(100).nullable().default(null),
  specifications: z
    .record(z.string(), z.union([z.string().max(200), z.number().finite(), z.boolean()]))
    .default({}),
});
export const weightsSchema = z
  .record(
    z
      .string()
      .refine(
        (key) =>
          ['price', 'warrantyMonths', 'returnDays', 'ramGB', 'storageGB', 'displayInches'].includes(
            key,
          ),
        'Unsupported comparison attribute.',
      ),
    z.number().min(0).max(100),
  )
  .refine((w) => Object.values(w).some((v) => v > 0), 'Choose at least one positive weight.');
export const preferenceSchema = z.object({
  currency,
  priorities: weightsSchema,
  optionalNotifications: z.boolean(),
  theme: z.enum(['light', 'dark']),
  onboarded: z.boolean(),
});
