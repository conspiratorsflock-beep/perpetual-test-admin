# Billing

## Overview

The Billing section provides insights into your platform's revenue metrics, subscription status, and financial health.

## Metrics

### MRR (Monthly Recurring Revenue)
- Calculated from all active Stripe subscriptions
- Includes monthly, yearly (divided by 12), weekly (×4.33), and daily (×30) plans
- Updated in real-time from Stripe

### ARR (Annual Recurring Revenue)
- MRR × 12
- Helps forecast annual revenue

### Churn Rate
- Percentage of subscriptions canceled in the last 30 days
- Calculated as: canceled / (active + canceled) × 100
- "Good" = ≤5%, "Fair" = 5-10%, "High" = >10%

## Invoices

View recent invoices from Stripe:
- Customer name and ID
- Amount paid/due
- Status (paid, open, void, uncollectible)
- Due date

## Coupons

Active promotion codes:
- Percentage or fixed amount discounts
- Duration (once, repeating, forever)
- Usage limits and redemption count

## Stripe Integration

The admin console connects to Stripe using your `STRIPE_SECRET_KEY` environment variable. All billing data is read directly from Stripe's API.

## Troubleshooting

### "Failed to fetch billing metrics"
- Check that `STRIPE_SECRET_KEY` is set in `.env.local`
- Verify the key has read permissions for subscriptions, invoices, and coupons
- Check Stripe dashboard status
