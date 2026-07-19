import { z } from "zod";

/**
 * Fail-fast, validated environment configuration.
 *
 * Import this module at application startup (middleware + root layout) so
 * missing or invalid production configuration throws immediately instead of
 * failing later at runtime.
 *
 * - Development keeps today's loose behavior: all variables are optional.
 * - Production requires Clerk keys, Supabase credentials, and an environment
 *   label, and rejects any dev-auth bypass flag.
 */

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    NEXT_PUBLIC_ENV_LABEL: z.string().optional(),
    DEV_AUTH_BYPASS: z.string().optional(),
    NEXT_PUBLIC_DEV_AUTH_BYPASS: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") {
      return;
    }

    // `next build` runs with NODE_ENV=production but no production env —
    // local machines and CI must not need real secrets to build. This is a
    // RUNTIME startup gate: every real production boot (middleware / root
    // layout module load, where NEXT_PHASE is unset) still enforces it.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return;
    }

    const required: { key: string; value: string | undefined }[] = [
      { key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", value: data.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY },
      { key: "CLERK_SECRET_KEY", value: data.CLERK_SECRET_KEY },
      { key: "NEXT_PUBLIC_SUPABASE_URL", value: data.NEXT_PUBLIC_SUPABASE_URL },
      { key: "SUPABASE_SERVICE_ROLE_KEY", value: data.SUPABASE_SERVICE_ROLE_KEY },
      { key: "NEXT_PUBLIC_ENV_LABEL", value: data.NEXT_PUBLIC_ENV_LABEL },
    ];

    for (const { key, value } of required) {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required in production`,
          path: [key],
        });
      }
    }

    if (
      data.DEV_AUTH_BYPASS === "true" ||
      data.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "DEV_AUTH_BYPASS and NEXT_PUBLIC_DEV_AUTH_BYPASS must not be 'true' in production",
        path: ["DEV_AUTH_BYPASS"],
      });
    }
  });

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
