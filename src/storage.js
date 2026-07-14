import { createClient } from "@supabase/supabase-js";

// Lu AVANT createClient car Supabase efface l'URL de façon asynchrone
export const isPasswordRecoveryUrl =
  new URLSearchParams(window.location.search).get("type") === "recovery";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Variables d'environnement Supabase manquantes. Vérifie ton fichier .env (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Cache synchrone de l'utilisateur courant, tenu à jour via onAuthStateChange.
// Toute opération de storage doit capturer l'userId de façon SYNCHRONE, avant
// tout `await` : un appel async à supabase.auth.getUser() résolu après un
// changement de compte (déconnexion/reconnexion rapide) renverrait le NOUVEL
// utilisateur alors que l'appel a été déclenché pour l'ANCIEN, ce qui écrase
// les données du nouveau compte avec celles de l'ancien.
let cachedUserId = null;
let cachedUserIdReady = supabase.auth.getSession().then(({ data: { session } }) => {
  cachedUserId = session?.user?.id || null;
});
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id || null;
});

function getCurrentUserIdSync() {
  if (!cachedUserId) throw new Error("Non authentifié");
  return cachedUserId;
}

async function ensureUserIdReady() {
  await cachedUserIdReady;
  return getCurrentUserIdSync();
}

export const storage = {
  async get(key) {
    const userId = cachedUserId !== null ? getCurrentUserIdSync() : await ensureUserIdReady();
    const { data, error } = await supabase
      .from("kv_store")
      .select("key, value")
      .eq("user_id", userId)
      .eq("key", key)
      .maybeSingle();
    if (error) {
      console.error("storage.get error:", error);
      throw error;
    }
    return data ? { key: data.key, value: data.value } : null;
  },

  async set(key, value) {
    const userId = cachedUserId !== null ? getCurrentUserIdSync() : await ensureUserIdReady();
    const { error } = await supabase
      .from("kv_store")
      .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() });
    if (error) {
      console.error("storage.set error:", error);
      return null;
    }
    return { key, value };
  },

  async delete(key) {
    const userId = cachedUserId !== null ? getCurrentUserIdSync() : await ensureUserIdReady();
    const { error } = await supabase
      .from("kv_store")
      .delete()
      .eq("user_id", userId)
      .eq("key", key);
    if (error) {
      console.error("storage.delete error:", error);
      return null;
    }
    return { key, deleted: true };
  },

  async list(prefix = "") {
    const userId = cachedUserId !== null ? getCurrentUserIdSync() : await ensureUserIdReady();
    const query = supabase
      .from("kv_store")
      .select("key")
      .eq("user_id", userId);
    const { data, error } = prefix ? await query.like("key", `${prefix}%`) : await query;
    if (error) {
      console.error("storage.list error:", error);
      throw error;
    }
    return { keys: (data || []).map((row) => row.key), prefix };
  },

  // Historique de versions (best-effort, ne bloque jamais l'écriture principale).
  // Conserve un snapshot horodaté à chaque sauvegarde, purgé après 3 jours.
  async snapshot(key, value) {
    const userId = cachedUserId !== null ? getCurrentUserIdSync() : await ensureUserIdReady();
    try {
      await supabase.from("kv_store_history").insert({ user_id: userId, key, value });
      const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("kv_store_history").delete().eq("user_id", userId).eq("key", key).lt("created_at", cutoff);
    } catch (e) {
      console.error("storage.snapshot error:", e);
    }
  },

  // Renvoie le snapshot le plus récent antérieur (ou égal) à `beforeDate` pour chaque clé.
  async getHistorySnapshot(key, beforeDate) {
    const userId = cachedUserId !== null ? getCurrentUserIdSync() : await ensureUserIdReady();
    const { data, error } = await supabase
      .from("kv_store_history")
      .select("value, created_at")
      .eq("user_id", userId)
      .eq("key", key)
      .lte("created_at", beforeDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("storage.getHistorySnapshot error:", error);
      return null;
    }
    return data;
  },
};
