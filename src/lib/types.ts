import type { ProductData, Check, BudgetData, RuleData } from './engine';
export type Product = ProductData & {
  id: string;
  brand: string;
  model: string;
  description: string;
  availability: string | null;
};
export type Review = {
  id: string;
  product: ProductData;
  productId: string | null;
  category: string;
  amount: number;
  currency: string;
  verdict: string;
  checks: Check[];
  alternatives: ProductData[];
  status: string;
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
  switchedFromAmount: number | null;
  receipt: { id: string; snapshot: Record<string, unknown>; createdAt: string } | null;
};
export type Watch = {
  id: string;
  productId: string;
  targetPrice: number | null;
  paused: boolean;
  lastCheckedAt: string | null;
};
export type Preference = {
  currency: string;
  priorities: Record<string, number>;
  onboarded: boolean;
  optionalNotifications: boolean;
  theme: string;
};
export type State = {
  user: { id: string; name: string; email: string };
  preference: Preference;
  budgets: (BudgetData & { spent: number; pending: number; remaining: number; alertAt: number })[];
  rules: RuleData[];
  reviews: Review[];
  watches: Watch[];
  products: Product[];
  events: {
    id: string;
    action: string;
    entityId: string | null;
    detail: string;
    createdAt: string;
  }[];
  notifications: {
    id: string;
    title: string;
    description: string;
    link: string;
    readAt: string | null;
    createdAt: string;
  }[];
  comparisons: { id: string; productIds: string[]; weights: Record<string, number> }[];
  provider: {
    ebayConnected: boolean;
    marketplace: string;
    liveAlerts: boolean;
    emailNotifications: boolean;
  };
};
