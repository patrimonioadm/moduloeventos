# Portal DKP — Deutscher Klub Pernambuco

Portal (shell) que reúne os setores do clube — Eventos, Patrimônio, RH,
Financeiro e Secretaria — em um único ponto de entrada, com login único
e permissões por setor. Cada setor pode ser um app independente,
desenvolvido e implantado por equipes diferentes, e "plugado" ao portal
sem precisar reescrever nada aqui.

## Arquitetura em uma imagem

```
                         ┌─────────────────────────┐
                         │   Portal (este repo)     │
                         │  login · home · usuários │
                         └────────────┬─────────────┘
                                      │  Supabase Auth (JWT)
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
             ┌──────▼─────┐   ┌───────▼──────┐   ┌──────▼──────┐
             │  Eventos    │   │  Patrimônio   │   │  RH / Fin.  │
             │ (iframe /   │   │ (app próprio, │   │ (em breve)  │
             │  protótipo) │   │  Descartes)   │   │             │
             └─────────────┘   └──────────────┘   └─────────────┘
                                      │
                          Mesmo projeto Supabase
                       (Postgres + Auth compartilhados)
```

Um único projeto Supabase serve de "cérebro" de identidade. Cada módulo
mantém as próprias tabelas de negócio (ex.: `descartes`), mas todos leem
`profiles`, `setores` e `acessos_setor` para saber quem é o usuário e o
que ele pode fazer.

## Por que essa abordagem (e não Module Federation)

Como os módulos são construídos em paralelo, por pessoas/equipes
diferentes, forçar tudo a viver num único build (Module Federation,
monorepo com bundle único) cria acoplamento desnecessário: qualquer
mudança em um módulo arrisca quebrar o build dos outros, e você
precisaria coordenar releases. A abordagem aqui — **cada módulo é um
deploy independente, o portal só aponta para eles** — deixa cada equipe
liberar no seu próprio ritmo. O preço é abrir mão de transições
"instantâneas" entre módulos (às vezes há um reload de página), o que é
um trade-off aceitável para um portal interno.

## Como plugar um módulo novo, passo a passo

1. **Banco:** insira uma linha em `setores` (ou atualize o `status` de
   `em_breve` para `ativo` quando o módulo tiver URL real):
   ```sql
   update public.setores set status = 'ativo' where chave = 'rh';
   ```
2. **Config:** em `src/config/modulos.js`, preencha a `url` do módulo
   (ou aponte para a variável de ambiente `VITE_URL_RH` já prevista) e
   escolha o `tipo`:
   - `link-externo` — o módulo tem seu próprio deploy Vercel, com login
     próprio via Supabase. Recomendado para módulos "grandes" como
     Descartes/Patrimônio, RH, Financeiro.
   - `iframe` — bom para protótipos simples ou páginas estáticas sem
     necessidade de sessão própria (como o HTML de Eventos que hoje é
     só front-end com dado mockado).
   - `interno` — se decidirem trazer o código do módulo para dentro
     deste monorepo como um pacote React, importado direto (mais
     integrado, mas exige compartilhar o repositório).
3. **Domínio único (opcional, mas recomendado para SSO):** adicione uma
   entrada em `rewrites` no `vercel.json` apontando `/nome-do-setor/*`
   para a URL do deploy daquele módulo. Assim tudo vive sob o mesmo
   domínio (`portal.clubealemao.org.br/patrimonio`) e a sessão do
   Supabase (guardada no localStorage do domínio) é compartilhada sem
   nenhum código extra de SSO.
4. Pronto — nenhuma outra tela do portal precisa mudar.

## Segurança — decisões importantes

- **RLS (Row Level Security) no Postgres**, não só checagem no
  front-end. Mesmo que alguém abra o DevTools e chame a API do Supabase
  direto, o banco recusa qualquer linha que a pessoa não deveria ver.
  Veja `supabase/migrations/0001_init_portal.sql`.
- **Criação de usuário só via Edge Function com `service_role`**
  (`supabase/functions/create-user`). Isso segue exatamente o padrão que
  o módulo de Descartes já usa — mantivemos por ser a forma correta:
  criar usuário no client com `supabase.auth.signUp()` loga como a
  pessoa nova e derruba a sessão do admin, além de exigir policies
  perigosamente abertas. A Edge Function roda no servidor, confirma que
  quem chamou é de fato super admin, e só então cria o usuário.
- **Troca de senha pelo próprio usuário** (`src/pages/MinhaConta.jsx`):
  antes de trocar, reautentica com a senha atual
  (`signInWithPassword`), para impedir que uma sessão aberta em outro
  aparelho troque a senha sem confirmar que a pessoa realmente conhece
  a senha vigente.
- **`service_role` key nunca chega ao front-end** — só existe como
  variável de ambiente da Edge Function no painel do Supabase.
- **CSP básica** já configurada em `index.html`, restringindo de onde o
  app pode carregar script/estilo/conexão. Ajuste o domínio do seu
  projeto Supabase antes de publicar.
- **Isolamento de iframe:** módulos embutidos via `iframe` usam
  `sandbox` para não ter acesso ao DOM/JS do portal.
- **Nenhuma credencial em URL/query string.**

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

## Publicando o schema no Supabase

```bash
# Cole o conteúdo de supabase/migrations/0001_init_portal.sql
# no SQL Editor do painel do Supabase, ou:
supabase db push

# Deploy da Edge Function:
supabase functions deploy create-user
```

## Criando o primeiro administrador

Como a criação de usuário passa pela Edge Function (que exige que quem
chama já seja super admin), o **primeiro** administrador precisa ser
criado manualmente, uma única vez:

1. No painel do Supabase → Authentication → Add user, crie a conta com
   e-mail e senha.
2. No SQL Editor, rode:
   ```sql
   insert into public.profiles (id, nome, email, ativo, is_super_admin)
   values ('<uuid-do-usuario-criado>', 'Seu Nome', 'seu@email.com', true, true);
   ```
3. A partir daí, esse admin cria todos os outros pelo próprio portal,
   em **Usuários**.

## Estrutura de pastas

```
src/
  config/modulos.js       -> registro dos módulos (único lugar a editar)
  context/AuthContext.jsx -> sessão, perfil, acessos por setor
  components/             -> Shell, ProtectedRoute, Field
  pages/                  -> Login, Home, MinhaConta, AdminUsuarios, ModuloIframe
  styles/                 -> tokens.css (marca), global.css
supabase/
  migrations/             -> schema SQL versionado
  functions/create-user/  -> Edge Function de criação de usuário
```
