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
