// api/speak.js — ElevenLabs TTS proxy

// Hlasy podľa typu dinosaura
const VOICES = {
  deep:   "pNInz6obpgDQGcFmaJgB", // Adam — hlboký, dramatický
  medium: "VR6AewLTigWG4xSOukaG", // Arnold — silný, starší
  light:  "XrExE9yKIg1WjnnlVkGX", // Matilda — teplý, priateľský
  chirpy: "jBpfuIE2acCO8z3wKNLl", // Gigi — ľahký, vtáčí
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ElevenLabs API kľúč chýba" });

  const { text, roar_type = "deep" } = req.body;
  if (!text) return res.status(400).json({ error: "Chýba text" });

  const voiceId = VOICES[roar_type] || VOICES.deep;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.78,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(Buffer.from(audioBuffer));

  } catch (err) {
    console.error("ElevenLabs error:", err);
    return res.status(500).json({ error: err.message });
  }
}
