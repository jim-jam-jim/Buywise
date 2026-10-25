import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  evaluate,
  budgetUsage,
  csvCell,
  alertMatches,
  type ProductData,
  type RuleData,
} from '@/lib/engine';
import { accessibleProduct, alternatives, productData, demoProvider } from '@/lib/providers';
import {
  budgetSchema,
  ruleSchema,
  manualSchema,
  preferenceSchema,
  weightsSchema,
} from '@/lib/validation';
import { parseImport } from '@/lib/import';
import { searchEbay } from '@/lib/ebay';
type Tx = Prisma.TransactionClient;
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const json = (v: unknown) => v as Prisma.InputJsonValue;
const rules = (v: { parameters: Prisma.JsonValue }[]) => v as RuleData[];
async function log(
  tx: Tx,
  userId: string,
  action: string,
  entityId: string | null,
  detail: string,
) {
  await tx.event.create({ data: { userId, action, entityId, detail } });
}
async function initialize(userId: string) {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    if (await tx.preference.findUnique({ where: { userId } })) return;
    await tx.preference.create({ data: { userId } });
    await tx.rule.createMany({
      data: [
        {
          userId,
          name: 'Ask before a larger purchase',
          type: 'approval',
          parameters: { amount: 1000000, currency: 'INR' },
          outcome: 'REVIEW',
        },
        { userId, name: 'Check return terms', type: 'returns', parameters: {}, outcome: 'REVIEW' },
        {
          userId,
          name: 'Flag missing information',
          type: 'missing',
          parameters: { fields: ['warrantyMonths', 'returnDays'] },
          outcome: 'REVIEW',
        },
        {
          userId,
          name: 'Check repeat purchases',
          type: 'duplicate',
          parameters: {},
          outcome: 'REVIEW',
        },
      ],
    });
  });
}
async function route(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) throw new HttpError(401, 'Sign in to continue.');
    const userId = session.user.id;
    const path = (await params).path;
    await initialize(userId);
    if (req.method === 'GET') {
      if (path[0] === 'state') {
        const [preference, budgets, rs, reviews, watches, events, notifications, comparisons] =
          await Promise.all([
            db.preference.findUnique({ where: { userId } }),
            db.budget.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
            db.rule.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
            db.review.findMany({
              where: { userId },
              include: { receipt: true },
              orderBy: { createdAt: 'desc' },
            }),
            db.watch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
            db.event.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
            db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
            db.comparison.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
          ]);
        const products = await db.product.findMany({
          where: { OR: [{ ownerId: null }, { ownerId: userId }] },
          orderBy: { name: 'asc' },
        });
        return NextResponse.json({
          user: { id: userId, name: session.user.name, email: session.user.email },
          preference,
          budgets: budgets.map((b) => ({ ...b, ...budgetUsage(b, reviews) })),
          rules: rs,
          reviews,
          watches,
          events,
          notifications,
          comparisons,
          products,
          provider: {
            ebayConnected: !!process.env.EBAY_ACCESS_TOKEN,
            marketplace: 'United States',
            liveAlerts: false,
            emailNotifications: false,
          },
        });
      }
      if (path[0] === 'products') {
        const q = req.nextUrl.searchParams.get('q') ?? '';
        return NextResponse.json(
          await demoProvider.searchProducts(q, {
            category: req.nextUrl.searchParams.get('category') ?? undefined,
          }),
        );
      }
      if (path[0] === 'reviews' && path[1]) {
        const item = await db.review.findFirst({
          where: { id: path[1], userId },
          include: { receipt: true },
        });
        if (!item) throw new HttpError(404, 'Review not found.');
        return NextResponse.json(item);
      }
      throw new HttpError(404, 'Not found.');
    }
    const origin = req.headers.get('origin');
    const trusted = new URL(process.env.BETTER_AUTH_URL ?? req.url).origin;
    if (!origin || origin !== trusted)
      throw new HttpError(
        403,
        'This request could not be verified. Reload the page and try again.',
      );
    if (Number(req.headers.get('content-length') ?? 0) > 600000)
      throw new HttpError(413, 'Request is too large.');
    const text = await req.text();
    if (Buffer.byteLength(text) > 600000) throw new HttpError(413, 'Request is too large.');
    let input: unknown;
    try {
      input = JSON.parse(text || '{}');
    } catch {
      throw new HttpError(400, 'Invalid JSON request.');
    }
    if (path[0] === 'live-search') {
      const { query } = z.object({ query: z.string().trim().min(2).max(120) }).parse(input);
      let listings;
      try {
        listings = await searchEbay(query);
      } catch (e) {
        throw new HttpError(503, e instanceof Error ? e.message : 'Provider unavailable.');
      }
      const items = await db.$transaction(async (tx) => {
        const result = [];
        for (const p of listings) {
          const old = await tx.product.findFirst({
            where: { ownerId: userId, model: p.model, dataMode: 'live' },
          });
          result.push(
            old
              ? await tx.product.update({ where: { id: old.id }, data: p })
              : await tx.product.create({ data: { ...p, ownerId: userId } }),
          );
        }
        return result;
      });
      return NextResponse.json({ products: items });
    }
    const result = await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
        const id = path[1];
        if (path[0] === 'onboarding') {
          const data = z
            .object({
              preference: preferenceSchema,
              monthly: z.number().int().min(1).max(1_000_000_000).nullable(),
              approval: z.number().int().min(1).max(1_000_000_000).nullable(),
            })
            .parse(input);
          if (data.monthly !== null) {
            const existing = await tx.budget.findFirst({
              where: { userId, scope: 'overall', currency: data.preference.currency },
            });
            const budget = {
              scope: 'overall',
              category: null,
              amount: data.monthly,
              currency: data.preference.currency,
              alertAt: 80,
              enabled: true,
            };
            if (existing) await tx.budget.update({ where: { id: existing.id }, data: budget });
            else await tx.budget.create({ data: { ...budget, userId } });
          }
          if (data.approval !== null) {
            const existing = await tx.rule.findFirst({ where: { userId, type: 'approval' } });
            const rule = {
              name: 'Ask before a larger purchase',
              type: 'approval',
              parameters: { amount: data.approval, currency: data.preference.currency },
              outcome: 'REVIEW',
              enabled: true,
            };
            if (existing) await tx.rule.update({ where: { id: existing.id }, data: rule });
            else await tx.rule.create({ data: { ...rule, userId } });
          }
          await tx.preference.update({
            where: { userId },
            data: {
              ...data.preference,
              onboarded: true,
              priorities: json(data.preference.priorities),
            },
          });
          await log(
            tx,
            userId,
            'onboarding.completed',
            null,
            'Initial preferences, budget and approval threshold saved.',
          );
          return { ok: true };
        }
        if (path[0] === 'preferences') {
          const data = preferenceSchema.parse(input);
          await tx.preference.update({
            where: { userId },
            data: { ...data, priorities: json(data.priorities) },
          });
          await log(tx, userId, 'settings.updated', null, 'Preferences updated.');
          return { ok: true };
        }
        if (path[0] === 'profile') {
          const { name } = z.object({ name: z.string().trim().min(1).max(100) }).parse(input);
          await tx.user.update({ where: { id: userId }, data: { name } });
          await log(tx, userId, 'profile.updated', null, 'Profile name updated.');
          return { ok: true };
        }
        if (path[0] === 'budgets' || path[0] === 'rules') {
          const isBudget = path[0] === 'budgets';
          if (id) {
            const owned = isBudget
              ? await tx.budget.findFirst({ where: { id, userId } })
              : await tx.rule.findFirst({ where: { id, userId } });
            if (!owned) throw new HttpError(404, 'Record not found.');
          }
          if (req.method === 'DELETE') {
            if (!id) throw new HttpError(400, 'Record ID required.');
            if (isBudget) await tx.budget.delete({ where: { id } });
            else await tx.rule.delete({ where: { id } });
            await log(tx, userId, `${path[0]}.deleted`, id, 'Configuration deleted.');
            return { ok: true };
          }
          if (isBudget) {
            const data = budgetSchema.parse(input);
            const item = id
              ? await tx.budget.update({ where: { id }, data })
              : await tx.budget.create({ data: { ...data, userId } });
            await log(tx, userId, 'budget.saved', item.id, `${data.scope} budget saved.`);
            return item;
          }
          const data = ruleSchema.parse(input);
          const item = id
            ? await tx.rule.update({
                where: { id },
                data: { ...data, parameters: json(data.parameters) },
              })
            : await tx.rule.create({
                data: { ...data, parameters: json(data.parameters), userId },
              });
          await log(tx, userId, 'rule.saved', item.id, `${data.name} saved.`);
          return item;
        }
        if (path[0] === 'reviews') {
          if (!id) {
            const data = z
              .object({ productId: z.string().optional(), manual: manualSchema.optional() })
              .refine((x) => !!x.productId !== !!x.manual, 'Choose a product or enter a proposal.')
              .parse(input);
            let p: ProductData;
            if (data.productId) {
              const found = await accessibleProduct(data.productId, userId);
              if (!found) throw new HttpError(404, 'Product not found.');
              p = productData(found);
            } else
              p = {
                ...data.manual!,
                dataMode: 'demo',
                observedAt: new Date().toISOString(),
                sourceUrl: null,
                incentive: null,
              };
            const [rs, bs, spend] = await Promise.all([
              tx.rule.findMany({ where: { userId } }),
              tx.budget.findMany({ where: { userId } }),
              tx.review.findMany({ where: { userId } }),
            ]);
            const evaluated = evaluate(p, rules(rs), bs, spend);
            const alts = await alternatives(p, userId);
            const review = await tx.review.create({
              data: {
                userId,
                productId: p.id,
                product: json(p),
                category: p.category,
                amount: p.price + p.fees,
                currency: p.currency,
                ...evaluated,
                checks: json(evaluated.checks),
                alternatives: json(alts),
              },
            });
            await log(
              tx,
              userId,
              'review.started',
              review.id,
              'Purchase reviewed against current rules.',
            );
            if (evaluated.verdict !== 'ALLOW')
              await tx.notification.create({
                data: {
                  userId,
                  title: 'A purchase needs your attention',
                  description: `${p.name}: ${evaluated.verdict.toLowerCase()}.`,
                  link: `/review/${review.id}`,
                },
              });
            return { id: review.id };
          }
          const review = await tx.review.findFirst({
            where: { id, userId },
            include: { receipt: true },
          });
          if (!review) throw new HttpError(404, 'Review not found.');
          if (review.status !== 'pending')
            throw new HttpError(409, 'This decision has already been recorded.');
          if (path[2] === 'recheck') {
            const [rs, bs, spend] = await Promise.all([
              tx.rule.findMany({ where: { userId } }),
              tx.budget.findMany({ where: { userId } }),
              tx.review.findMany({ where: { userId, id: { not: id } } }),
            ]);
            const ev = evaluate(review.product as unknown as ProductData, rules(rs), bs, spend);
            await tx.review.update({
              where: { id },
              data: { verdict: ev.verdict, checks: json(ev.checks) },
            });
            await log(
              tx,
              userId,
              'review.rechecked',
              id,
              'Pending proposal rechecked against current rules.',
            );
            return { id };
          }
          const data = z
            .object({
              decision: z.enum(['approved', 'rejected', 'switch']),
              reason: z.string().trim().max(1000).default(''),
              alternativeId: z.string().optional(),
            })
            .parse(input);
          if (data.decision === 'switch') {
            if (
              !data.alternativeId ||
              (review.alternatives as ProductData[]).every((p) => p.id !== data.alternativeId)
            )
              throw new HttpError(400, 'Choose an alternative shown in this review.');
            const item = await accessibleProduct(data.alternativeId, userId);
            if (!item) throw new HttpError(404, 'Alternative is no longer available.');
            const p = productData(item);
            const [rs, bs, spend] = await Promise.all([
              tx.rule.findMany({ where: { userId } }),
              tx.budget.findMany({ where: { userId } }),
              tx.review.findMany({ where: { userId, id: { not: id } } }),
            ]);
            const ev = evaluate(p, rules(rs), bs, spend);
            const next = await tx.review.create({
              data: {
                userId,
                productId: p.id,
                product: json(p),
                category: p.category,
                amount: p.price + p.fees,
                currency: p.currency,
                verdict: ev.verdict,
                checks: json(ev.checks),
                alternatives: json(await alternatives(p, userId)),
                switchedFromAmount: review.amount,
              },
            });
            await tx.review.update({
              where: { id },
              data: { status: 'switched', reason: data.reason, decidedAt: new Date() },
            });
            await tx.receipt.create({
              data: {
                reviewId: id,
                snapshot: json({
                  ...review,
                  receipt: undefined,
                  decision: 'switched',
                  reason: data.reason,
                  nextReviewId: next.id,
                  decidedAt: new Date().toISOString(),
                  externalOrderAction: 'None',
                }),
              },
            });
            await log(
              tx,
              userId,
              'review.switched',
              id,
              'Alternative selected for a new independent review.',
            );
            return { id: next.id };
          }
          const [rs, bs, spend] = await Promise.all([
            tx.rule.findMany({ where: { userId } }),
            tx.budget.findMany({ where: { userId } }),
            tx.review.findMany({ where: { userId, id: { not: id } } }),
          ]);
          const ev = evaluate(review.product as unknown as ProductData, rules(rs), bs, spend);
          if (data.decision === 'approved' && ev.verdict === 'BLOCK')
            throw new HttpError(
              409,
              'Blocked by your current rule. Reject this proposal, choose an alternative, or edit your rule.',
            );
          if (
            data.decision === 'approved' &&
            ['REVIEW', 'UNKNOWN'].includes(ev.verdict) &&
            !data.reason
          )
            throw new HttpError(
              400,
              'Explain your decision and acknowledge any uncertainty before approving.',
            );
          const updated = await tx.review.update({
            where: { id },
            data: {
              status: data.decision,
              reason: data.reason,
              decidedAt: new Date(),
              verdict: ev.verdict,
              checks: json(ev.checks),
            },
          });
          await tx.receipt.create({
            data: {
              reviewId: id,
              snapshot: json({
                ...updated,
                externalOrderAction: 'None — decision recorded inside BUYWISE only.',
              }),
            },
          });
          await log(
            tx,
            userId,
            `review.${data.decision}`,
            id,
            `${data.decision === 'approved' ? 'Approval' : 'Rejection'} recorded inside BUYWISE.`,
          );
          if (data.decision === 'approved') {
            const pref = await tx.preference.findUnique({ where: { userId } });
            if (pref?.optionalNotifications)
              for (const b of bs.filter((b) => b.enabled && b.scope !== 'transaction')) {
                const usage = budgetUsage(b, [...spend, updated]);
                if (usage.spent >= (b.amount * b.alertAt) / 100)
                  await tx.notification.create({
                    data: {
                      userId,
                      title: 'Budget threshold reached',
                      description: `Your ${b.scope} budget has reached ${b.alertAt}% usage.`,
                      link: '/budgets',
                    },
                  });
              }
          }
          return { id };
        }
        if (path[0] === 'rule-test') {
          const data = z.object({ rule: ruleSchema, productId: z.string() }).parse(input);
          const p = await accessibleProduct(data.productId, userId);
          if (!p) throw new HttpError(404, 'Product not found.');
          return evaluate(productData(p), [{ ...data.rule, id: 'test' }], [], []);
        }
        if (path[0] === 'watchlist') {
          if (id) {
            const w = await tx.watch.findFirst({ where: { id, userId } });
            if (!w) throw new HttpError(404, 'Watchlist item not found.');
            if (req.method === 'DELETE') {
              await tx.watch.delete({ where: { id } });
              await log(tx, userId, 'watch.removed', id, 'Watchlist item removed.');
              return { ok: true };
            }
            const data = z
              .object({
                targetPrice: z.number().int().min(1).max(1_000_000_000).nullable(),
                paused: z.boolean(),
              })
              .parse(input);
            await tx.watch.update({ where: { id }, data });
            await log(tx, userId, 'watch.updated', id, 'Alert preferences updated.');
            return { ok: true };
          }
          const { productId } = z.object({ productId: z.string() }).parse(input);
          if (!(await accessibleProduct(productId, userId)))
            throw new HttpError(404, 'Product not found.');
          const w = await tx.watch.upsert({
            where: { userId_productId: { userId, productId } },
            create: { userId, productId },
            update: {},
          });
          await log(tx, userId, 'watch.saved', w.id, 'Product saved to watchlist.');
          return w;
        }
        if (path[0] === 'check-alerts') {
          const ws = await tx.watch.findMany({ where: { userId, paused: false } });
          const preference = await tx.preference.findUnique({ where: { userId } });
          let triggered = 0;
          for (const w of ws) {
            const p = await accessibleProduct(w.productId, userId);
            if (!p || p.dataMode !== 'demo') continue;
            const now = new Date();
            const match = alertMatches(
              p.price + p.fees,
              w.targetPrice,
              w.paused,
              now.toISOString(),
            );
            await tx.watch.update({
              where: { id: w.id },
              data: { lastCheckedAt: now, ...(match ? { lastTriggeredAt: now } : {}) },
            });
            if (
              preference?.optionalNotifications &&
              match &&
              (!w.lastTriggeredAt || now.getTime() - w.lastTriggeredAt.getTime() > 86400000)
            ) {
              await tx.notification.create({
                data: {
                  userId,
                  title: 'Simulated price alert',
                  description: `${p.name} meets your target in the demo catalogue. This is not a live price change.`,
                  link: `/product/${p.id}`,
                },
              });
              triggered++;
            }
          }
          return { triggered };
        }
        if (path[0] === 'comparisons') {
          const data = z
            .object({
              productIds: z
                .array(z.string())
                .min(2)
                .max(4)
                .refine((a) => new Set(a).size === a.length),
              weights: weightsSchema,
            })
            .parse(input);
          for (const pid of data.productIds)
            if (!(await accessibleProduct(pid, userId)))
              throw new HttpError(404, 'Product not found.');
          const c = await tx.comparison.create({
            data: { userId, productIds: data.productIds, weights: json(data.weights) },
          });
          await log(tx, userId, 'comparison.saved', c.id, 'Comparison and scoring weights saved.');
          return c;
        }
        if (path[0] === 'notifications') {
          if (id) {
            const count = await tx.notification.updateMany({
              where: { id, userId },
              data: { readAt: new Date() },
            });
            if (!count.count) throw new HttpError(404, 'Notification not found.');
          } else
            await tx.notification.updateMany({
              where: { userId, readAt: null },
              data: { readAt: new Date() },
            });
          return { ok: true };
        }
        if (path[0] === 'import') {
          const data = z
            .object({ csv: z.string().max(512000), commit: z.boolean().default(false) })
            .parse(input);
          const parsed = parseImport(data.csv);
          if (!data.commit || parsed.errors.length) return { ...parsed, imported: 0 };
          for (const r of parsed.rows)
            await tx.product.create({
              data: {
                ...r,
                seller: r.seller ?? null,
                description: 'User-imported product. Verify the source before deciding.',
                specifications: {},
                dataMode: 'imported',
                ownerId: userId,
                observedAt: new Date(),
              },
            });
          await log(
            tx,
            userId,
            'products.imported',
            null,
            `${parsed.rows.length} products imported.`,
          );
          return { errors: [], rows: parsed.rows, imported: parsed.rows.length };
        }
        if (path[0] === 'export') {
          const { format, confirmation } = z
            .object({ format: z.enum(['json', 'csv']), confirmation: z.literal(true) })
            .parse(input);
          void confirmation;
          const [
            preference,
            budgets,
            rs,
            reviews,
            watches,
            events,
            comparisons,
            products,
            notifications,
          ] = await Promise.all([
            tx.preference.findUnique({ where: { userId } }),
            tx.budget.findMany({ where: { userId } }),
            tx.rule.findMany({ where: { userId } }),
            tx.review.findMany({ where: { userId }, include: { receipt: true } }),
            tx.watch.findMany({ where: { userId } }),
            tx.event.findMany({ where: { userId } }),
            tx.comparison.findMany({ where: { userId } }),
            tx.product.findMany({ where: { ownerId: userId } }),
            tx.notification.findMany({ where: { userId } }),
          ]);
          const data = {
            profile: { name: session.user.name, email: session.user.email },
            preference,
            budgets,
            rules: rs,
            reviews,
            watches,
            events,
            comparisons,
            products,
            notifications,
          };
          await log(tx, userId, 'data.exported', null, `${format.toUpperCase()} export requested.`);
          const records = Object.entries(data).flatMap(([entity, items]) =>
            (Array.isArray(items) ? items : [items]).map((item) =>
              [entity, JSON.stringify(item)].map(csvCell).join(','),
            ),
          );
          return {
            download:
              format === 'json'
                ? JSON.stringify(data, null, 2)
                : 'entity,data\r\n' + records.join('\r\n'),
            format,
          };
        }
        if (path[0] === 'delete-account') {
          const { confirmation } = z.object({ confirmation: z.literal('DELETE') }).parse(input);
          void confirmation;
          await tx.user.delete({ where: { id: userId } });
          return { deleted: true };
        }
        throw new HttpError(404, 'Not found.');
      },
      { timeout: 20000 },
    );
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: e.issues.map((i) => i.message).join(' ') },
        { status: 400 },
      );
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034')
      return NextResponse.json(
        { error: 'Another change was just saved. Please retry.' },
        { status: 409 },
      );
    console.error('API operation failed:', e instanceof Error ? e.name : 'UnknownError');
    return NextResponse.json(
      { error: 'This change could not be completed. Please try again.' },
      { status: 500 },
    );
  }
}
export { route as GET, route as POST, route as PATCH, route as DELETE };
