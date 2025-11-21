/**
 * Hook to fetch Polar products.
 *
 * Uses React Query to fetch and cache product details from the API.
 */

import { useQuery } from "@tanstack/react-query";
import { tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";

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
            const fetchResult = await tryPromise(fetch("/api/polar/products"));
            if (isErr(fetchResult)) {
                throw new Error(`Failed to fetch products: ${getErrorMessage(fetchResult)}`);
            }

            const response = fetchResult;
            if (!response.ok) {
                throw new Error("Failed to fetch products");
            }

            const jsonResult = await tryPromise(response.json());
            if (isErr(jsonResult)) {
                throw new Error(`Failed to parse products response: ${getErrorMessage(jsonResult)}`);
            }

            return jsonResult;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    return {
        error: error instanceof Error ? error.message : null,
        isLoading,
        products: products ?? null,
    };
}
