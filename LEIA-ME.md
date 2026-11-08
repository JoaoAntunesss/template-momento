# Template Momento — fotógrafos, criadores de conteúdo e organizadores de eventos

Site com portefólio em 3D + pedido de orçamento + **área de cliente** (mensagens, notas para o dia, ficheiros, links, entregas por WeTransfer) + painel. Um projeto Firebase por cliente.
**Para cada cliente novo só se muda `public/marca.js` e as fotografias em `public/img/`.**

Serve para: fotógrafos de casamentos e batizados, videógrafos, organizadores de festas e eventos, wedding planners, criadores de conteúdo e gestores de redes sociais.

## Ver a demonstração (sem Firebase)
Com `firebase.apiKey` vazio em `marca.js`, tudo corre em **modo demonstração** (marca fictícia "Lume", dados guardados só no navegador):
```
cd public && python3 -m http.server 8000
```
- http://localhost:8000 — site
- http://localhost:8000/cliente.html — área de cliente (código `DEMOANAPEDRO`)
- http://localhost:8000/admin.html — painel (carrega em "Entrar")

Abre a área de cliente e o painel em duas abas: o que escreves num aparece no outro.

## Como funciona para o cliente final
1. A pessoa pede orçamento no site. Recebes um aviso no Telegram e ela recebe um email de confirmação.
2. No painel, em **Pedidos**, carregas em **Criar projeto e área de cliente**. É gerado um código (ex.: `36JMUM9EK4`).
3. Envias o link por WhatsApp ou email (botões no painel). O cliente entra só com o link, sem conta nem palavra-passe.
4. Na área dele: conversa contigo, preenche as **notas para o dia** (horários, fotos de grupo, pessoas importantes, pedidos especiais), envia ficheiros (até 3 MB; fotos são reduzidas automaticamente) e links.
5. Tu mudas a **fase** do projeto (Proposta aceite → Preparação → O grande dia → Seleção e edição → Entrega). O cliente vê a barra a avançar e a contagem de dias.
6. Quando as fotografias estão prontas: crias o WeTransfer, colas o link em **Entregas** com a data de validade. O cliente recebe um email e tem um guia passo a passo para descarregar.
7. As notas do cliente podem ser impressas para levares no dia ("Imprimir para o dia").

## Novo cliente, passo a passo
1. Copia esta pasta com o nome do cliente.
2. Edita `public/marca.js`: nome, cores, textos, serviços, portefólio, fases, tipos de evento, contactos, `site` (endereço final).
3. Põe as fotografias em `public/img/` e acerta os caminhos. Ícone quadrado de 512×512 em `img/icone.png`.
4. [Consola Firebase](https://console.firebase.google.com): novo projeto → **Realtime Database** (europe-west1) → **Authentication** (Email/Password e/ou Google) → **App Web**, e copia a config para `marca.js > firebase`.
5. Cria a conta do dono em Authentication (ou entra uma vez com Google). O painel mostra o UID se a conta não tiver acesso. Na base de dados cria `admins / <UID> = true` (booleano).
6. `node scripts/nova-marca.mjs` (gera `manifest.json`, `functions/marca.json` e `.firebaserc`).
7. `firebase deploy --only hosting,database`
8. Domínio próprio: Hosting → Adicionar domínio personalizado.

## Avisos no Telegram e emails (opcional, plano Blaze, na prática 0 €)
- Telegram: o dono cria um bot no **@BotFather**, carrega em Iniciar no bot, e vai a `https://api.telegram.org/bot<TOKEN>/getUpdates` para ver o chat id.
- Email: Gmail do dono com verificação em 2 passos → `myaccount.google.com/apppasswords` → cria uma palavra-passe de aplicação.
- Segredos (no PowerShell, um comando de cada vez): `firebase functions:secrets:set TELEGRAM_TOKEN`, `TELEGRAM_CHAT`, `MAIL_USER`, `MAIL_PASS`.
- `cd functions`, `npm install`, `cd ..`, `firebase deploy --only functions`.

| Quando | Quem recebe |
|---|---|
| Pedido de orçamento | Dono (Telegram) + cliente (email de confirmação) |
| Mensagem, ficheiro ou link do cliente | Dono (Telegram) |
| Resposta do dono | Cliente (email, só se já leu a anterior: não enche a caixa) |
| Entrega publicada | Cliente (email com o botão para a área) |

Sem os segredos, a parte correspondente é ignorada e o resto funciona.

## Segurança
- Painel protegido por Firebase Auth + lista `admins`. Nada de palavras-passe no código.
- Cada área de cliente só abre com o código (10 caracteres aleatórios, cerca de 800 biliões de combinações). Não é possível listar os projetos.
- O cliente só pode **acrescentar** mensagens, ficheiros e links (não apaga nem altera os teus) e editar as suas notas. Fases, entregas e dados do evento só o painel muda.
- Os pedidos de orçamento só podem ser criados pelo público, nunca lidos.
- Ficheiros guardados à parte (`anexos/`), para a área abrir rápido. Ficheiros grandes: por WeTransfer ou Google Drive.
- Fontes e three.js guardados no site (RGPD: não envia o IP à Google). Página de privacidade incluída.
- Para apagar tudo de um cliente: painel → Dados → Apagar projeto.
