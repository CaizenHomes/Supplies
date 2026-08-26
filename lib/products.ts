import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types";

export type Product = Tables<"products">;
export type ProductWithUsage = Product & { timesOrdered: number };

// "Actually purchased" — matches the spec's usage-count definition exactly, and is also
// what average/latest price and the trend indicator are computed from (a wishlist guess
// or a rejected request's price isn't a real purchase price).
const COUNTED_STATUSES = ["ordered", "received"] as const;

export async function getProductsWithUsage(): Promise<ProductWithUsage[]> {
  const supabase = await createClient();

  const [{ data: products }, { data: countedItems }] = await Promise.all([
    supabase.from("products").select("*"),
    supabase
      .from("items")
      .select("product_id")
      .not("product_id", "is", null)
      .in("status", COUNTED_STATUSES),
  ]);

  const counts = new Map<string, number>();
  for (const item of countedItems ?? []) {
    if (!item.product_id) continue;
    counts.set(item.product_id, (counts.get(item.product_id) ?? 0) + 1);
  }

  return (products ?? [])
    .map((product) => ({ ...product, timesOrdered: counts.get(product.id) ?? 0 }))
    .sort((a, b) => b.timesOrdered - a.timesOrdered || a.name.localeCompare(b.name));
}

export type ProductOrderRow = {
  id: string;
  requested_at: string;
  qty: number;
  unit_price: number | null;
  status: string;
};

export type PriceTrend = "up" | "down" | "flat" | "unknown";

export type ProductDetail = {
  product: Product;
  recentOrders: ProductOrderRow[];
  timesOrdered: number;
  averagePrice: number | null;
  latestPrice: number | null;
  trend: PriceTrend;
};

export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();

  const { data: product } = await supabase.from("products").select("*").eq("id", id).single();
  if (!product) return null;

  const [{ data: recentOrders }, { data: purchasedItems }] = await Promise.all([
    supabase
      .from("items")
      .select("id, requested_at, qty, unit_price, status")
      .eq("product_id", id)
      .order("requested_at", { ascending: false })
      .limit(5),
    supabase
      .from("items")
      .select("unit_price")
      .eq("product_id", id)
      .in("status", COUNTED_STATUSES)
      .order("ordered_at", { ascending: false }),
  ]);

  // Skip null prices (a supplies item can be ordered without an estimated price) rather
  // than let them collapse the average or masquerade as "the latest price".
  const prices = (purchasedItems ?? [])
    .map((item) => item.unit_price)
    .filter((price): price is number => price != null);

  const averagePrice =
    prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null;
  const latestPrice = prices[0] ?? null;

  let trend: PriceTrend = "unknown";
  if (prices.length >= 3) {
    const newest = prices[0];
    const thirdNewest = prices[2];
    trend = newest > thirdNewest ? "up" : newest < thirdNewest ? "down" : "flat";
  }

  return {
    product,
    recentOrders: recentOrders ?? [],
    timesOrdered: purchasedItems?.length ?? 0,
    averagePrice,
    latestPrice,
    trend,
  };
}
