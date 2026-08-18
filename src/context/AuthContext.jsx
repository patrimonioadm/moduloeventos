import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);
const SETOR = "eventos";

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [papel, setPapel] = useState(null); // 'admin' | 'colaborador' | 'leitor' | null
  const usuarioCarregadoRef = useRef(null); // id do usuário cujo perfil/papel já estão carregados

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
    usuarioCarregadoRef.current = userId;
  }, []);

  useEffect(() => {
    let ativo = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      setSession(data.session);
      if (data.session?.user) await carregar(data.session.user.id);
      setLoading(false);
    })();

    // IMPORTANTE: onAuthStateChange dispara também em todo refresh de
    // token em segundo plano (ex.: ao voltar pra aba do navegador), não
    // só em login/logout. Recarregar loading=true e refazer a consulta
    // a cada disparo desses derrubaria qualquer formulário aberto no
    // meio do preenchimento. Por isso só refazemos a carga quando o
    // usuário logado de fato muda.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, novaSessao) => {
      if (!ativo) return;
      setSession(novaSessao);
      const novoUserId = novaSessao?.user?.id || null;
      if (novoUserId === usuarioCarregadoRef.current) return; // mesmo usuário: refresh silencioso
      if (!novoUserId) {
        usuarioCarregadoRef.current = null;
        setProfile(null);
        setPapel(null);
        return;
      }
      await carregar(novoUserId);
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [carregar]);

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
