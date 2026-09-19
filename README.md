# PaySell

Commerce through conversation.

PaySell is a WhatsApp-first digital commerce platform for informal vendors and micro-businesses, starting in Zimbabwe. Vendors list stock in chat. Customers search and place collection orders. Staff use this web app to operate the marketplace.

This repository is at **Phase 8**: the pilot MVP is wired end to end, with live admin data, structured OpenAI intent, and hardening for a first WhatsApp launch.

## Architecture

WhatsApp is a messaging adapter, not the application.

```
WhatsApp
  → Meta WhatsApp Cloud API
  → /api/whatsapp/webhook
  → Conversation engine
  → Intent router (menus, then optional OpenAI)
  → Commerce services
  → Supabase Postgres
```

- **WhatsApp** is the buyer and vendor interface.
- **PaySell** is the commerce infrastructure.
- **Supabase** is the system of record.
- **OpenAI** interprets natural language. It never writes orders, inventory, or payments.
- **Application code** owns totals, stock, status changes, and IDs.

Commerce services do not import WhatsApp. The webhook adapter calls the conversation engine; the engine calls services.

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Supabase Postgres, Auth, Storage, and SSR
- Zod
- Official OpenAI Node SDK (Responses API, structured outputs)
- Meta WhatsApp Cloud API

## Local setup

1. Copy `.env.example` to `.env.local`. Never commit real secrets.
2. Create a Supabase project.
3. Apply SQL in the Supabase SQL editor, in order:
   - `supabase/migrations/20260919100000_init.sql`
   - `supabase/migrations/20260919120000_order_completion.sql`
4. Optional development data: `supabase/seed.sql`
5. Create a staff user in Supabase Auth.
6. Promote that user:

```sql
UPDATE public.profiles
SET role = 'SUPER_ADMIN'
WHERE email = 'you@example.com';
```

7. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin routes live under `/admin`.

## Environment variables

| Name | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public site URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server Supabase client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and cookie session client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only webhook and privileged jobs |
| `OPENAI_API_KEY` | Server-only intent interpretation |
| `OPENAI_MODEL` | Model id, default `gpt-4.1-mini` |
| `META_GRAPH_API_VERSION` | Graph API version, default `v25.0` |
| `META_WHATSAPP_ACCESS_TOKEN` | Sending WhatsApp messages |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Graph send path |
| `META_WHATSAPP_BUSINESS_ACCOUNT_ID` | Account reference |
| `META_WEBHOOK_VERIFY_TOKEN` | GET webhook verification |
| `META_APP_SECRET` | `X-Hub-Signature-256` check |

The service-role key, OpenAI key, and Meta tokens must stay on the server. Integrations fail closed when their config is missing.

## Meta WhatsApp

Callback URL (GET verification and POST events):

`https://<your-public-host>/api/whatsapp/webhook`

Localhost is not accepted by Meta. Expose HTTPS with a tunnel. Set `META_WEBHOOK_VERIFY_TOKEN` and `META_APP_SECRET` before saving the callback.

The webhook:

1. Verifies the Meta signature over the raw body
2. Rejects oversized payloads and rate-limits by IP
3. Deduplicates on `external_message_id`
4. Runs the conversation engine
5. Sends replies through the WhatsApp adapter

## OpenAI

Natural-language messages on the main, vendor, customer, and search-query menus are interpreted with `responses.parse` and Zod. Listings and orders still require YES before a write. Low confidence, invalid output, or a missing key fall back to numbered menus.

Tests mock OpenAI. `OPENAI_API_KEY` is not required for `npm test`.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Testing

Business tests use in-memory stores. Meta and OpenAI are mocked. Covered paths include vendor registration, product draft/publish, order totals and transitions, inventory protection, duplicate webhooks, invalid AI output, unsupported inbound types, support tickets, and unauthorized admin access.

## Deployment checklist

- [ ] Apply both SQL migrations, then optional `seed.sql` only on non-production
- [ ] Set every required env var on the host
- [ ] Confirm `/api/health` reports the integrations you expect
- [ ] Register the HTTPS webhook and complete Meta GET verification
- [ ] Send a test WhatsApp text and confirm a menu reply
- [ ] Sign in as staff and open `/admin`
- [ ] Confirm service-role, OpenAI, and Meta secrets are not available to the browser

## Security notes

- Admin routes require a signed-in staff profile. Authorization is checked in server code and RLS.
- Analysts can sign in but cannot see WhatsApp numbers or moderate commerce.
- Products are paused or marked `REMOVED`; they are not hard-deleted.
- Webhook signatures are timing-safe. Duplicate inbound message ids do not create duplicate orders.
- OpenAI cannot change inventory, order status, or totals.
- Logs redact tokens, passwords, and phone-related fields. User-facing errors do not include stack traces.
- Login and the WhatsApp webhook are rate-limited per IP in process memory. This is a pilot control, not a global cluster limiter.
- Image uploads, when enabled, must use `lib/storage/validate.ts` (JPEG/PNG/WebP, 5 MB cap, generated file names).

## Product flow

A new WhatsApp number receives the main menu. Selling registers a vendor and lists products. Buying searches active stock, places a collection order, and notifies the vendor to accept, mark ready, and complete. Help option 2 opens a support ticket for the admin console.
