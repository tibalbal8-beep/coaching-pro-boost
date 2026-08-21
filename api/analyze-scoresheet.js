// Analyse une photo de feuille de match (officielle, manuscrite) via l'API Anthropic (vision),
// côté serveur — jamais côté client, pour ne pas exposer la clé API dans le navigateur.
// Utilisé en Mode match : le coach prend la feuille en photo à chaque quart-temps, on extrait
// les stats lisibles (par joueur : points, fautes ; score par quart-temps si visible).
// Nécessite la variable d'environnement ANTHROPIC_API_KEY sur Vercel (Project Settings → Environment
// Variables) — sans elle, cette route répond 500 et l'analyse ne peut pas fonctionner.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY manquante côté serveur (Vercel → Settings → Environment Variables)." });
  }

  try {
    const { image } = req.body || {};
    if (!image || typeof image !== "string" || !image.startsWith("data:image")) {
      return res.status(400).json({ error: "Image manquante ou invalide." });
    }
    const base64 = image.split(",")[1];
    const mediaType = image.slice(5, image.indexOf(";")) || "image/jpeg";

    const prompt = `Cette image est une photo d'une feuille de match officielle de basket (manuscrite), à un moment donné du match (souvent à la fin d'un quart-temps). Lis les informations lisibles et réponds UNIQUEMENT avec un JSON valide, sans markdown, sans texte autour, au format exact :
{
  "quartTemps": number ou null (le quart-temps en cours si identifiable, 1 à 4, ou 5+ pour prolongation),
  "scoreEquipe": number ou null (score total de notre équipe à cet instant, si lisible),
  "scoreAdverse": number ou null (score total de l'équipe adverse à cet instant, si lisible),
  "scoreParQuartTemps": [{"quart": number, "nous": number ou null, "adverse": number ou null}] (uniquement les quarts-temps dont le score partiel est lisible sur la feuille, tableau vide si rien de lisible),
  "joueurs": [{"numero": string, "points": number ou null, "fautes": number ou null}] (un objet par joueur dont le numéro de maillot est identifiable ; laisse points/fautes à null si illisible pour ce joueur plutôt que de deviner),
  "incertitudes": string courte note listant ce qui est illisible/incertain sur la photo (vide si tout est clair)
}
Ne devine JAMAIS un chiffre que tu ne peux pas lire distinctement — mets null plutôt qu'une valeur inventée. Les feuilles de match sont manuscrites et parfois raturées : privilégie la prudence.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok || data.error) {
      console.error("Erreur API Anthropic:", anthropicRes.status, data.error || data);
      return res.status(502).json({ error: "Erreur de l'analyse IA. Réessaie avec une photo plus nette/lumineuse." });
    }

    const text = (data.content || []).find(b => b.type === "text")?.text || "{}";
    let clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) clean = clean.slice(start, end + 1);

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return res.status(502).json({ error: "Réponse de l'IA illisible, réessaie." });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    console.error("analyze-scoresheet error:", e);
    return res.status(500).json({ error: "Erreur serveur : " + e.message });
  }
}
