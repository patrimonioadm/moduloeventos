import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falha alto e cedo: melhor quebrar no dev do que silenciosamente
  // tentar falar com "undefined/undefined" em produção.
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. Confira o .env.local."
  );
}

// A anon key é pública por design (protegida pelas policies de RLS no
// banco) — pode ir para o bundle do client sem problema. O que NUNCA
// pode chegar aqui é a service_role key.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
