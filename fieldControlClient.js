const BASE_URL = "https://carchost.fieldcontrol.com.br";

/**
 * Cliente mínimo para a API de integração do Field Control.
 * Docs: https://developers.fieldcontrol.com.br/
 */
export class FieldControlClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("FIELD_CONTROL_API_KEY não configurada");
    }
    this.apiKey = apiKey;
  }

  async request(method, path, { query, body } = {}) {
    const url = new URL(BASE_URL + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const res = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "X-Api-Key": this.apiKey,
        "User-Agent": "fieldcontrol-mcp-connector/1.0",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const err = new Error(
        `Field Control API error ${res.status}: ${JSON.stringify(data)}`
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // Helpers de listagem com filtro (?q=chave:"valor") e paginação
  buildFilterQuery(filters = {}) {
    const parts = Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}:"${v}"`);
    return parts.length ? parts.join(" ") : undefined;
  }

  // ---- Clientes ----
  listCustomers({ name, documentNumber, archived, limit, offset, sort } = {}) {
    return this.request("GET", "/customers", {
      query: {
        q: this.buildFilterQuery({
          name,
          document_number: documentNumber,
          archived,
        }),
        limit,
        offset,
        sort,
      },
    });
  }
  getCustomer(id) {
    return this.request("GET", `/customers/${encodeURIComponent(id)}`);
  }
  createCustomer(payload) {
    return this.request("POST", "/customers", { body: payload });
  }

  // ---- Colaboradores (técnicos) ----
  listEmployees({ name, email, limit, offset } = {}) {
    return this.request("GET", "/employees", {
      query: { q: this.buildFilterQuery({ name, email }), limit, offset },
    });
  }
  getEmployee(id) {
    return this.request("GET", `/employees/${encodeURIComponent(id)}`);
  }
  getEmployeesTracking() {
    return this.request("GET", "/employees/tracking");
  }

  // ---- Tipos de atividade / serviços de OS ----
  listServices({ name, archived, limit, offset } = {}) {
    return this.request("GET", "/services", {
      query: { q: this.buildFilterQuery({ name, archived }), limit, offset },
    });
  }

  // ---- Solicitações de serviço (tickets) ----
  listTickets({ name, limit, offset } = {}) {
    return this.request("GET", "/tickets", {
      query: { q: this.buildFilterQuery({ name }), limit, offset },
    });
  }
  createTicket(payload) {
    return this.request("POST", "/tickets", { body: payload });
  }

  // ---- Ordens de serviço ----
  listOrders({ identifier, limit, offset, sort } = {}) {
    return this.request("GET", "/orders", {
      query: { q: this.buildFilterQuery({ identifier }), limit, offset, sort },
    });
  }
  getOrder(id) {
    return this.request("GET", `/orders/${encodeURIComponent(id)}`);
  }
  createOrder(payload) {
    return this.request("POST", "/orders", { body: payload });
  }
  listOrderTasks(orderId) {
    return this.request(
      "GET",
      `/orders/${encodeURIComponent(orderId)}/tasks`
    );
  }
  listOrderComments(orderId) {
    return this.request(
      "GET",
      `/orders/${encodeURIComponent(orderId)}/comments`
    );
  }
  listOrderMaterials(orderId) {
    return this.request(
      "GET",
      `/orders/${encodeURIComponent(orderId)}/materials`
    );
  }
  listOrderForms(orderId) {
    return this.request(
      "GET",
      `/orders/${encodeURIComponent(orderId)}/forms`
    );
  }
  listOrderAttachments(orderId) {
    return this.request(
      "GET",
      `/orders/${encodeURIComponent(orderId)}/attachments`
    );
  }

  // ---- Atividades (tasks/visitas) ----
  listTasks({ createdAt, limit, offset } = {}) {
    return this.request("GET", "/tasks", {
      query: { q: this.buildFilterQuery({ created_at: createdAt }), limit, offset },
    });
  }
  getTask(id) {
    return this.request("GET", `/tasks/${encodeURIComponent(id)}`);
  }

  // ---- Equipamentos ----
  listEquipments({ number, customerId, limit, offset } = {}) {
    return this.request("GET", "/equipments", {
      query: {
        q: this.buildFilterQuery({ number, customer_id: customerId }),
        limit,
        offset,
      },
    });
  }

  // ---- Genérico (fallback para qualquer endpoint documentado) ----
  raw({ method, path, query, body }) {
    return this.request(method, path, { query, body });
  }
}
