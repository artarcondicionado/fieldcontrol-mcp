# Field Control MCP Server

Servidor MCP (Model Context Protocol) remoto que conecta o **Claude** à
**API de Integração do Field Control** (https://developers.fieldcontrol.com.br/),
permitindo consultar e criar clientes, ordens de serviço, colaboradores,
solicitações de serviço, equipamentos etc. diretamente numa conversa com o Claude.

## O que ele expõe

Ferramentas (tools) disponíveis para o Claude:

| Ferramenta | O que faz |
|---|---|
| `listar_clientes` / `obter_cliente` / `criar_cliente` | Clientes |
| `listar_colaboradores` / `rastreamento_colaboradores` | Técnicos de campo e geolocalização |
| `listar_servicos` | Tipos de atividade (instalação, manutenção...) |
| `listar_solicitacoes` / `criar_solicitacao` | Tickets / chamados |
| `listar_ordens_de_servico` / `obter_ordem_de_servico` | Ordens de serviço (OS) |
| `listar_atividades_da_os` / `listar_comentarios_da_os` / `listar_materiais_da_os` / `listar_formularios_da_os` | Detalhes de uma OS |
| `listar_atividades` | Atividades/visitas agendadas |
| `listar_equipamentos` | Equipamentos com manutenção |
| `chamada_generica` | Fallback para qualquer endpoint documentado que não tenha uma tool dedicada |

## 1. Obtenha sua chave de API do Field Control

1. Acesse o painel do Field Control como administrador.
2. Vá em **Configurações > Configuração para desenvolvedores**
   (ou diretamente: `https://app.fieldcontrol.com.br/#/configuracoes/configuracao-para-desenvolvedores`).
3. Em "Chave de integração", clique para criar uma nova chave, dê um nome e clique em **Criar**.
4. Guarde essa chave — você vai usá-la como variável de ambiente `FIELD_CONTROL_API_KEY`.

## 2. Rode localmente (opcional, para testar)

```bash
npm install
FIELD_CONTROL_API_KEY="sua-chave-aqui" npm start
```

O servidor sobe em `http://localhost:3000`, com o endpoint MCP em `POST /mcp`.

## 3. Coloque o servidor na internet (necessário para o Claude acessá-lo)

O Claude se conecta a partir da nuvem da Anthropic, então o servidor precisa
estar acessível publicamente por HTTPS. Qualquer provedor que rode Node.js
funciona. Duas opções simples e com camada gratuita:

### Opção A: Render.com
1. Suba este projeto para um repositório no GitHub.
2. Em Render, crie um **Web Service** apontando para o repositório.
3. Build command: `npm install` — Start command: `npm start`.
4. Em "Environment", adicione a variável `FIELD_CONTROL_API_KEY` com sua chave.
5. Depois do deploy, você terá uma URL tipo `https://seu-app.onrender.com`.
   O endpoint MCP será `https://seu-app.onrender.com/mcp`.

### Opção B: Railway.app
1. Suba o projeto para o GitHub.
2. Em Railway, "New Project" > "Deploy from GitHub repo".
3. Adicione a variável de ambiente `FIELD_CONTROL_API_KEY`.
4. Railway detecta o `npm start` automaticamente e expõe uma URL pública.

(Qualquer outro host de Node.js — Fly.io, Vercel com functions, um VPS próprio
com Nginx, etc. — funciona da mesma forma, desde que exponha `/mcp` via HTTPS.)

## 4. Conecte ao Claude como conector personalizado

1. No Claude, vá em **Configurações > Conectores**.
2. Clique em **+** e depois em **Adicionar conector personalizado**.
3. Cole a URL do seu servidor terminando em `/mcp`
   (ex: `https://seu-app.onrender.com/mcp`).
4. Dê um nome (ex: "Field Control") e clique em **Adicionar**.

Pronto — nas próximas conversas, o Claude poderá listar suas ordens de
serviço, clientes, colaboradores etc. sempre que isso ajudar a responder o
que você pedir.

> Em planos Team/Enterprise, um Proprietário precisa habilitar o conector
> primeiro em Configurações da Organização > Conectores > Adicionar >
> Personalizado > Web; depois cada membro conecta a própria conta.

## Segurança

- A chave de API fica **apenas no servidor** (variável de ambiente), nunca é
  exposta ao Claude ou ao navegador.
- Por padrão, todos que usarem este servidor compartilham a mesma chave de
  API (a do ambiente). Se você quiser oferecer este conector para várias
  pessoas com chaves diferentes, adapte `getApiKeyFromRequest()` em
  `src/server.js` para ler a chave de um header por requisição, e faça cada
  pessoa configurar isso nas "Configurações avançadas" do conector.
- Nunca commite sua chave de API no repositório — use sempre variáveis de
  ambiente do provedor de hospedagem.
