import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    scrapers: {
      cargurus: "enabled",
      autotrader: "pending",
      "cars.com": "pending",
    },
    mode: process.env.NODE_ENV,
  });
}
