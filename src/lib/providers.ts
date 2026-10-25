import { db } from './db';
import type { Product } from '@prisma/client';
import type { ProductData } from './engine';
export type ProviderResult<T> = {
  status: 'available' | 'unavailable' | 'stale';
  data: T;
  dataMode: 'demo' | 'imported' | 'live';
  fetchedAt: string;
  sourceUrl: string | null;
};
export interface ProductProvider {
  searchProducts(query: string, filters: { category?: string }): Promise<ProviderResult<Product[]>>;
  getOffers(productId: string): Promise<ProviderResult<Product[]>>;
  getSeller(
    sellerId: string,
  ): Promise<ProviderResult<{ name: string; rating: number | null } | null>>;
  getPriceHistory(
    productId: string,
  ): Promise<ProviderResult<{ price: number; observedAt: string }[]>>;
}
export class DemoProvider implements ProductProvider {
  async searchProducts(query: string, filters: { category?: string }) {
    const data = await db.product.findMany({
      where: {
        dataMode: 'demo',
        ownerId: null,
        ...(filters.category ? { category: filters.category } : {}),
        OR: ['name', 'brand', 'model', 'category', 'description'].map((k) => ({
          [k]: { contains: query, mode: 'insensitive' },
        })),
      },
      orderBy: { name: 'asc' },
    });
    return this.result(data);
  }
  async getOffers(productId: string) {
    return this.result(
      await db.product.findMany({ where: { id: productId, dataMode: 'demo', ownerId: null } }),
    );
  }
  async getSeller(sellerId: string) {
    const p = await db.product.findFirst({
      where: { seller: sellerId, dataMode: 'demo', ownerId: null },
    });
    return this.result(p ? { name: p.seller!, rating: p.sellerRating } : null);
  }
  async getPriceHistory(_productId: string) {
    void _productId;
    return this.result([] as { price: number; observedAt: string }[]);
  }
  private result<T>(data: T): ProviderResult<T> {
    return {
      status: 'available',
      data,
      dataMode: 'demo',
      fetchedAt: new Date().toISOString(),
      sourceUrl: null,
    };
  }
}
export const demoProvider = new DemoProvider();
export function productData(p: Product): ProductData {
  return {
    ...p,
    specifications: p.specifications as Record<string, unknown>,
    observedAt: p.observedAt.toISOString(),
  };
}
export async function accessibleProduct(id: string, userId: string) {
  return db.product.findFirst({ where: { id, OR: [{ ownerId: userId }, { ownerId: null }] } });
}
export async function alternatives(p: ProductData, userId: string) {
  return (
    await db.product.findMany({
      where: {
        id: { not: p.id },
        category: p.category,
        currency: p.currency,
        dataMode: p.dataMode,
        OR: [{ ownerId: null }, { ownerId: userId }],
        price: { lt: p.price },
      },
      orderBy: { price: 'asc' },
      take: 20,
    })
  )
    .filter((x) => x.price + x.fees < p.price + p.fees)
    .slice(0, 3)
    .map(productData);
}
