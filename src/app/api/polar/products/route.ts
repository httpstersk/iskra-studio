import { getErrorMessage, isErr, tryPromise } from "@/lib/errors/safe-errors";
import { logger } from "@/lib/logger";
import { polar, POLAR_CONFIG } from "@/lib/polar";
import { NextResponse } from "next/server";

const log = logger.polar;

export async function GET() {
  const productsResult = await tryPromise(
    polar.products.list({
      organizationId: POLAR_CONFIG.organizationId,
      isArchived: false,
    }),
  );

  if (isErr(productsResult)) {
    log.error(
      "Failed to fetch Polar products",
      getErrorMessage(productsResult),
    );
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }

  const products = productsResult.result;

  // Filter for our specific products
  const monthlyProduct = products.items.find(
    (p) => p.id === POLAR_CONFIG.products.monthly,
  );
  const annualProduct = products.items.find(
    (p) => p.id === POLAR_CONFIG.products.annual,
  );

  return NextResponse.json({
    monthly: monthlyProduct ?? null,
    annual: annualProduct ?? null,
  });
}
