import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// Sert l'image d'un exercice partagé en octets bruts (pas en data URL) — nécessaire pour que
// les aperçus de lien (WhatsApp, iMessage, etc.) puissent l'utiliser en og:image, qui exige une
// vraie URL joignable, pas un data:image en base64.
//
// Les terrains (portrait) sont recadrés en format paysage 1200x630 (ratio standard des aperçus
// de lien) par Facebook/WhatsApp — sans intervention de notre part, ça coupe le bas du terrain
// (le panier, par ex.). On compose donc nous-mêmes l'image sur un cadre 1200x630 en mode
// "contain" (terrain entier visible, marges de chaque côté) plutôt que de laisser le réseau
// social recadrer en mode "cover" (qui coupe).
const CARD_W = 1200, CARD_H = 630, CARD_BG = "#F2EDE4";

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token || !/^[a-z0-9]+$/i.test(token)) return res.status(400).send("Token manquant");

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase.from("shared_exercises").select("exercise_data").eq("token", token).maybeSingle();
  if (!data) return res.status(404).send("Introuvable");

  const ex = data.exercise_data || {};
  const isSafeImage = (src) => typeof src === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(src);
  const source = (ex.schemas || []).find(isSafeImage) || (isSafeImage(ex.file?.data) ? ex.file.data : null);
  if (!source) return res.status(404).send("Pas d'image");

  const match = source.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) return res.status(404).send("Pas d'image");

  const buffer = Buffer.from(match[2], "base64");

  try {
    const resized = await sharp(buffer).resize(CARD_W, CARD_H, { fit: "inside" }).toBuffer();
    const meta = await sharp(resized).metadata();
    const left = Math.max(0, Math.round((CARD_W - meta.width) / 2));
    const top = Math.max(0, Math.round((CARD_H - meta.height) / 2));
    const composed = await sharp({ create: { width: CARD_W, height: CARD_H, channels: 3, background: CARD_BG } })
      .composite([{ input: resized, left, top }])
      .jpeg({ quality: 85 })
      .toBuffer();
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(composed);
  } catch (e) {
    // Repli sur l'image brute si la composition échoue (mieux qu'une erreur 500)
    res.setHeader("Content-Type", match[1]);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(buffer);
  }
}
