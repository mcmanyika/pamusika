# PaySell

Commerce through conversation.

PaySell is a WhatsApp-first digital commerce platform for informal vendors and micro-businesses, starting in Zimbabwe. This repository currently contains **Phase 1**: project foundation, Supabase architecture, database schema, SSR authentication, and the protected admin shell.

WhatsApp is the customer/vendor interface. This web app is operations infrastructure.

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Supabase Postgres, Auth, Storage, and SSR
- Zod

## Local setup

1. Copy `.env.example` to `.env.local` and add your Supabase project URL plus publishable key.
2. Apply `supabase/migrations/20260919100000_init.sql` in the Supabase SQL editor.
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
npm run build
```

Meta WhatsApp, OpenAI, commerce services, and conversation flows are intentionally not implemented yet.
