# Luma lending mockup

A standalone Next.js App Router demo based on the approved **Version 2** design: plum navigation, purple hero, lime accents, and mint/lavender/peach statistics. Uses React, TypeScript, Tailwind CSS, Lucide, and locally owned shadcn/ui primitives built on Radix UI and class-variance-authority, customized to this visual direction.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the local address printed by Next.js. To choose a port: `npm run dev -- --port 3100`.

```sh
npm run typecheck
npm test
npm run build
npm start
```

## Demo flows

- **Customers:** add a customer, open their detail panel, and create a loan with that customer preselected.
- **Loans:** choose principal, a free-form interest percentage (or optional saved preset), repayment frequency, and number of installments. Preview total interest, total payable, and installment amount.
- **Releases:** release an approved loan to generate its collection schedule. Releases cannot be repeated.
- **Collections:** navigate previous/next day, pick a date, return to today, inspect customer details, and record full or partial payments. Overdue installments and payment history have separate views. Export the selected day’s schedule to CSV.
- **Overview:** statistics and charts derive from the same records and respond to the selected period.
- **Settings:** add or deactivate interest-rate presets and payment types. Reset the demo before a new presentation.

## Calculation rules

Interest is one flat percentage of the original principal **for the entire term**, not per month or installment. A ₱20,000 loan at 10% has ₱2,000 interest and ₱22,000 total payable. The final installment absorbs centavo rounding. The first due date falls one interval after release. Monthly schedules clamp short months without shifting later months. Collections are allocated to a specific installment; overpayments are rejected.

Outstanding principal is estimated by allocating receipts proportionally between principal and interest. This is a demonstration convention, not a production accounting ledger.

## Data and deployment

All seed records are fictional. Added records persist only in the current browser’s local storage (`luma-lending-demo-v1`). Each visitor has an independent copy. There is no login, shared database, payment processing, or external service connection in this mockup. Do not enter real customer data.

Deploy this directory as a **Next.js** project on Vercel. Use the default install/build settings; no environment variables are required for this version. PostgreSQL integration is intentionally deferred until the mockup is approved. A future shared backend can replace browser persistence without changing the domain types and calculation helpers in `src/lib/lending.ts`.

This project is separate from RCC Mobile and RCC Web. It does not import or run code from those repositories.
