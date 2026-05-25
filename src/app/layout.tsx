import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Using Google Fonts via CSS import in globals since we don't have a paid Gotham license
// In production, replace with actual Gotham or similar premium font
export const metadata: Metadata = {
  title: "Tesla Hunter — Find the Best Model Y Deal",
  description:
    "Search, filter, and compare Tesla Model Y listings from multiple sources. Instantly see if a listing is a great deal, fair price, or overpriced — compared to real market data.",
  keywords: [
    "Tesla Model Y",
    "Tesla Model Y for sale",
    "used Tesla",
    "Tesla deals",
    "best Tesla price",
    "Tesla market value",
  ],
  openGraph: {
    title: "Tesla Hunter",
    description: "Find the best-priced Tesla Model Y listings",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head />
      <body className="bg-tesla-dark-bg text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
