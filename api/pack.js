import { createClient } from "@supabase/supabase-js";

// Pack « 30 exercices + 15 plays » : le serveur ne donne les liens du contenu qu'aux comptes qui ont acheté le pack (ou aux admins).
// Un admin peut aussi enregistrer ici les deux liens de partage qui composent le pack.
const tokenOf = (link, param) => {
  const s = String(link || "").trim();
  const m = new RegExp("[?&]" + param + "=([A-Za-z0-9_-]+)").exec(s);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{16,}$/.test(s) ? s : null;
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  try {
    const auth = String(req.headers.authorization || "");
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!jwt) return res.status(401).json({ error: "Connexion requise." });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: u, error: uErr } = await supabase.auth.getUser(jwt);
    if (uErr || !u?.user) return res.status(401).json({ error: "Session invalide." });

    const { data: prof } = await supabase.from("profiles").select("is_admin, has_pack").eq("id", u.user.id).maybeSingle();
    const isAdmin = !!prof?.is_admin, hasPack = !!prof?.has_pack;

    if (req.method === "POST") {
      if (!isAdmin) return res.status(403).json({ error: "Réservé à l'administrateur." });
      const { exercisesLink, playsLink, title } = req.body || {};
      const ex = tokenOf(exercisesLink, "sharecollection"), pl = tokenOf(playsLink, "scoutingtoken");
      if (!ex && !pl) return res.status(400).json({ error: "Aucun lien reconnu : colle le lien du lot d'exercices (…?sharecollection=…) et/ou celui du lot de plays (…?scoutingtoken=…)." });
      const { data: cur } = await supabase.from("pack_config").select("*").eq("id", 1).maybeSingle();
      const row = { id: 1, title: title || cur?.title || "Pack 30 exercices + 15 plays", exercises_token: ex || cur?.exercises_token || null, plays_token: pl || cur?.plays_token || null, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("pack_config").upsert(row);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, hasExercises: !!row.exercises_token, hasPlays: !!row.plays_token });
    }

    // GET : état du pack et, si autorisé, jetons des contenus
    const { data: cfg } = await supabase.from("pack_config").select("*").eq("id", 1).maybeSingle();
    const configured = { exercises: !!cfg?.exercises_token, plays: !!cfg?.plays_token };
    if (!isAdmin && !hasPack) return res.status(200).json({ allowed: false, configured });
    return res.status(200).json({ allowed: true, isAdmin, configured, title: cfg?.title || "Pack 30 exercices + 15 plays", exercisesToken: cfg?.exercises_token || null, playsToken: cfg?.plays_token || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
