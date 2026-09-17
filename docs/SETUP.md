# Truck RSA — Local / Supabase Setup

USA truck-only roadside assistance demo. Passenger vehicles are not supported.

## 1. Apply database migrations

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Paste and run, in order:
   - `supabase/migrations/001_rsa_schema.sql` — schema, enums, RLS, service categories
   - `supabase/migrations/002_seed_demo_data.sql` — fictional USA companies, vehicles, providers, cases, estimates, invoices

`002` uses fixed UUIDs that map to client demo text IDs (see comments at the top of that file). Profiles, drivers, and technicians are **not** seeded because they require `auth.users`.

## 2. Environment variables

`.env.local` should include:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_OTP=123456
```

- **Google Maps** — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is already set in `.env.local` for this demo.
- **Publishable vs anon key** — Newer Supabase projects expose a publishable key. If REST calls return **401**, open **Dashboard → Settings → API** and replace `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the legacy **`anon`** JWT (not the `service_role` key). Restart `npm run dev` after changing env.

## Registration + OTP + admin activation

1. User opens `/register` → phone → OTP from platform database (autofilled; SMS not sent).
2. Enters name/email (+ company fields), uploads documents, pins live location on map, sees nearby services.
3. Status = **PENDING** until admin activates at `/admin/approvals`.
4. Waiting screen polls every 2.5s; when activated, user enters portal.
5. Run SQL `003_registration_otp.sql` in Supabase for DB tables; local `.data/` store works without Supabase.

Fixed OTP default: `123456` (change via `NEXT_PUBLIC_PLATFORM_OTP` or `platform_otp_settings` table).

## Admin login (email / password)

Separate from user phone OTP.

1. Run `supabase/migrations/004_admin_login.sql` in Supabase SQL Editor (optional if using local store).
2. Open `/admin/login`
3. Credentials (stored hashed in DB / `.data/admin_users.json`):

| Email | Password |
|-------|----------|
| admin@gmail.com | admin@123 |

After login → Admin panel (`/admin/approvals`, dashboard, etc.).


```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a demo phone + OTP `123456`.
