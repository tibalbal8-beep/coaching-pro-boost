import { createClient } from "@supabase/supabase-js";

// Sert l'image d'un exercice partagé en octets bruts (pas en data URL) — nécessaire pour que
// les aperçus de lien (WhatsApp, iMessage, etc.) puissent l'utiliser en og:image, qui exige une
// vraie URL joignable, pas un data:image en base64.
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
  res.setHeader("Content-Type", match[1]);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.status(200).send(buffer);
}
