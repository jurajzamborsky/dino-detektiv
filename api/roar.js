// api/roar.js — proxy pre dino zvuky z dinosaurfact.net
// Rieši mixed-content: Zauri je HTTPS, dinosaurfact.net je HTTP

const ALLOWED = new Set([
  'Allosaurus1.wav','Baby_triceratops1.wav','Brachiosaurus1.wav',
  'Brontosaurus11.wav','Carnotaurus11.wav','Compsognathus1.wav',
  'Compsognathus11.wav','Ceratosaurus1.mp3','Desmatosuchus1.wav',
  'Dilophosaurus1.wav','Dreadnoughtus1.mp3','Dromaeosaurus1.wav',
  'Eoraptor1.wav','Eudimorphodon1.mp3','Europasaurus1.mp3',
  'Gallimimus1.wav','Guanlong1.wav','Huayangosaurus1.mp3',
  'Megalosaurus1.mp3','Microraptor1.mp3','Nigersaurus1.wav',
  'Pachycephalosaurus1.wav','Parasaurolophus1.wav','Pisanosaurus1.mp3',
  'Pterodactylus1.mp3','Stegosaurus1.wav','Tarchia1.wav',
  'Torosaurus1.wav','Trex11.wav','Trex21.wav','Trex31.wav','Trex41.wav',
  'Velociraptor1.wav',
]);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { file } = req.query;

  if (!file || !ALLOWED.has(file)) {
    return res.status(400).json({ error: 'Nepovolený súbor.' });
  }

  try {
    const upstream = await fetch(`http://www.dinosaurfact.net/sounds/${file}`);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Zvuk sa nenašiel.' });
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = file.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    console.error('Roar proxy error:', err);
    return res.status(500).json({ error: 'Interná chyba.' });
  }
}
