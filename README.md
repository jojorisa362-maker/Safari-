# Safari Rescue

Roadside assistance, rescue mobility and car hire for Uganda — one responsive web app for **phones and desktop**.

* **Drivers (customers):** SOS, roadside help, live tracking, chat, rescue mobility, car hire, trusted partners, bookings, trip history, vehicles, emergency contacts.
* **Rescuers (providers):** receive job requests, accept / arrive / complete, earnings.
* **Partners:** a desktop dashboard — requests & quotes, inventory, reviews, earnings.
* **Admin console (`/admin`):** approve rescuers and watch live requests / SOS.

Node.js only. **No build step**, and the server has **zero dependencies** (the only package is `pg`, used when you connect Postgres).

---

## 1. Run it locally

```bash
npm install
npm start          # http://localhost:3000
```

On Android with Termux: `pkg install nodejs git`, then the same two commands.
Open the site and tap **Try the demo** → *Customer*, *Rescuer* or *Partner*.

Run the API tests: `npm test`

## 2. Get the code onto GitHub (from a phone)

Render, Railway and Heroku all deploy from a Git repository. In Termux:

```bash
unzip safari-rescue.zip && cd safari-rescue
git init && git add . && git commit -m "Safari Rescue"
git branch -M main
git remote add origin https://github.com/YOUR-USER/safari-rescue.git
git push -u origin main        # use a GitHub personal access token as the password
```

## 3. Deploy

The server reads the `PORT` the platform gives it, listens on `0.0.0.0`, and answers health checks at `/api/health`.
**Pick a database first (section 4)** — free hosts erase local files on every restart.

### Render — recommended (free plan)

1. Render dashboard → **New → Blueprint** → choose your repo → **Apply**. (It reads `render.yaml`.)
   *Or:* **New → Web Service** → Build `npm install --omit=dev` · Start `npm start` · Health check path `/api/health` · Instance type **Free**.
2. **Environment** tab → add `DATABASE_URL` (section 4).
3. Open your `*.onrender.com` URL. Your `/admin` password is the generated `ADMIN_TOKEN` value (Environment tab).

Good to know (at the time of writing): free web services go to sleep after ~15 minutes without traffic and take about a minute to wake up, and their disk is temporary.

### Railway

1. **New Project → Deploy from GitHub repo.** Railway builds the included `Dockerfile` and injects `PORT`.
2. **Variables:** `SESSION_SECRET`, `ADMIN_TOKEN`, `NODE_ENV=production`, `DEMO_MODE=1`.
3. For storage either add a **PostgreSQL** service and set `DATABASE_URL` to its reference variable, or attach a **Volume** mounted at `/data`.
4. **Settings → Networking → Generate Domain.** (`railway.json` sets the health check; Railway is moving config to a new format, so set *Healthcheck Path* = `/api/health` in Settings if it is ignored.)

Railway gives a small trial credit and then needs a paid plan — check what they ask for when you sign up.

### Heroku

Heroku has **no free plan**: the cheapest dyno (Eco) and Postgres add-on need a payment method.

```bash
heroku create safari-rescue
heroku addons:create heroku-postgresql:essential-0      # sets DATABASE_URL for you
heroku config:set NODE_ENV=production SESSION_SECRET=$(openssl rand -hex 32) ADMIN_TOKEN=$(openssl rand -hex 16) DEMO_MODE=1
git push heroku main
```

The `Procfile` (`web: node server.js`) and `app.json` are included.

### Your own VPS

**Option A – Docker**

```bash
cp .env.example .env            # edit SESSION_SECRET, ADMIN_TOKEN …
docker compose up -d --build                      # JSON-file storage in a Docker volume
# or with a local Postgres container:
docker compose --profile postgres up -d --build   # also set DATABASE_URL + PGSSL=disable in .env
```

**Option B – systemd + nginx + free HTTPS (Ubuntu 22.04 / 24.04)**

Point your domain's A record at the server, copy the project there, then:

```bash
sudo bash deploy/setup-vps.sh safarirescue.example.com you@email.com
```

It installs Node, copies the app to `/opt/safari-rescue`, creates `/etc/safari-rescue.env`, starts the `safari-rescue` service, configures nginx and gets a Let's Encrypt certificate. Logs: `journalctl -u safari-rescue -f`.
Prefer PM2? `pm2 start ecosystem.config.cjs`. Keep **one** instance.

## 4. Database — keep your data

| Where you host | What to do |
| --- | --- |
| **VPS** | Nothing. Data is a JSON file in `data/` (back it up). Or use Postgres. |
| **Render / Heroku / Railway** | Set **`DATABASE_URL`** to any Postgres connection string. |

Free Postgres options include **Neon** and **Supabase** (check their current sign-up requirements), Render's own Postgres, Heroku Postgres and Railway Postgres. Paste the connection string into `DATABASE_URL` — tables are created automatically and SSL is handled for you (`PGSSL=disable` for a local Postgres without SSL).

Without `DATABASE_URL` the app stores a JSON file and prints a warning in production.

## 5. Environment variables

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `3000` | Set by Render / Heroku / Railway. |
| `NODE_ENV` | – | Use `production` when deployed. |
| `SESSION_SECRET` | generated | Signs login cookies. **Set it** so logins survive restarts. |
| `DATABASE_URL` | – | Postgres URL. Empty = JSON file in `DATA_DIR`. |
| `DEMO_MODE` | `1` | Demo buttons + a virtual rescuer that accepts requests. **Set `0` for real use.** |
| `PROVIDER_APPROVAL` | `auto` (demo on) / `manual` | `manual` = new rescuers must be approved in `/admin` before they see jobs. |
| `ADMIN_TOKEN` | – | Password for `/admin`. Empty = admin console off. |
| `NOTIFY_WEBHOOK_URL` | – | Receives JSON for every SOS / request / booking (section 7). |
| `NOTIFY_WEBHOOK_SECRET` | – | Adds an `X-Signature: sha256=<hmac>` header so you can verify the sender. |
| `SUPPORT_PHONE`, `EMERGENCY_NUMBERS` | see `.env.example` | Shown in the app. |
| `COOKIE_SECURE`, `TRUST_PROXY`, `HOST`, `DATA_DIR`, `PGSSL`, `DEMO_SEARCH_MS`, `DEMO_TRIP_MS` | see `lib/config.js` | Advanced. |

## 6. Before real customers use it

1. `DEMO_MODE=0` (hides the demo accounts, stops the virtual rescuer, turns on rescuer approval).
2. `SESSION_SECRET` and `ADMIN_TOKEN` set to long random values; `DATABASE_URL` set.
3. Sign up a rescuer, then approve them at `/admin`. Keep `/admin` open while testing an SOS — it shows live requests with the customer's phone and a map link.
4. Set `NOTIFY_WEBHOOK_URL` so your team is alerted the moment an SOS arrives.
5. Replace the sample partners in `lib/seed.js`, the sample prices in `lib/catalog.js`, and `SUPPORT_PHONE`.
6. Confirm the emergency numbers shown on the SOS screen are correct for your region.

## 7. Alerts webhook (e.g. a WhatsApp bot)

With `NOTIFY_WEBHOOK_URL` set, the server POSTs JSON for `sos.created`, `request.created`, `request.accepted`, `request.completed`, `request.cancelled`, `booking.created` and `support.message`:

```json
{
  "event": "sos.created",
  "at": "2026-10-03T09:12:44.000Z",
  "data": {
    "code": "SR-4821", "kind": "sos", "title": "Medical Emergency",
    "location": "Kampala, Uganda", "lat": 0.3476, "lng": 32.5825,
    "customer": { "name": "David Otim", "phone": "256775123456" },
    "vehicle": { "make": "Toyota Land Cruiser", "plate": "UBQ 123A" },
    "contacts": [{ "name": "Mum", "phone": "256701000111" }]
  }
}
```

Point it at a small endpoint on your own WhatsApp bot to message your dispatch group and the customer's emergency contacts.

## 8. How it works

```
server.js            starts the HTTP server (graceful shutdown on SIGTERM)
lib/app.js           request pipeline: security headers, rate limits, API, static files
lib/api.js           REST API (auth, requests/SOS, bookings, provider jobs, portal, admin)
lib/store.js         JSON-file or Postgres document store
lib/seed.js          partner directory + per-visitor demo accounts (deleted after 24 h)
lib/catalog.js       services, prices, cars, cities
public/              the web app (ES modules, no build) + /admin
test/smoke.js        end-to-end API tests (npm test)
```

* Sessions: signed HTTP-only cookie (`SameSite=Lax`, `Secure` on HTTPS). Passwords use scrypt.
* A request is `searching → accepted → arrived → completed`. Customers poll for updates every few seconds.
* A rescuer only sees the customer's phone and GPS **after** accepting. Only approved rescuers can accept jobs when `PROVIDER_APPROVAL=manual`.
* In demo mode a virtual rescuer (Brian Okello) accepts after a few seconds and "drives" to the customer; state is derived from timestamps, so it survives restarts.

## 9. What is real, what is next

**Works now:** accounts and roles, SOS and roadside requests end-to-end between customer and rescuer, chat, ratings, bookings with server-side pricing, partner directory, partner inventory and quotes, rescuer approval, ops console, Postgres or file storage, PWA install (“Add to Home screen”).

**Not built yet (ideas for next steps):**

* **Real maps and live GPS.** The map is a drawn illustration; tracking progress is estimated from ETA. Add Google Maps / Leaflet + OpenStreetMap and stream the rescuer's location.
* **Payments.** Customers choose MTN Mobile Money / Airtel Money / cash, but money is not processed in-app.
* **SMS or WhatsApp delivery.** Use the webhook (section 7) or an SMS gateway such as Africa's Talking.
* **Partner onboarding.** The directory is seeded sample data; partner portal requests come from the demo seed.
* **Scale.** Rate limits and the JSON store live in one process, and list queries read whole collections — fine for hundreds of users; move to proper tables and a queue beyond that.

Treat the sample prices, partner names and phone numbers as placeholders.
