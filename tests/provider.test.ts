import { afterEach, describe, it, expect, vi } from 'vitest';
import { searchEbay } from '../src/lib/ebay';
import { weightsSchema } from '../src/lib/validation';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('live provider boundary', () => {
  it('requires an authorized token and never substitutes demo results', async () => {
    vi.stubEnv('EBAY_ACCESS_TOKEN', '');
    await expect(searchEbay('laptop')).rejects.toThrow('not connected');
  });
  it('keeps upstream currency and missing terms explicit', async () => {
    vi.stubEnv('EBAY_ACCESS_TOKEN', 'unit-test-placeholder');
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          itemSummaries: [
            {
              itemId: 'real-id',
              title: 'Listing from provider',
              price: { value: '19.95', currency: 'USD' },
              itemWebUrl: 'https://www.ebay.com/itm/123',
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', request);
    const [p] = await searchEbay('laptop');
    expect(p.price).toBe(1995);
    expect(p.currency).toBe('USD');
    expect(p.dataMode).toBe('live');
    expect(p.warrantyMonths).toBeNull();
    expect(p.returnDays).toBeNull();
    expect(p.specifications.feesKnown).toBe(false);
    expect(String(request.mock.calls[0][0])).toContain('api.ebay.com/buy/browse');
  });
  it('reports expired authorization without leaking credentials', async () => {
    vi.stubEnv('EBAY_ACCESS_TOKEN', 'unit-test-placeholder');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    await expect(searchEbay('laptop')).rejects.toThrow('expired or is invalid');
  });
  it('reports upstream unavailability without fallback', async () => {
    vi.stubEnv('EBAY_ACCESS_TOKEN', 'unit-test-placeholder');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(searchEbay('laptop')).rejects.toThrow('No demo results have been substituted');
  });
  it('rejects unsafe source links', async () => {
    vi.stubEnv('EBAY_ACCESS_TOKEN', 'unit-test-placeholder');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            itemSummaries: [
              {
                itemId: 'x',
                title: 'x',
                price: { value: '1', currency: 'USD' },
                itemWebUrl: 'javascript:alert(1)',
              },
            ],
          }),
        ),
      ),
    );
    await expect(searchEbay('laptop')).rejects.toThrow();
  });
});
describe('comparison preferences', () => {
  it('accepts a supported subset instead of requiring every possible attribute', () =>
    expect(weightsSchema.safeParse({ price: 40, warrantyMonths: 30, returnDays: 30 }).success).toBe(
      true,
    ));
  it('rejects unsupported and all-zero priorities', () => {
    expect(weightsSchema.safeParse({ inventedRating: 100 }).success).toBe(false);
    expect(weightsSchema.safeParse({ price: 0 }).success).toBe(false);
  });
});
