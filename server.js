import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { FieldControlClient } from "./fieldControlClient.js";

const PORT = process.env.PORT || 3000;
const DEFAULT_API_KEY = process.env.FIELD_CONTROL_API_KEY;

function getApiKeyFromRequest(req) {
  return DEFAULT_API_KEY;
}

function buildServer(apiKey) {
  const client = new FieldControlClient(apiKey);
  const server = new McpServer({
    name: "fieldcontrol-mcp",
    version: "1.0.0",
  });

  const asText = (data) => ({
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  });
  const asError = (err) => ({
    content: [
      {
        type: "text",
        text: `Erro ao chamar a API do Field Control: ${err.message}`,
      },
    ],
    isError: true,
  });

  server.tool(
    "listar_clientes",
    "Lista clientes cadastrados no Field Control, com filtro opcional por nome/CPF-CNPJ.",
    {
      name: z.string().optional().describe("Filtrar por nome do cliente"),
      documentNumber: z.string().optional().describe("Filtrar por CPF/CNPJ (somente números)"),
      archived: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return asText(await client.listCustomers(args));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "obter_cliente",
    "Recupera um cliente do Field Control pelo id.",
    { id: z.string() },
    async ({ id }) => {
      try {
        return asText(await client.getCustomer(id));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "criar_cliente",
    "Cria um novo cliente no Field Control.",
    {
      name: z.string(),
      documentNumber: z.string().optional().describe("CPF/CNPJ somente números"),
      code: z.string().optional(),
      notes: z.string().optional(),
      address: z
        .object({
          zipCode: z.string().optional(),
          street: z.string().optional(),
          number: z.string().optional(),
          neighborhood: z.string().optional(),
          complement: z.string().optional(),
          city: z.string(),
          state: z.string(),
          coords: z.object({ latitude: z.number(), longitude: z.number() }),
        })
        .describe("Endereço do cliente (cidade, estado e coordenadas são obrigatórios)"),
    },
    async (args) => {
      try {
        return asText(await client.createCustomer(args));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "listar_colaboradores",
    "Lista os colaboradores (técnicos de campo) cadastrados no Field Control.",
    {
      name: z.string().optional(),
      email: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return asText(await client.listEmployees(args));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "rastreamento_colaboradores",
    "Retorna a última geolocalização conhecida de cada colaborador em campo.",
    {},
    async () => {
      try {
        return asText(await client.getEmployeesTracking());
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "listar_servicos",
    "Lista os tipos de serviço/atividade (ex: instalação, manutenção) cadastrados.",
    {
      name: z.string().optional(),
      archived: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return asText(await client.listServices(args));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "listar_solicitacoes",
    "Lista solicitações de serviço (tickets/chamados) recebidas.",
    {
      name: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return asText(await client.listTickets(args));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "criar_solicitacao",
    "Cria uma nova solicitação de serviço (ticket).",
    {
      name: z.string().describe("Nome de quem solicita"),
      subject: z.string().describe("Assunto"),
      message: z.string().describe("Mensagem/descrição do pedido"),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      customerId: z.string().optional(),
    },
    async ({ name, subject, message, contactEmail, contactPhone, customerId }) => {
      try {
        const payload = {
          name,
          subject,
          message,
          contact: { email: contactEmail, phone: contactPhone },
          ...(customerId ? { customer: { id: customerId } } : {}),
        };
        return asText(await client.createTicket(payload));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "listar_ordens_de_servico",
    "Lista ordens de serviço (OS), com filtro opcional por identificador.",
    {
      identifier: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      sort: z.string().optional().describe('Ex: "created_at" ou "-created_at"'),
    },
    async (args) => {
      try {
        return asText(await client.listOrders(args));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "obter_ordem_de_servico",
    "Recupera uma ordem de serviço pelo id, incluindo detalhes completos.",
    { id: z.string() },
    async ({ id }) => {
      try {
        return asText(await client.getOrder(id));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "listar_atividades_da_os",
    "Lista as atividades (visitas agendadas) de uma ordem de serviço.",
    { orderId: z.string() },
    async ({ orderId }) => {
      try {
        return asText(await client.listOrderTasks(orderId));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "listar_comentarios_da_os",
    "Lista os comentários registrados em uma ordem de serviço.",
    { orderId: z.string() },
    async ({ orderId }) => {
      try {
        return asText(await client.listOrderComments(orderId));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "listar_materiais_da_os",
    "Lista os materiais utilizados em uma ordem de serviço.",
    { orderId: z.string() },
    async ({ orderId }) => {
      try {
        return asText(await client.listOrderMaterials(orderId));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "listar_formularios_da_os",
    "Lista os formulários respondidos em uma ordem de serviço.",
    { orderId: z.string() },
    async ({ orderId }) => {
      try {
        return asText(await client.listOrderForms(orderId));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "listar_atividades",
    "Lista atividades (visitas) por data de criação.",
    {
      createdAt: z.string().optional().describe("Formato AAAA-MM-DD"),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return asText(await client.listTasks(args));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "listar_equipamentos",
    "Lista equipamentos cadastrados, com filtro opcional por número de série ou cliente.",
    {
      number: z.string().optional(),
      customerId: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return asText(await client.listEquipments(args));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    "chamada_generica",
    "Faz uma chamada genérica a qualquer endpoint documentado da API do Field Control " +
      "(use apenas se nenhuma outra ferramenta cobrir o que você precisa). " +
      "Consulte https://developers.fieldcontrol.com.br/ para endpoints e payloads.",
    {
      method: z.enum(["GET", "POST", "PUT", "DELETE"]),
      path: z.string().describe('Ex: "/products-services" ou "/orders/ID/comments"'),
      query: z.record(z.string()).optional(),
      body: z.record(z.any()).optional(),
    },
    async ({ method, path, query, body }) => {
      try {
        return asText(await client.raw({ method, path, query, body }));
      } catch (e) {
        return asError(e);
      }
    }
  );

  return server;
}

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  console.log(
    `[req] ${new Date().toISOString()} ${req.method} ${req.path} session=${req.header(
      "mcp-session-id"
    )}`
  );
  next();
});

const transports = {};

async function handleMcpRequest(req, res) {
  try {
    const sessionId = req.header("mcp-session-id");
    let transport = sessionId && transports[sessionId];

    if (!transport) {
      const apiKey = getApiKeyFromRequest(req);
      const server = buildServer(apiKey);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports[newSessionId] = transport;
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };
      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("Erro no /mcp:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  }
}

app.post("/mcp", handleMcpRequest);
app.get("/mcp", handleMcpRequest);
app.delete("/mcp", handleMcpRequest);

app.get("/", (_req, res) => {
  res.send("Field Control MCP server está no ar. Endpoint MCP: POST /mcp");
});

app.listen(PORT, () => {
  console.log(`Field Control MCP server ouvindo na porta ${PORT}`);
});
