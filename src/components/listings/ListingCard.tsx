"use client";

import { useState } from "react";
import Image from "next/image";
import type { TeslaListing } from "@/lib/types";
import { DealBadge } from "@/components/ui/DealBadge";
import { formatPrice, formatMileage, formatDelta, timeAgo, cn } from "@/lib/utils/format";
import {
  ExternalLink,
  MapPin,
  Gauge,
  Calendar,
  Zap,
  Shield,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

interface ListingCardProps {
  listing: TeslaListing;
  style?: React.CSSProperties;
}

const SOURCE_COLORS: Record<string, string> = {
  cargurus: "#00A0DC",
  autotrader: "#E35000",
  "cars.com": "#C41230",
  carmax: "#005A8B",
  craigslist: "#CC0000",
  tesla: "#E31937",
  facebook: "#1877F2",
};

export function ListingCard({ listing, style }: ListingCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasGreatDeal = listing.dealRating === "great";
  const hasGoodDeal = listing.dealRating === "good";
  const sourceColor = SOURCE_COLORS[listing.source] ?? "#6B7280";

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300",
        "bg-tesla-dark-card border border-tesla-dark-border",
        "hover:border-white/10 hover:shadow-card-hover",
        hasGreatDeal && "ring-1 ring-deal-great/30",
      )}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="relative aspect-[16/9] bg-tesla-dark-surface overflow-hidden">
        {listing.images[0] && !imgError ? (
          <Image
            src={listing.images[0]}
            alt={`${listing.year} Tesla Model Y ${listing.variant}`}
            fill
            className={cn(
              "object-cover transition-transform duration-500",
              isHovered && "scale-105"
            )}
            onError={() => setImgError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              viewBox="0 0 200 120"
              className="w-32 opacity-20"
              fill="currentColor"
            >
              {/* Tesla Model Y silhouette */}
              <path d="M30 90 Q50 70 100 65 Q150 70 170 90 L170 95 L30 95 Z" />
              <path d="M50 65 Q55 50 100 48 Q145 50 150 65 Z" />
              <circle cx="55" cy="93" r="8" />
              <circle cx="145" cy="93" r="8" />
            </svg>
          </div>
        )}

        {/* Overlay: Deal badge (top left) */}
        <div className="absolute top-3 left-3">
          <DealBadge rating={listing.dealRating} size="md" />
        </div>

        {/* Overlay: Source badge (top right) */}
        <div
          className="absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-lg backdrop-blur-sm"
          style={{
            backgroundColor: `${sourceColor}20`,
            border: `1px solid ${sourceColor}40`,
            color: sourceColor,
          }}
        >
          {listing.sourceName}
        </div>

        {/* Gradient fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-tesla-dark-card to-transparent" />
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white leading-tight">
              {listing.year} Model Y{" "}
              <span className="text-tesla-silver">{listing.variant}</span>
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-tesla-dark-muted">
              <MapPin className="w-3 h-3" />
              <span>
                {listing.city}, {listing.state}
              </span>
              {listing.distanceMiles !== undefined && (
                <span className="text-tesla-dark-muted/70">
                  · {listing.distanceMiles}mi away
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-white tabular-nums">
              {formatPrice(listing.price)}
            </div>
            {listing.dealDelta !== null && (
              <div
                className="text-xs tabular-nums font-medium"
                style={{
                  color:
                    listing.dealRating === "overpriced"
                      ? "#EF4444"
                      : "#22C55E",
                }}
              >
                {formatDelta(listing.dealDelta, listing.dealDeltaPercent)}
              </div>
            )}
          </div>
        </div>

        {/* Market value bar */}
        {listing.marketValue && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-tesla-dark-muted">
              <span>Market Value</span>
              <span className="text-tesla-silver font-medium">
                {formatPrice(listing.marketValue)}
              </span>
            </div>
            <div className="relative h-1.5 bg-tesla-dark-border rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (listing.price / (listing.marketValue * 1.3)) * 100)}%`,
                  backgroundColor:
                    listing.dealRating === "great"
                      ? "#22C55E"
                      : listing.dealRating === "good"
                      ? "#84CC16"
                      : listing.dealRating === "fair"
                      ? "#F59E0B"
                      : "#EF4444",
                }}
              />
              {/* Market value marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-white/40"
                style={{
                  left: `${Math.min(95, (listing.marketValue / (listing.marketValue * 1.3)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Specs row */}
        <div className="flex items-center gap-4 text-xs text-tesla-dark-muted">
          <div className="flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5" />
            <span>{formatMileage(listing.mileage)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{listing.year}</span>
          </div>
          <div className="flex items-center gap-1 text-tesla-silver">
            <div
              className="w-2.5 h-2.5 rounded-full border border-white/20"
              style={{ backgroundColor: getColorHex(listing.exteriorColor) }}
            />
            <span>{listing.exteriorColor}</span>
          </div>
          {listing.seatingConfig === 7 && (
            <div className="flex items-center gap-1 text-tesla-silver">
              <span>7-seat</span>
            </div>
          )}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          {listing.accidentFree && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-green-400 border border-green-400/20">
              <CheckCircle2 className="w-3 h-3" />
              Accident Free
            </span>
          )}
          {listing.titleStatus === "clean" && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">
              <Shield className="w-3 h-3" />
              Clean Title
            </span>
          )}
          {listing.fsd && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-blue-400 border border-blue-400/20">
              <Zap className="w-3 h-3" />
              FSD
            </span>
          )}
          {listing.oneOwner && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">
              1 Owner
            </span>
          )}
          {listing.accidentFree === false && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-400/20">
              <AlertCircle className="w-3 h-3" />
              Has Accident
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-tesla-dark-border mt-auto">
          <span className="text-xs text-tesla-dark-muted">
            Listed {timeAgo(listing.listedAt)}
          </span>
          <a
            href={listing.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200",
              "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white",
              "border border-white/10 hover:border-white/20"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            View Listing
            <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </article>
  );
}

// Map Tesla color names to approximate hex values for the swatch
function getColorHex(colorName: string): string {
  const map: Record<string, string> = {
    "Pearl White": "#F5F5F0",
    "Solid Black": "#1A1A1A",
    "Midnight Silver": "#8A8D91",
    "Deep Blue Metallic": "#1B3A5C",
    "Red Multi-Coat": "#C41230",
    "Ultra Red": "#E3003A",
    Quicksilver: "#C0C0C0",
    "Stealth Grey": "#4A4A4A",
    White: "#F5F5F0",
    Black: "#1A1A1A",
    Cream: "#F5ECD7",
    Other: "#6B7280",
    Unknown: "#6B7280",
  };
  return map[colorName] ?? "#6B7280";
}
