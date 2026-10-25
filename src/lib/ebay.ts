import { z } from 'zod';
import { minor } from './engine';
const listing = z.object({
  itemId: z.string(),
  title: z.string(),
  price: z.object({ value: z.string(), currency: z.enum(['INR', 'USD', 'GBP', 'EUR']) }),
  itemWebUrl: z
    .string()
    .url()
    .refine((value) => new URL(value).protocol === 'https:'),
  seller: z.object({ username: z.string(), feedbackPercentage: z.string().optional() }).optional(),
  categories: z.array(z.object({ categoryName: z.string() })).optional(),
});
export async function searchEbay(query: string) {
  if (!process.env.EBAY_ACCESS_TOKEN)
    throw new Error(
      'Live eBay search is not connected. Add an authorized eBay application access token in server settings.',
    );
  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '24');
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.EBAY_ACCESS_TOKEN}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'Your eBay token has expired or is invalid. Reconnect in server settings.'
        : `The live provider is unavailable (HTTP ${response.status}). No demo results have been substituted.`,
    );
  const result = z
    .object({ itemSummaries: z.array(listing).default([]) })
    .parse(await response.json());
  return result.itemSummaries.map((x) => ({
    name: x.title,
    brand: 'Not provided',
    model: x.itemId,
    category: x.categories?.[0]?.categoryName ?? 'Uncategorized',
    description:
      'Live listing supplied by the eBay Browse API. Shipping, warranty and returns require confirmation with the seller.',
    price: minor(x.price.value),
    fees: 0,
    currency: x.price.currency,
    seller: x.seller?.username ?? null,
    sellerRating: x.seller?.feedbackPercentage ? Number(x.seller.feedbackPercentage) : null,
    warrantyMonths: null,
    returnDays: null,
    specifications: { feesKnown: false },
    dataMode: 'live',
    observedAt: new Date(),
    sourceUrl: x.itemWebUrl,
    incentive: 'No affiliate link is added by BUYWISE.',
  }));
}
