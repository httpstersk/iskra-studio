/**
 * Hook to fetch Polar products.
 *
 * Uses React Query to fetch and cache product details from the API.
 */

import { useQuery } from "@tanstack/react-query";

/**
 * Polar product structure
 */
export interface PolarProduct {
    description: string | null;
    id: string;
    name: string;
    prices: {
        amountType: string;
        id: string;
        priceAmount: number;
        priceCurrency: string;
        recurringInterval: string;
    }[];
}

/**
 * Polar products response structure
 */
export interface PolarProducts {
    annual: PolarProduct | null;
    monthly: PolarProduct | null;
}

/**
 * Custom hook to fetch Polar products.
 *
 * @returns Object containing products, loading state, and error.
 */
export function usePolarProducts() {
    const {
        data: products,
        error,
        isLoading,
    } = useQuery<PolarProducts>({
        queryKey: ["polar-products"],
        queryFn: async () => {
            const response = await fetch("/api/polar/products");
            if (!response.ok) {
                throw new Error("Failed to fetch products");
            }
            return response.json();
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    return {
        error: error instanceof Error ? error.message : null,
        isLoading,
        products: products ?? null,
    };
}
