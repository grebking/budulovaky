# Setup for tenniszone.xyz

No local testing required. Supabase keys are in the app (anon key is public-safe).

## Step 1 — Supabase SQL (one time)

1. [supabase.com/dashboard](https://supabase.com/dashboard) → project **lxtfjhypewwnjtccjbsl**
2. **SQL Editor** → **New query**
3. Paste all of `supabase/schema.sql` → **Run**
4. **Table Editor** → confirm `bets` and `bet_entries` exist

## Step 2 — Privy domains (one time)

1. [dashboard.privy.io](https://dashboard.privy.io) → your app
2. **Configuration** → **Domains**
3. Add:
   - `https://tenniszone.xyz`
   - `https://www.tenniszone.xyz`
4. Save

## Step 3 — Push to deploy

```powershell
cd "C:\Users\Sára\Downloads\privy game"; git add .; git commit -m "Deploy custom bets to tenniszone.xyz"; git push
```

Wait for your host to finish building, then open **https://tenniszone.xyz**

## Admin

Login with **cxmrkt@gmail.com** → **Admin** → **Bets** tab.

## Share links

`https://tenniszone.xyz/bet/{bet-id}`
