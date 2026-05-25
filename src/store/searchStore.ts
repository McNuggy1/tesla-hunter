import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SearchFilters,
  SortOption,
  TeslaListing,
  ListingsResponse,
  MarketStats,
} from "@/lib/types";
import { DEFAULT_FILTERS, DEFAULT_SORT } from "@/lib/types";

interface SearchState {
  // Filter state
  filters: SearchFilters;
  sort: SortOption;

  // Results state
  listings: TeslaListing[];
  marketStats: MarketStats | null;
  total: number;
  page: number;
  hasMore: boolean;
  fetchedAt: string | null;

  // UI state
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  fromCache: boolean;

  // Actions
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: SortOption) => void;
  search: () => Promise<void>;
  loadMore: () => Promise<void>;
}

function buildQueryString(filters: SearchFilters, sort: SortOption, page: number): string {
  const params = new URLSearchParams();

  // Numbers
  params.set("yearMin", String(filters.yearMin));
  params.set("yearMax", String(filters.yearMax));
  params.set("priceMin", String(filters.priceMin));
  params.set("priceMax", String(filters.priceMax));
  params.set("mileageMax", String(filters.mileageMax));
  params.set("radiusMiles", String(filters.radiusMiles));

  // Arrays
  if (filters.variants.length) params.set("variants", filters.variants.join(","));
  if (filters.exteriorColors.length) params.set("exteriorColors", filters.exteriorColors.join(","));
  if (filters.interiorColors.length) params.set("interiorColors", filters.interiorColors.join(","));
  if (filters.seatingConfigs.length) params.set("seatingConfigs", filters.seatingConfigs.join(","));
  if (filters.condition.length) params.set("condition", filters.condition.join(","));

  // Booleans
  if (filters.cleanTitleOnly) params.set("cleanTitleOnly", "true");
  if (filters.accidentFreeOnly) params.set("accidentFreeOnly", "true");

  // Location
  if (filters.zip) params.set("zip", filters.zip);

  // Sort & pagination
  params.set("sort", sort);
  params.set("page", String(page));
  params.set("pageSize", "12");

  return params.toString();
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      filters: DEFAULT_FILTERS,
      sort: DEFAULT_SORT,
      listings: [],
      marketStats: null,
      total: 0,
      page: 1,
      hasMore: false,
      fetchedAt: null,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      fromCache: false,

      // Actions
      setFilter: (key, value) => {
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        }));
      },

      setFilters: (partial) => {
        set((state) => ({
          filters: { ...state.filters, ...partial },
        }));
      },

      resetFilters: () => {
        set({ filters: DEFAULT_FILTERS, sort: DEFAULT_SORT });
      },

      setSort: (sort) => {
        set({ sort });
      },

      search: async () => {
        const { filters, sort } = get();
        set({ isLoading: true, error: null, page: 1, listings: [] });

        try {
          const qs = buildQueryString(filters, sort, 1);
          const res = await fetch(`/api/listings?${qs}`);

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message ?? "Search failed");
          }

          const data: ListingsResponse & { fromCache: boolean } = await res.json();

          set({
            listings: data.listings,
            total: data.total,
            page: 1,
            hasMore: data.hasMore,
            marketStats: data.marketStats,
            fetchedAt: data.fetchedAt,
            fromCache: data.fromCache,
            isLoading: false,
          });
        } catch (err) {
          set({
            error: (err as Error).message,
            isLoading: false,
          });
        }
      },

      loadMore: async () => {
        const { filters, sort, page, isLoadingMore, hasMore, listings } = get();
        if (isLoadingMore || !hasMore) return;

        set({ isLoadingMore: true });
        const nextPage = page + 1;

        try {
          const qs = buildQueryString(filters, sort, nextPage);
          const res = await fetch(`/api/listings?${qs}`);
          const data: ListingsResponse & { fromCache: boolean } = await res.json();

          set({
            listings: [...listings, ...data.listings],
            page: nextPage,
            hasMore: data.hasMore,
            isLoadingMore: false,
          });
        } catch {
          set({ isLoadingMore: false });
        }
      },
    }),
    {
      name: "tesla-hunter-filters",
      partialize: (state) => ({
        filters: state.filters,
        sort: state.sort,
      }),
    }
  )
);
