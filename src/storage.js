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

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return user.id;
}

export const storage = {
  async get(key) {
    const userId = await getCurrentUserId();
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
    const userId = await getCurrentUserId();
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
    const userId = await getCurrentUserId();
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
    const userId = await getCurrentUserId();
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
};
