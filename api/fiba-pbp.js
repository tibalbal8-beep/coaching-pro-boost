// Proxy FIBA LiveStats : récupère le play-by-play d'un match (data.json) côté serveur, car le site n'autorise pas
// les appels directs depuis un navigateur (pas d'en-tête CORS). Seul l'identifiant numérique du match est accepté.
export default async function handler(req, res) {
  const id = String(req.query.id || "").trim();
  if (!/^\d{4,10}$/.test(id)) return res.status(400).json({ error: "Identifiant de match invalide" });
  try {
    const r = await fetch(`https://fibalivestats.dcd.shared.geniussports.com/data/${id}/data.json`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return res.status(r.status === 404 ? 404 : 502).json({ error: `FIBA LiveStats a répondu ${r.status}` });
    const text = await r.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=15");
    return res.status(200).send(text);
  } catch (e) {
    return res.status(502).json({ error: "Impossible de joindre FIBA LiveStats" });
  }
}
