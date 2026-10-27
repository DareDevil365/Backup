# ⌨️ URX Core75 Keyboard Stock Monitor (Cloudflare Worker)

An automated Cloudflare Worker that checks stock for the **URX Core75 Mechanical Keyboard (Frost White)** every hour and instantly sends notifications via **Discord** (with rich embeds, product image, price, and direct purchase link) and optional **WhatsApp**.

---

## 🎯 Target Product Details

- **Product:** Core75 Mechanical Keyboard
- **Target Variant:** `Frost White`
- **Variant ID:** `50096264904943`
- **Product URL:** [https://urx.co.in/products/core75-mechanical-keyboard?variant=50096264904943](https://urx.co.in/products/core75-mechanical-keyboard?variant=50096264904943)
- **Check Frequency:** Every hour (`0 * * * *` cron trigger)

---

## 🚀 Quick Start & Deployment

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Discord Webhook
1. In Discord, go to your server: **Channel Settings** ⚙️ → **Integrations** → **Webhooks** → **New Webhook**.
2. Click **Copy Webhook URL**.

#### For Local Testing:
Create a `.dev.vars` file in the project root:
```env
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
DISCORD_PING="@everyone"
```

#### For Production (Cloudflare):
Run:
```bash
npx wrangler secret put DISCORD_WEBHOOK_URL
```
When prompted, paste your Discord Webhook URL.

### 3. Test Locally
Run the local dev server:
```bash
npm run dev
```
Open `http://localhost:8787` in your browser:
- View live stock status of all keyboard variants.
- Click **"Test Discord Alert"** or visit `http://localhost:8787/test-discord` to test your Discord notification.
- Click **"Run Live Check"** or visit `http://localhost:8787/check` to simulate a manual check.

### 4. Deploy to Cloudflare Workers
```bash
npm run deploy
```
Once deployed, Cloudflare Workers will automatically run the stock check **every hour at minute 0**!

---

## 🔔 Optional: Anti-Spam KV Storage

By default, the worker will send an alert when the item is in stock. To ensure you only get notified once when the item changes from *out of stock* to *in stock* (avoiding repeated alerts every hour while it stays available):

1. Create a Cloudflare KV namespace:
   ```bash
   npx wrangler kv namespace create STOCK_KV
   ```
2. Copy the namespace ID from the output and add it to `wrangler.jsonc`:
   ```jsonc
   "kv_namespaces": [
     {
       "binding": "STOCK_KV",
       "id": "your-kv-namespace-id"
     }
   ]
   ```
3. Re-deploy with `npm run deploy`.

---

## 📱 WhatsApp Integration: OpenWA vs Free Alternatives

### 1. Can you get a free WhatsApp API from `rmyndharis/OpenWA`?
**Yes**, [OpenWA](https://github.com/rmyndharis/OpenWA) is 100% free and open-source (MIT License). It is a self-hosted WhatsApp Gateway built with NestJS, `@whiskeysockets/baileys`, and `whatsapp-web.js`.

**Key Points:**
- **Requires a 24/7 server:** OpenWA **cannot** run directly inside a Cloudflare Worker because WhatsApp Web requires persistent WebSockets, Node.js `>=22`, and SQLite/PostgreSQL.
- **How to host OpenWA for free:** You can run it on a free VPS (e.g. Oracle Cloud Always Free VM, Fly.io, or your home PC/Raspberry Pi via Docker):
  ```bash
  docker run -d -p 3000:3000 rmyndharis/openwa
  ```
  Then scan the QR code from the OpenWA web dashboard using WhatsApp.
- **Connecting to this Worker:** Once OpenWA is running, add its URL to your Cloudflare secrets:
  ```bash
  npx wrangler secret put OPENWA_API_URL # e.g. https://your-openwa.domain.com
  npx wrangler secret put OPENWA_PHONE   # e.g. 919876543210
  ```

---

### 2. Easier Free Alternative (Zero Server Required): **CallMeBot**

If you don't want to run a 24/7 server for OpenWA, **CallMeBot** is completely free and requires zero hosting:

1. Add `+34 911 06 14 37` to your WhatsApp contacts as **CallMeBot**.
2. Send this exact message to CallMeBot on WhatsApp:
   ```text
   I allow callmebot to send me messages
   ```
3. CallMeBot will reply with your personal **API key**.
4. Set the secrets in your Cloudflare Worker:
   ```bash
   npx wrangler secret put CALLMEBOT_PHONE   # your number in international format, e.g. +919876543210
   npx wrangler secret put CALLMEBOT_API_KEY # your CallMeBot API key
   ```
5. Test it by opening `/test-whatsapp` on your worker URL!

---

## 🛠️ Endpoints Reference

| Route | Method | Description |
|---|---|---|
| `/` | `GET` | Web dashboard showing live stock status of all URX Core75 variants |
| `/check` | `GET` | Triggers a live check immediately and returns JSON results |
| `/test-discord` | `GET` | Sends a test notification to your Discord webhook |
| `/test-whatsapp` | `GET` | Sends a test message to your configured WhatsApp |
