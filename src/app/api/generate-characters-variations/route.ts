import { createAuthenticatedHandler, requireEnv } from "@/lib/api/api-handler";
import {
    handleVariations,
    variationHandlers,
} from "@/lib/api/variation-api-helper";
import { tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";
import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";

const log = logger.generation;

export const maxDuration = 60;

const requestSchema = z.object({
    characters: z.array(z.string()).min(1).max(12),
    imageUrls: z.array(z.string().url()),
    userContext: z.string().optional(),
});

export const POST = createAuthenticatedHandler({
    schema: requestSchema,
    handler: async (input, _userId) => {
        const { imageUrls, characters, userContext } = input;

        // Initialize Convex client for quota operations
        const { getToken } = await auth();
        const token = await getToken({ template: "convex" });
        const convex = new ConvexHttpClient(
            requireEnv("NEXT_PUBLIC_CONVEX_URL", "Convex URL")
        );

        if (token) {
            convex.setAuth(token);
        }

        // Atomically check and reserve quota before generation
        // This prevents race conditions where parallel requests could exceed quota limits
        const quotaResult = await tryPromise(
            convex.mutation(api.quotas.checkAndReserveQuota, {
                type: "image",
                count: characters.length,
            })
        );

        if (isErr(quotaResult)) {
            const errorMsg = getErrorMessage(quotaResult);
            // Preserve quota exceeded errors for proper client handling
            if (errorMsg.includes("Quota exceeded")) {
                throw new Error(errorMsg);
            }

            throw new Error(`Failed to reserve quota for generation: ${errorMsg}`);
        }

        // Quota has been reserved, proceed with generation
        const generationResult = await tryPromise(
            handleVariations(variationHandlers.characters, {
                imageUrls,
                items: characters,
                userContext,
                itemKey: "characters",
            })
        );

        if (isErr(generationResult)) {
            // Refund quota if generation fails
            const refundResult = await tryPromise(
                convex.mutation(api.quotas.refundQuota, {
                    type: "image",
                    count: characters.length,
                })
            );

            if (isErr(refundResult)) {
                log.error("Failed to refund quota", getErrorMessage(refundResult));
            }

            throw new Error(`Characters variation generation failed: ${getErrorMessage(generationResult)}`);
        }

        return generationResult;
    },
});
