import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatMileage(miles: number | null): string {
  if (miles === null) return "—";
  return new Intl.NumberFormat("en-US").format(miles) + " mi";
}

export function formatDelta(delta: number | null, percent: number | null): string {
  if (delta === null || percent === null) return "";
  const sign = delta < 0 ? "−" : "+";
  const abs = Math.abs(delta);
  const pct = Math.abs(percent).toFixed(1);
  return `${sign}$${new Intl.NumberFormat("en-US").format(abs)} (${pct}%)`;
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
