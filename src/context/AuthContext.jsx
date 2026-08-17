import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);
const SETOR = "eventos";

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [papel, setPapel] = useState(null); // 'admin' | 'colaborador' | 'leitor' | null

  const carregar = useCallback(async (userId) => {
    const [{ data: perfilData }, { data: acessoData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("acessos_setor")
        .select("papel")
        .eq("user_id", userId)
        .eq("setor_chave", SETOR)
        .maybeSingle(),
    ]);
    setProfile(perfilData || null);
    setPapel(perfilData?.is_super_admin ? "admin" : acessoData?.papel || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (session?.user) await carregar(session.user.id);
      else {
        setProfile(null);
        setPapel(null);
      }
      setLoading(false);
    })();
  }, [session, carregar]);

  const logout = useCallback(() => supabase.auth.signOut(), []);

  const value = useMemo(
    () => ({
      loading,
      session,
      profile,
      papel, // null = sem acesso ao setor
      podeEditar: papel === "admin" || papel === "colaborador",
      podeAdministrar: papel === "admin", // criar/excluir evento
      logout,
    }),
    [loading, session, profile, papel]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}
