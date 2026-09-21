import { moneyString, parseDecimal } from "@/lib/commerce/money";
import { formatHarvestMonth } from "@/lib/harvest/month";

export function formatHarvestMonthLabel(year: number, month: number): string {
  return formatHarvestMonth(year, month);
}

export function formatMoney(value: number | string): string {
  const amount = typeof value === "number" ? value : parseDecimal(value, "amount");
  return `$${moneyString(amount)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function displayPhone(phone: string | null | undefined, canView: boolean): string {
  if (!phone) {
    return "—";
  }
  return canView ? phone : "Hidden";
}

export function personName(
  first: string | null | undefined,
  last?: string | null,
): string {
  return [first, last].filter(Boolean).join(" ") || "—";
}

export function locationLabel(
  area?: string | null,
  city?: string | null,
): string {
  return [area, city].filter(Boolean).join(", ") || "—";
}

export function vendorAddressLabel(vendor: {
  area?: string | null;
  city?: string | null;
  province?: string | null;
  market_name?: string | null;
  country?: string | null;
}): string {
  const place = [vendor.area, vendor.city, vendor.province].filter(Boolean).join(", ");
  const lines = [place || null, vendor.market_name || null, vendor.country || null].filter(Boolean);
  return lines.join(" · ") || "—";
}
