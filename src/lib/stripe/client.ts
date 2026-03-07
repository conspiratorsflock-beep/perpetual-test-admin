import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;

// Check if Stripe is properly configured (not missing and not a placeholder)
export const isStripeConfigured = 
  stripeKey && 
  stripeKey !== "sk_test_placeholder" && 
  stripeKey.startsWith("sk_");

export const stripe = isStripeConfigured && stripeKey
  ? new Stripe(stripeKey, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    })
  : null;
