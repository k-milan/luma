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

The production deployment runs on Vercel in Singapore (`sin1`) and stores fictional demo workspaces in the dedicated `luma` PostgreSQL database on the existing droplet. Each browser receives a separate anonymous workspace through an HTTP-only cookie; visitors cannot see one another’s records. Updates use revision checks to prevent another tab from overwriting newer data. There is no customer login or payment processing. Do not enter real customer data.

Database access uses a dedicated `luma_app` role over an encrypted SSH connection. The dedicated `luma-tunnel` SSH account has no shell and may forward only to `127.0.0.1:5432`. The PostgreSQL port remains private. The application verifies the droplet’s pinned SSH host key. Existing application databases and firewall rules are unchanged.

The following server-only variables are stored as encrypted Vercel production secrets:

- `LUMA_SSH_HOST`
- `LUMA_SSH_HOST_KEY_SHA256` — hex SHA-256 fingerprint of the server’s Ed25519 host key
- `LUMA_SSH_PRIVATE_KEY` — base64-encoded dedicated OpenSSH key
- `LUMA_DB_PASSWORD`

Local credentials are kept in the ignored `.env.local` file. Without these variables, local development and unconfigured preview deployments use browser storage. Production uses `GET /api/state` and `PUT /api/state`; API responses and cookies are not publicly cached. Database schema is documented in `database/schema.sql` (already applied to the dedicated Luma database).

GitHub: https://github.com/k-milan/luma. Vercel is linked to this repository for production deployments from `main`. Run `npm run build` before pushing changes. `.env.local`, `.vercel`, generated output, and installed dependencies are excluded from Git and deployment uploads.

This project is separate from RCC Mobile and RCC Web. It does not import or run code from those repositories.
