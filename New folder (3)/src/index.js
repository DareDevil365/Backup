/**
 * Cloudflare Worker: URX Core75 Keyboard Stock Checker
 * Target: Core75 Mechanical Keyboard (Frost White, Variant ID: 50096264904943)
 * URL: https://urx.co.in/products/core75-mechanical-keyboard?variant=50096264904943
 */

const DEFAULT_CONFIG = {
  PRODUCT_API_URL: "https://urx.co.in/products/core75-mechanical-keyboard.js",
  PRODUCT_PAGE_URL: "https://urx.co.in/products/core75-mechanical-keyboard?variant=50096264904943",
  TARGET_VARIANT_ID: 50096264904943,
  TARGET_COLOR_NAME: "Frost White",
  KV_STATE_KEY: "frost_white_stock_state",
};

/**
 * Fetch product data from URX's Shopify JSON endpoint
 */
async function fetchProductDetails(env) {
  const apiUrl = env.PRODUCT_API_URL || DEFAULT_CONFIG.PRODUCT_API_URL;
  const targetVariantId = Number(env.TARGET_VARIANT_ID || DEFAULT_CONFIG.TARGET_VARIANT_ID);

  const response = await fetch(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch product data: HTTP ${response.status} ${response.statusText}`);
  }

  const product = await response.json();
  const variants = product.variants || [];
  const targetVariant = variants.find((v) => Number(v.id) === targetVariantId);

  return {
    productId: product.id,
    productTitle: product.title,
    allVariants: variants.map((v) => ({
      id: v.id,
      title: v.title,
      available: v.available,
      price: v.price / 100,
    })),
    target: targetVariant
      ? {
          id: targetVariant.id,
          title: targetVariant.title,
          available: Boolean(targetVariant.available),
          price: targetVariant.price ? targetVariant.price / 100 : null,
          compareAtPrice: targetVariant.compare_at_price ? targetVariant.compare_at_price / 100 : null,
          sku: targetVariant.sku || "N/A",
          image:
            targetVariant.featured_image?.src ||
            (product.images && product.images[0]) ||
            "https://cdn.shopify.com/s/files/1/0752/8582/3727/files/Frost_White-1.jpg",
          pageUrl: `${env.PRODUCT_PAGE_URL || DEFAULT_CONFIG.PRODUCT_PAGE_URL}`,
        }
      : null,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Send Discord Rich Embed Notification
 */
async function sendDiscordNotification(env, stockData, isTest = false) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_URL not configured. Skipping Discord notification.");
    return { success: false, reason: "DISCORD_WEBHOOK_URL missing" };
  }

  const target = stockData.target || {
    title: "Frost White",
    price: 4799,
    available: false,
    pageUrl: DEFAULT_CONFIG.PRODUCT_PAGE_URL,
    image: "https://cdn.shopify.com/s/files/1/0752/8582/3727/files/Frost_White-1.jpg",
  };

  const isAvailable = target.available;
  const pingText = env.DISCORD_PING ? `${env.DISCORD_PING} ` : "";

  const embedColor = isTest
    ? 0x3b82f6 // Blue for test
    : isAvailable
    ? 0x10b981 // Emerald green for in stock
    : 0xef4444; // Red for out of stock

  const payload = {
    username: "URX Stock Monitor",
    avatar_url: "https://urx.co.in/cdn/shop/files/logo_1.png",
    content: isTest
      ? `🧪 **[TEST] URX Stock Checker Test Alert**`
      : isAvailable
      ? `🚨 ${pingText}**URX Core75 Keyboard (Frost White) is NOW IN STOCK!**`
      : `ℹ️ URX Stock Check: Item currently out of stock.`,
    embeds: [
      {
        title: `Core75 Mechanical Keyboard — ${target.title}`,
        url: target.pageUrl,
        color: embedColor,
        description: isTest
          ? "This is a test notification from your Cloudflare Worker. When the keyboard comes back in stock, you will receive an alert like this!"
          : isAvailable
          ? "🎉 **The Frost White model is available right now!** Click the link below to purchase before stock runs out."
          : "The requested model is currently out of stock. You will be notified the moment it becomes available.",
        fields: [
          {
            name: "Status",
            value: isAvailable ? "🟢 **IN STOCK**" : "🔴 Out of Stock",
            inline: true,
          },
          {
            name: "Price",
            value: target.price ? `₹${target.price.toLocaleString("en-IN")}` : "₹4,799",
            inline: true,
          },
          {
            name: "Model / Color",
            value: `${target.title} (ID: \`${target.id || DEFAULT_CONFIG.TARGET_VARIANT_ID}\`)`,
            inline: false,
          },
          {
            name: "Buy Link",
            value: `[Direct Product Link](${target.pageUrl})`,
            inline: false,
          },
        ],
        image: {
          url: target.image.startsWith("//") ? `https:${target.image}` : target.image,
        },
        footer: {
          text: `URX Stock Monitor • Cloudflare Worker • Check Time: ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Discord Webhook Error:", response.status, errorText);
    return { success: false, status: response.status, error: errorText };
  }

  return { success: true };
}

/**
 * Optional WhatsApp Notification (supports CallMeBot or self-hosted OpenWA)
 */
async function sendWhatsAppNotification(env, stockData, isTest = false) {
  const target = stockData.target;
  const isAvailable = target ? target.available : false;
  const buyUrl = target ? target.pageUrl : DEFAULT_CONFIG.PRODUCT_PAGE_URL;
  const price = target ? `₹${target.price}` : "₹4,799";

  const messageText = isTest
    ? `*URX Stock Monitor (Test)*\n\nYour WhatsApp alerts are configured successfully! You will get an alert here as soon as the Frost White Core75 Keyboard is in stock.`
    : `*URX Core75 Keyboard IN STOCK!*\n\nModel: Frost White\nPrice: ${price}\nStatus: IN STOCK\n\nBuy Now: ${buyUrl}`;

  // Method 1: CallMeBot Free API (Zero hosting required)
  if (env.CALLMEBOT_PHONE && env.CALLMEBOT_API_KEY) {
    const phone = encodeURIComponent(env.CALLMEBOT_PHONE);
    const text = encodeURIComponent(messageText);
    const apikey = encodeURIComponent(env.CALLMEBOT_API_KEY);
    const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${apikey}`;

    try {
      const res = await fetch(callmebotUrl);
      return { success: res.ok, method: "CallMeBot", status: res.status };
    } catch (err) {
      return { success: false, method: "CallMeBot", error: err.message };
    }
  }

  // Method 2: Self-hosted OpenWA (https://github.com/rmyndharis/OpenWA)
  if (env.OPENWA_API_URL && env.OPENWA_PHONE) {
    try {
      const endpoint = `${env.OPENWA_API_URL.replace(/\/+$/, "")}/api/v1/messages/send-text`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.OPENWA_API_KEY ? { "Authorization": `Bearer ${env.OPENWA_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          phone: env.OPENWA_PHONE,
          message: messageText,
        }),
      });
      return { success: res.ok, method: "OpenWA", status: res.status };
    } catch (err) {
      return { success: false, method: "OpenWA", error: err.message };
    }
  }

  return { skipped: true, reason: "No WhatsApp credentials configured" };
}

/**
 * Core check runner: fetches stock, checks state, and dispatches notifications
 */
async function performStockCheck(env, isManual = false) {
  const stockData = await fetchProductDetails(env);
  const target = stockData.target;

  if (!target) {
    return {
      success: false,
      error: `Target variant ${env.TARGET_VARIANT_ID || DEFAULT_CONFIG.TARGET_VARIANT_ID} not found in product data.`,
      stockData,
    };
  }

  const isAvailable = target.available;
  let shouldNotify = false;
  let previousState = null;

  // If Cloudflare KV is configured, prevent duplicate notifications while item remains in stock
  if (env.STOCK_KV) {
    previousState = await env.STOCK_KV.get(DEFAULT_CONFIG.KV_STATE_KEY);
    const wasAvailable = previousState === "in_stock";

    if (isAvailable && !wasAvailable) {
      // Just became in stock!
      shouldNotify = true;
      await env.STOCK_KV.put(DEFAULT_CONFIG.KV_STATE_KEY, "in_stock");
    } else if (!isAvailable && wasAvailable) {
      // Went out of stock
      await env.STOCK_KV.put(DEFAULT_CONFIG.KV_STATE_KEY, "out_of_stock");
    }
  } else {
    // If KV is not configured, notify whenever item is available
    if (isAvailable) {
      shouldNotify = true;
    }
  }

  let discordResult = null;
  let whatsappResult = null;

  if (shouldNotify) {
    discordResult = await sendDiscordNotification(env, stockData, false);
    whatsappResult = await sendWhatsAppNotification(env, stockData, false);
  }

  return {
    success: true,
    available: isAvailable,
    shouldNotify,
    previousState,
    discordResult,
    whatsappResult,
    target,
    allVariants: stockData.allVariants,
    checkedAt: stockData.checkedAt,
  };
}

export default {
  /**
   * Cloudflare Cron Trigger (Runs hourly)
   */
  async scheduled(controller, env, ctx) {
    console.log(`[Cron Trigger] Checking URX stock at ${new Date().toISOString()}...`);
    try {
      const result = await performStockCheck(env, false);
      console.log(`[Cron Result] In Stock: ${result.available}, Notified: ${result.shouldNotify}`);
    } catch (err) {
      console.error("[Cron Error]", err.message, err.stack);
    }
  },

  /**
   * HTTP Web Handler (Manual check, testing, and dashboard)
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route: /check -> Run check immediately and return JSON
    if (url.pathname === "/check") {
      try {
        const result = await performStockCheck(env, true);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }, null, 2),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Route: /test-discord -> Trigger a test Discord message
    if (url.pathname === "/test-discord") {
      try {
        const stockData = await fetchProductDetails(env);
        const res = await sendDiscordNotification(env, stockData, true);
        return new Response(
          JSON.stringify({ message: "Test Discord alert triggered", result: res }, null, 2),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }, null, 2),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Route: /test-whatsapp -> Trigger a test WhatsApp message
    if (url.pathname === "/test-whatsapp") {
      try {
        const stockData = await fetchProductDetails(env);
        const res = await sendWhatsAppNotification(env, stockData, true);
        return new Response(
          JSON.stringify({ message: "Test WhatsApp alert triggered", result: res }, null, 2),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }, null, 2),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Default Route: / -> Live Dashboard
    try {
      const stockData = await fetchProductDetails(env);
      const target = stockData.target;
      const hasDiscord = Boolean(env.DISCORD_WEBHOOK_URL);
      const hasWhatsApp = Boolean(
        (env.CALLMEBOT_PHONE && env.CALLMEBOT_API_KEY) ||
        (env.OPENWA_API_URL && env.OPENWA_PHONE)
      );

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>URX Core75 Stock Monitor</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --accent: #3b82f6;
      --green: #10b981;
      --red: #ef4444;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      padding: 30px 15px;
      min-height: 100vh;
    }
    .container {
      max-width: 680px;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 6px;
    }
    .header p {
      color: var(--text-muted);
      font-size: 14px;
    }
    .card {
      background: var(--card-bg);
      border-radius: 14px;
      padding: 24px;
      border: 1px solid #334155;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      margin-bottom: 20px;
    }
    .product-preview {
      display: flex;
      gap: 20px;
      align-items: center;
      margin-bottom: 20px;
    }
    .product-img {
      width: 120px;
      height: 90px;
      border-radius: 10px;
      object-fit: cover;
      background: #000;
    }
    .product-info h2 {
      font-size: 18px;
      margin-bottom: 6px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-out {
      background: rgba(239, 68, 68, 0.15);
      color: var(--red);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .badge-in {
      background: rgba(16, 185, 129, 0.15);
      color: var(--green);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .price {
      font-size: 20px;
      font-weight: 700;
      color: #38bdf8;
      margin-top: 6px;
    }
    .variants-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 14px;
    }
    .variants-table th, .variants-table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #334155;
    }
    .variants-table th {
      color: var(--text-muted);
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
    }
    .highlight-row {
      background: rgba(59, 130, 246, 0.1);
      font-weight: 600;
    }
    .buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    .btn {
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      border: none;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-primary { background: #5865F2; color: #fff; }
    .btn-secondary { background: #334155; color: #fff; }
    .btn-buy { background: var(--green); color: #fff; }
    .config-status {
      display: flex;
      gap: 15px;
      font-size: 13px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #334155;
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 5px;
    }
    .dot-green { background: var(--green); }
    .dot-red { background: var(--red); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⌨️ URX Core75 Stock Monitor</h1>
      <p>Cloudflare Worker running hourly cron checks</p>
    </div>

    <div class="card">
      <div class="product-preview">
        <img class="product-img" src="${target?.image || ''}" alt="Product">
        <div class="product-info">
          <h2>${stockData.productTitle} — ${target?.title}</h2>
          <span class="badge ${target?.available ? 'badge-in' : 'badge-out'}">
            ${target?.available ? '● In Stock' : '○ Out of Stock'}
          </span>
          <div class="price">₹${target?.price ? target.price.toLocaleString('en-IN') : '4,799'}</div>
        </div>
      </div>

      <div class="buttons">
        <a href="${target?.pageUrl}" target="_blank" class="btn btn-buy">🔗 Open URX Store</a>
        <a href="/check" class="btn btn-secondary">⚡ Run Live Check</a>
        <a href="/test-discord" class="btn btn-primary">🔔 Test Discord Alert</a>
      </div>

      <div class="config-status">
        <div>
          <span class="dot ${hasDiscord ? 'dot-green' : 'dot-red'}"></span>
          Discord Webhook: ${hasDiscord ? 'Configured' : 'Missing (Set DISCORD_WEBHOOK_URL)'}
        </div>
        <div>
          <span class="dot ${hasWhatsApp ? 'dot-green' : 'dot-red'}"></span>
          WhatsApp: ${hasWhatsApp ? 'Configured' : 'Optional'}
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="font-size: 15px; margin-bottom: 12px; color: var(--text-muted);">ALL CORE75 VARIANTS LIVE STATUS</h3>
      <table class="variants-table">
        <thead>
          <tr>
            <th>Color / Model</th>
            <th>Variant ID</th>
            <th>Price</th>
            <th>Availability</th>
          </tr>
        </thead>
        <tbody>
          ${stockData.allVariants
            .map((v) => `
              <tr class="${v.id === target?.id ? 'highlight-row' : ''}">
                <td>${v.title} ${v.id === target?.id ? '<strong>(Target)</strong>' : ''}</td>
                <td><code>${v.id}</code></td>
                <td>₹${v.price}</td>
                <td>
                  <span class="badge ${v.available ? 'badge-in' : 'badge-out'}">
                    ${v.available ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
              </tr>
            `)
            .join('')}
        </tbody>
      </table>
      <p style="font-size: 11px; color: var(--text-muted); margin-top: 15px;">
        Last checked: ${new Date(stockData.checkedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </p>
    </div>
  </div>
</body>
</html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Error: ${err.message}`, { status: 500 });
    }
  },
};
