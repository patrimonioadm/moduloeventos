import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [acessos, setAcessos] = useState([]); // [{ setor_chave, papel }]

  const carregarPerfilEAcessos = useCallback(async (userId) => {
    const [{ data: perfilData }, { data: acessosData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("acessos_setor").select("setor_chave, papel").eq("user_id", userId),
    ]);
    setProfile(perfilData || null);
    setAcessos(acessosData || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (session?.user) {
        await carregarPerfilEAcessos(session.user.id);
      } else {
        setProfile(null);
        setAcessos([]);
      }
      setLoading(false);
    })();
  }, [session, carregarPerfilEAcessos]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Reautentica com a senha atual antes de trocar — evita que uma
  // sessão aberta em outro aparelho troque a senha sem confirmar
  // que quem está pedindo realmente conhece a senha atual.
  const trocarSenha = useCallback(
    async (senhaAtual, novaSenha) => {
      if (!profile?.email) throw new Error("Sessão inválida.");
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: senhaAtual,
      });
      if (authErr) throw new Error("Senha atual incorreta.");

      const { error: updateErr } = await supabase.auth.updateUser({ password: novaSenha });
      if (updateErr) throw updateErr;
    },
    [profile]
  );

  function papelNoSetor(setorChave) {
    if (profile?.is_super_admin) return "admin";
    return acessos.find((a) => a.setor_chave === setorChave)?.papel || null;
  }

  function temAcesso(setorChave) {
    return papelNoSetor(setorChave) !== null;
  }

  const value = useMemo(
    () => ({
      loading,
      session,
      profile,
      acessos,
      isSuperAdmin: !!profile?.is_super_admin,
      logout,
      trocarSenha,
      papelNoSetor,
      temAcesso,
      recarregar: () => session?.user && carregarPerfilEAcessos(session.user.id),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, session, profile, acessos]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}
