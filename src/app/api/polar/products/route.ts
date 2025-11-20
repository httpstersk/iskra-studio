
import { NextResponse } from "next/server";
import { polar, POLAR_CONFIG } from "@/lib/polar";

export async function GET() {
    try {
        const products = await polar.products.list({
            organizationId: POLAR_CONFIG.organizationId,
            isArchived: false,
        });

        // Filter for our specific products
        const monthlyProduct = products.result.items.find(
            (p) => p.id === POLAR_CONFIG.products.monthly
        );
        const annualProduct = products.result.items.find(
            (p) => p.id === POLAR_CONFIG.products.annual
        );

        return NextResponse.json({
            monthly: monthlyProduct ?? null,
            annual: annualProduct ?? null,
        });
    } catch (error) {
        console.error("Failed to fetch Polar products:", error);
        return NextResponse.json(
            { error: "Failed to fetch products" },
            { status: 500 }
        );
    }
}
