import { z } from "zod";

export const analysisSchema = z.object({
    filters: z.object({
        marketCapMin: z.number().optional(),
        marketCapMax: z.number().optional(),
        epsMin: z.number().optional(),
        epsMax: z.number().optional(),
        industry: z.string().optional(),
        signal: z.string().optional(),
        limit: z.number().optional(),
    }).optional(),

    analysisPreferences: z.object({
        riskTolerance: z.enum(["low", "medium", "high"]).optional(),
        focus: z.enum(["value", "growth", "dividends", "momentum"]).optional(),
        timeHorizon: z.enum(["short", "medium", "long"]).optional(),
    }).optional(),
});