# Setup for tenniszone.xyz

No local testing required. Supabase keys are in the app (anon key is public-safe).

## Step 1 — Supabase SQL

Run **both** files in SQL Editor (if you already ran `schema.sql`, only run `schema-v2.sql`):

1. `supabase/schema.sql` (bets tables)
2. `supabase/schema-v2.sql` (profiles, balances, win/loss graph)


## Step 2 — Privy domains (one time)

1. [dashboard.privy.io](https://dashboard.privy.io) → your app
2. **Configuration** → **Domains**
3. Add:
   - `https://tenniszone.xyz`
   - `https://www.tenniszone.xyz`

## Step 3 — Push to deploy

```powershell
cd "C:\Users\Sára\Downloads\privy game"; git add .; git commit -m "Deploy custom bets to tenniszone.xyz"; git push
```

Wait for your host to finish building, then open **https://tenniszone.xyz**

## Admin

Login with **cxmrkt@gmail.com** → **Admin** → **Bets** tab.

## Share links

`https://tenniszone.xyz/bet/{bet-id}`
