# PaySell

Commerce through conversation.

PaySell is a WhatsApp-first digital commerce platform for informal vendors and micro-businesses, starting in Zimbabwe. This repository currently contains **Phase 3**: WhatsApp Cloud API adapter, signed webhooks, inbound/outbound message logs, and deduplication. Full conversation menus arrive in Phase 4.

WhatsApp is the customer/vendor interface. This web app is operations infrastructure.

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Supabase Postgres, Auth, Storage, and SSR
- Zod

## Local setup

1. Copy `.env.example` to `.env.local` and add your Supabase project URL plus publishable key.
2. Apply these SQL files in the Supabase SQL editor, in order:
   - `supabase/migrations/20260919100000_init.sql`
   - `supabase/migrations/20260919120000_order_completion.sql`
3. Create a staff user in Supabase Auth.
4. Promote that user:

```sql
UPDATE public.profiles
SET role = 'SUPER_ADMIN'
WHERE email = 'you@example.com';
```

5. Run the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin routes live under `/admin` and require a signed-in staff profile.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Meta WhatsApp callback URL:

`https://<your-public-host>/api/whatsapp/webhook`

Use the same path for GET verification and POST events. Localhost is not accepted by Meta; expose HTTPS with a tunnel. Set `META_WEBHOOK_VERIFY_TOKEN` and `META_APP_SECRET` before saving the callback in the Meta app. OpenAI and full conversation menus are not implemented yet.
