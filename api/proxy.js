// api/proxy.js — Vercel Serverless Function
// Skryje API kľúč a pridá rate limiting

const RATE_LIMIT = 30;        // max requestov za hodinu na IP
const RATE_WINDOW = 60 * 60 * 1000; // 1 hodina v ms

// In-memory rate limiting (resetuje sa pri cold start, ale stačí na základnú ochranu)
// Pre produkciu: nahradiť Vercel KV alebo Upstash Redis
const rateLimitMap = new Map();

function getRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return { ok: true, remaining: RATE_LIMIT - 1 };
  }
  if (entry.count >= RATE_LIMIT) {
    const resetIn = Math.ceil((RATE_WINDOW - (now - entry.start)) / 60000);
    return { ok: false, resetIn };
  }
  entry.count++;
  return { ok: true, remaining: RATE_LIMIT - entry.count };
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const rate = getRateLimit(ip);
  if (!rate.ok) {
    return res.status(429).json({
      error: `Príliš veľa požiadaviek. Skús znova o ${rate.resetIn} minút.`
    });
  }

  // API kľúč len na serveri
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API kľúč nie je nakonfigurovaný." });
  }

  try {
    const { messages, max_tokens = 1000 } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Chyba API" });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Interná chyba servera." });
  }
}
