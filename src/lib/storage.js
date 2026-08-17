import { supabase } from "./supabaseClient";

const BUCKET = "eventos-midia";

/**
 * Envia um arquivo de imagem e devolve a URL pública.
 * pastas sugeridas: `clube/`, `evento/<id>/`, `patrocinador/<id>/`
 */
export async function enviarImagem(arquivo, pasta) {
  if (!arquivo) return null;
  const extensao = arquivo.name.split(".").pop();
  const caminho = `${pasta}/${Date.now()}.${extensao}`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}
