# Gazeta da Várzea

Portal de notícias do futebol de várzea com **loja dos times** (venda com comissão) e **painel administrativo**.

- **Site:** notícias, página de cada time, placar dos jogos, tabela, loja com sacola (pedido finalizado pelo WhatsApp) e formulário "Cadastre seu time".
- **Painel (`/admin`):** cadastrar e editar times, produtos, preços, fotos, notícias, jogos e tabela; aprovar pedidos de novos times; registrar vendas e acompanhar comissões e repasses.
- **Tecnologia:** PHP 8 puro + arquivo JSON (sem banco de dados). Roda em Docker na Railway.

---

## 1. Subir o código para o GitHub

1. Crie uma conta em <https://github.com> (se ainda não tiver).
2. Clique em **New repository** → nome `gazeta-da-varzea` → marque **Private** → **Create repository**.
3. No seu computador, dentro da pasta do projeto, rode:

```bash
git init            # (pule se a pasta já tiver .git)
git add .
git commit -m "Primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/gazeta-da-varzea.git
git push -u origin main
```

> Sem prática com terminal? Use o **GitHub Desktop** (<https://desktop.github.com>): *File → Add local repository* → escolha a pasta → *Publish repository*.

O `.gitignore` já impede que dados do site, fotos enviadas e senhas vão para o GitHub.

## 2. Publicar na Railway

1. Entre em <https://railway.com> com sua conta do GitHub.
2. **New Project → Deploy from GitHub repo** → escolha `gazeta-da-varzea`.
   A Railway encontra o `Dockerfile` sozinha e começa o build.
3. **Crie o Volume (obrigatório, senão você perde os dados a cada deploy):**
   no canvas do projeto, clique com o botão direito (ou `Ctrl/⌘ + K`) → **Volume** → conecte ao serviço com **Mount path** `/data`.
4. **Variáveis:** no serviço, aba **Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `ADMIN_USUARIO` | `admin` (ou o que preferir) |
   | `ADMIN_SENHA` | uma senha forte, **mínimo 8 caracteres** |
   | `UPLOAD_MAX_MB` | `4` (opcional) |

5. **Endereço público:** aba **Settings → Networking → Generate Domain**.
   Para usar um domínio próprio (ex.: `gazetadavarzea.com.br`), clique em **Custom Domain** e siga as instruções de DNS.
6. Acesse `https://SEU-ENDERECO/admin`, entre com o usuário e a senha, e vá em **Configurações** para trocar o WhatsApp da loja, o Instagram e o e-mail.

Na primeira execução o site é criado com **dados de exemplo**. Edite ou exclua tudo pelo painel.

## 3. Como atualizar o site depois

Toda alteração no **código** é feita assim:

```bash
git add .
git commit -m "descreva a mudança"
git push
```

A Railway faz o deploy automaticamente a cada `push` na branch `main`.
O **conteúdo** (notícias, times, produtos, fotos) fica no Volume e **não é apagado** nos deploys.

Para testar uma mudança antes de publicar, crie uma branch (`git checkout -b teste`), faça os commits e só depois junte na `main`.

## 4. Usando o painel

| Tarefa | Onde |
|---|---|
| Novo time pedindo cadastro | **Pedidos de cadastro** → *Aprovar e criar time* (o time já é criado com as cores informadas) |
| Adicionar time manualmente | **Times → + Novo time** |
| Trocar escudo / cores / modelo da camisa | **Times → Editar** (a prévia mostra como fica) |
| Novo produto, mudar preço, trocar foto | **Produtos → Editar** (preço antigo aparece riscado como promoção) |
| Tirar produto do ar sem apagar | Desmarque *Produto à venda no site* |
| Publicar notícia | **Notícias → + Nova notícia** (marque *Destaque* para a manchete principal) |
| Placar dos jogos | **Jogos** → edite os gols e marque *Encerrado* |
| Atualizar classificação | **Jogos → Recalcular tabela pelos resultados**, ou edite em **Tabela** |
| Pedido chegou no WhatsApp | **Vendas → Registrar venda** → marque *Pago* e, depois, *Repassado* |
| Comissão diferente para um time | **Times → Editar → Comissão deste time (%)** |

**Fotos:** JPG, PNG ou WEBP de até 4 MB. O sistema reduz para no máximo 1600 px e otimiza sozinho.
Sem foto, o site desenha camisas, escudos e capas automaticamente nas cores do time.

**Backup:** cada alteração guarda uma cópia automática (as últimas 15). Use também **Baixar backup** no menu do painel de vez em quando.

## 5. Rodar no seu computador (opcional)

Precisa do PHP 8.1 ou mais novo.

```bash
ADMIN_SENHA=minhasenha123 php -S localhost:8000 router.php
```

Abra <http://localhost:8000> (site) e <http://localhost:8000/admin> (painel). Os dados locais ficam na pasta `storage/`.

## Estrutura

```
index.html            site público
assets/               estilos, scripts e desenhos (camisas/escudos)
api/publico.php       dados do site + formulário de cadastro de times
admin/                painel (index.php, admin.js, admin.css, api.php)
inc/bootstrap.php     núcleo: configuração, leitura/gravação, segurança
inc/dados.exemplo.json conteúdo inicial
Dockerfile, docker/   servidor (Apache + PHP) usado pela Railway
railway.json          configuração de build e healthcheck
router.php            servidor local de testes
```

## Observação sobre clubes profissionais

Os nomes, as cores e as camisas dos clubes grandes são exemplos para a vitrine.
Escudos oficiais e produtos licenciados de clubes profissionais exigem autorização do clube ou do fabricante.
Os times de várzea que cadastram os próprios produtos não têm essa restrição.
