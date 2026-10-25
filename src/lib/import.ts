import Papa from 'papaparse';
import { z } from 'zod';
import { minor } from './engine';
const rowSchema = z.object({
  name: z.string().trim().min(1).max(160),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(80),
  price: z
    .string()
    .transform((v) => minor(v))
    .refine((v) => v > 0),
  currency: z.enum(['INR', 'USD', 'GBP', 'EUR']),
  sourceUrl: z
    .string()
    .url()
    .refine((s) => new URL(s).protocol === 'https:'),
  warrantyMonths: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().min(0).max(120).nullable()),
  returnDays: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().min(0).max(365).nullable()),
  seller: z.string().max(120).optional(),
});
export function parseImport(csv: string) {
  if (Buffer.byteLength(csv) > 512000) throw new Error('CSV must be smaller than 500 KB.');
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
  });
  const errors = parsed.errors.map((e) => ({ row: (e.row ?? 0) + 2, message: e.message }));
  if (parsed.data.length > 500) throw new Error('Import at most 500 rows at a time.');
  if (!parsed.data.length) errors.push({ row: 1, message: 'The CSV has no product rows.' });
  const rows: z.infer<typeof rowSchema>[] = [];
  parsed.data.forEach((row, i) => {
    try {
      const r = rowSchema.safeParse(row);
      if (r.success) rows.push(r.data);
      else
        errors.push({
          row: i + 2,
          message: r.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; '),
        });
    } catch (e) {
      errors.push({ row: i + 2, message: e instanceof Error ? e.message : 'Invalid row.' });
    }
  });
  return { rows, errors };
}
