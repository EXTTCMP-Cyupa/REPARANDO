const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
let activeBaseUrl = configuredBaseUrl || "http://localhost:8081/api/v1";

function alternateBaseUrl(url: string): string | null {
  if (url.includes(":8081")) return url.replace(":8081", ":8080");
  if (url.includes(":8080")) return url.replace(":8080", ":8081");
  return null;
}

async function requestWithLocalFallback(path: string, requestInit: RequestInit): Promise<Response> {
  const request = (baseUrl: string) => fetch(`${baseUrl}${path}`, requestInit);

  try {
    return await request(activeBaseUrl);
  } catch (error) {
    const fallback = alternateBaseUrl(activeBaseUrl);
    if (!fallback) {
      throw error;
    }

    const fallbackResponse = await request(fallback);
    activeBaseUrl = fallback;
    return fallbackResponse;
  }
}

export async function login(email: string, password: string) {
  const response = await requestWithLocalFallback("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Credenciales inválidas.");
    }
    throw new Error("No se pudo conectar al backend de autenticación.");
  }

  return response.json() as Promise<{ accessToken: string; role: string; userId?: string }>;
}

function authHeaders(token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function getWorkerAccount(workerId: string, token?: string) {
  const response = await requestWithLocalFallback(`/finance/workers/${workerId}/account`, {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible obtener la cuenta del trabajador");
  return response.json() as Promise<{ id: string; balance: number; blocked: boolean }>;
}

export async function getWorkerWorkOrders(workerId: string, token?: string) {
  const response = await requestWithLocalFallback(`/workflow/worker/${workerId}`, {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible obtener órdenes de trabajo");
  return response.json() as Promise<Array<{
    id: string;
    clientId: string;
    workerId: string;
    status: string;
    description?: string | null;
    category?: string | null;
    quotationLaborCost?: number | null;
    quotationMaterialsCost?: number | null;
    clientApprovalDate?: string | null;
    completedAt?: string | null;
    workNotes?: Array<{
      description: string;
      additionalCost: number;
      evidencePhotos: string;
      createdAt: string;
      clientApproved: boolean | null;
    }>;
  }>>;
}

export async function createWorkOrder(
  input: { clientId: string; workerId: string; description: string; category: string },
  token?: string
) {
  const response = await requestWithLocalFallback("/workflow", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("No fue posible crear orden de trabajo");
  return response.json() as Promise<any>;
}

export async function getClientWorkOrders(clientId: string, token?: string) {
  const response = await requestWithLocalFallback(`/workflow/client/${clientId}`, {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible obtener órdenes del cliente");
  return response.json() as Promise<
    Array<{
      id: string;
      clientId: string;
      workerId: string;
      status: string;
      title?: string | null;
      description?: string | null;
      category?: string | null;
      quotationLaborCost?: number | null;
      quotationMaterialsCost?: number | null;
      clientApprovalDate?: string | null;
      completedAt?: string | null;
      workNotes?: Array<{
        description: string;
        additionalCost: number;
        evidencePhotos: string;
        createdAt: string;
        clientApproved: boolean | null;
      }>;
    }>
  >;
}

export async function moveWorkOrderStatus(workOrderId: string, newStatus: string, token?: string) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/status`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ newStatus })
  });
  if (!response.ok) throw new Error("No fue posible avanzar el estado de la orden");
  return response.json() as Promise<{ id: string; clientId: string; workerId: string; status: string }>;
}

export async function listWorkOrderMaterials(workOrderId: string, token?: string) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/materials`, {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible obtener materiales de la orden");
  return response.json() as Promise<
    Array<{ id: string; workOrderId: string; workerId: string; name: string; quantity: number; unitCost: number; createdAt: string }>
  >;
}

export async function addWorkOrderMaterial(
  workOrderId: string,
  input: { workerId: string; name: string; quantity: number; unitCost: number },
  token?: string
) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/materials`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("No fue posible registrar material");
  return response.json() as Promise<{
    id: string;
    workOrderId: string;
    workerId: string;
    name: string;
    quantity: number;
    unitCost: number;
    createdAt: string;
  }>;
}

type MarketplaceSearchParams = {
  category?: string;
  minRating?: number;
  nearLat?: number;
  nearLng?: number;
  maxKm?: number;
};

export async function searchMarketplaceProfessionals(params: MarketplaceSearchParams, token?: string) {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.minRating !== undefined) query.set("minRating", String(params.minRating));
  if (params.nearLat !== undefined) query.set("nearLat", String(params.nearLat));
  if (params.nearLng !== undefined) query.set("nearLng", String(params.nearLng));
  if (params.maxKm !== undefined) query.set("maxKm", String(params.maxKm));

  const response = await requestWithLocalFallback(`/marketplace/professionals${query.toString() ? `?${query}` : ""}`, {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible consultar profesionales");
  return response.json() as Promise<
    Array<{
      workerId: string;
      fullName: string;
      category: string;
      rating: number;
      latitude: number;
      longitude: number;
      portfolioImages: string[];
    }>
  >;
}

export async function contactMarketplaceProfessional(
  input: { clientId: string; workerId: string; description: string; category: string },
  token?: string
) {
  const response = await requestWithLocalFallback("/marketplace/contact", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    let message = "No fue posible contactar al profesional";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // ignore parse failures and keep default message
    }
    throw new Error(message);
  }

  return response.json() as Promise<{ id: string; clientId: string; workerId: string; status: string }>;
}

export async function publishServiceNeed(
  input: { clientId: string; title: string; description: string; category: string },
  token?: string
) {
  const response = await requestWithLocalFallback("/bidding/needs", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("No fue posible publicar la necesidad");
  return response.json() as Promise<{
    id: string;
    clientId: string;
    title: string;
    description: string;
    category: string;
    createdAt: string;
    status: "OPEN" | "ASSIGNED";
    selectedBidId?: string | null;
    selectedWorkerId?: string | null;
    assignedWorkOrderId?: string | null;
    assignedAt?: string | null;
  }>;
}

export async function listServiceNeeds(clientId?: string, token?: string) {
  const query = clientId ? `?clientId=${clientId}` : "";
  const response = await requestWithLocalFallback(`/bidding/needs${query}`, {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible listar necesidades");
  return response.json() as Promise<
    Array<{
      id: string;
      clientId: string;
      title: string;
      description: string;
      category: string;
      createdAt: string;
      status: "OPEN" | "ASSIGNED";
      selectedBidId?: string | null;
      selectedWorkerId?: string | null;
      assignedWorkOrderId?: string | null;
      assignedAt?: string | null;
    }>
  >;
}

export async function submitBidProposal(
  input: { needId: string; workerId: string; laborCost: number; summary: string },
  token?: string
) {
  const response = await requestWithLocalFallback("/bidding/bids", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("No fue posible enviar la propuesta");
  return response.json() as Promise<{
    id: string;
    needId: string;
    workerId: string;
    laborCost: number;
    summary: string;
    createdAt: string;
  }>;
}

export async function listNeedBids(needId: string, token?: string) {
  const response = await requestWithLocalFallback(`/bidding/needs/${needId}/bids`, {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible listar propuestas");
  return response.json() as Promise<
    Array<{
      id: string;
      needId: string;
      workerId: string;
      laborCost: number;
      summary: string;
      createdAt: string;
    }>
  >;
}

export async function selectNeedBid(needId: string, bidId: string, clientId: string, token?: string) {
  const response = await requestWithLocalFallback(`/bidding/needs/${needId}/select`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ bidId, clientId })
  });
  if (!response.ok) throw new Error("No fue posible seleccionar la propuesta");
  return response.json() as Promise<{
    id: string;
    needId: string;
    workerId: string;
    laborCost: number;
    summary: string;
    createdAt: string;
  }>;
}

export async function getPendingDeposits(token?: string) {
  const response = await requestWithLocalFallback("/finance/deposit/pending", {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible obtener depósitos pendientes");
  return response.json() as Promise<
    Array<{
      id: string;
      workerId: string;
      amount: number;
      paymentMethod: "DEPOSITO" | "TRANSFERENCIA";
      imagePath: string;
      status: string;
      reviewedBy: string | null;
    }>
  >;
}

export async function getBusinessPolicy(token?: string) {
  const response = await requestWithLocalFallback("/admin/settings/business-policy", {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible obtener configuración de negocio");
  return response.json() as Promise<{ leadCost: number; trustCreditLimit: number }>;
}

export async function updateBusinessPolicy(leadCost: number, trustCreditLimit: number, token?: string) {
  const response = await requestWithLocalFallback("/admin/settings/business-policy", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ leadCost, trustCreditLimit })
  });

  if (!response.ok) {
    throw new Error("No fue posible actualizar la configuración de negocio");
  }

  return response.json() as Promise<{ leadCost: number; trustCreditLimit: number }>;
}

export async function approveDeposit(depositId: string, adminId: string, token?: string) {
  const response = await requestWithLocalFallback(`/finance/deposit/${depositId}/approve`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ adminId })
  });

  if (!response.ok) {
    throw new Error("No fue posible aprobar el depósito");
  }

  return response.json() as Promise<{
    id: string;
    workerId: string;
    amount: number;
    imagePath: string;
    status: "APPROVED" | "PENDING" | "REJECTED";
    reviewedBy: string | null;
  }>;
}

export async function rejectDeposit(depositId: string, adminId: string, token?: string) {
  const response = await requestWithLocalFallback(`/finance/deposit/${depositId}/reject`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ adminId })
  });

  if (!response.ok) {
    throw new Error("No fue posible rechazar el depósito");
  }

  return response.json() as Promise<{
    id: string;
    workerId: string;
    amount: number;
    imagePath: string;
    status: "APPROVED" | "PENDING" | "REJECTED";
    reviewedBy: string | null;
  }>;
}

export async function uploadDepositReceiptImage(file: File, token?: string): Promise<{ imagePath: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await requestWithLocalFallback("/finance/deposit/upload", {
    method: "POST",
    headers,
    body: formData
  });

  if (!response.ok) {
    throw new Error("No fue posible subir el comprobante de depósito");
  }

  return response.json() as Promise<{ imagePath: string }>;
}

export async function submitDepositReceipt(
  input: { workerId: string; amount: number; paymentMethod: "DEPOSITO" | "TRANSFERENCIA"; imagePath: string },
  token?: string
) {
  const response = await requestWithLocalFallback("/finance/deposit", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("No fue posible registrar el depósito");
  }

  return response.json() as Promise<{
    id: string;
    workerId: string;
    amount: number;
    paymentMethod: "DEPOSITO" | "TRANSFERENCIA";
    imagePath: string;
    status: "APPROVED" | "PENDING" | "REJECTED";
    reviewedBy: string | null;
  }>;
}

export async function getWorkerDeposits(workerId: string, token?: string) {
  const response = await requestWithLocalFallback(`/finance/workers/${workerId}/deposits`, {
    headers: authHeaders(token)
  });

  if (!response.ok) {
    throw new Error("No fue posible cargar historial de depósitos");
  }

  return response.json() as Promise<
    Array<{
      id: string;
      workerId: string;
      amount: number;
      paymentMethod: "DEPOSITO" | "TRANSFERENCIA";
      imagePath: string;
      status: "APPROVED" | "PENDING" | "REJECTED";
      createdAt: string;
      reviewedBy: string | null;
    }>
  >;
}

// ========== IMAGE UPLOAD ==========
export async function uploadImage(file: File, token?: string): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await requestWithLocalFallback("/images/upload", {
    method: "POST",
    headers: { Authorization: token ? `Bearer ${token}` : "" },
    body: formData
  });

  if (!response.ok) throw new Error("No fue posible subir la imagen");
  return response.json() as Promise<{ url: string }>;
}

// ========== DIAGNOSTIC WORKFLOW ==========
export async function submitDiagnostic(
  workOrderId: string,
  input: { summary: string; photoUrls: string[] },
  token?: string
) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/diagnostic`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("No fue posible enviar diagnóstico");
  return response.json() as Promise<any>;
}

export async function getDiagnostic(workOrderId: string, token?: string) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/diagnostic`, {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible obtener diagnóstico");
  return response.json() as Promise<any>;
}

// ========== QUOTATION WORKFLOW ==========
export async function submitQuotation(
  workOrderId: string,
  input: { workerId: string; laborCost: number; materialsCost: number; items: any[] },
  token?: string
) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/quotation`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("No fue posible enviar cotización");
  return response.json() as Promise<any>;
}

export async function getQuotation(workOrderId: string, token?: string) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/quotation`, {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("No fue posible obtener cotización");
  return response.json() as Promise<any>;
}

export async function approveQuotation(workOrderId: string, clientId: string, token?: string) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/quotation/approve`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ clientId })
  });
  if (!response.ok) throw new Error("No fue posible aprobar cotización");
  return response.json() as Promise<any>;
}

// ========== WORK NOTES WORKFLOW ==========
export async function addWorkNote(
  workOrderId: string,
  input: { description: string; additionalCost: number; evidencePhotos?: string },
  token?: string
) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/work-notes`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("No fue posible agregar nota de trabajo");
  return response.json() as Promise<any>;
}

export async function approveWorkNote(
  workOrderId: string,
  noteIndex: number,
  clientId: string,
  token?: string
) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/work-notes/${noteIndex}/approve`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ clientId })
  });
  if (!response.ok) throw new Error("No fue posible aprobar nota de trabajo");
  return response.json() as Promise<any>;
}

export async function rejectWorkNote(
  workOrderId: string,
  noteIndex: number,
  clientId: string,
  token?: string
) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/work-notes/${noteIndex}/reject`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ clientId })
  });
  if (!response.ok) throw new Error("No fue posible rechazar nota de trabajo");
  return response.json() as Promise<any>;
}

// ========== COMPLETION & RATING WORKFLOW ==========
export async function completeWork(
  workOrderId: string,
  input: { completionPhotos: string[] },
  token?: string
) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/complete`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("No fue posible completar trabajo");
  return response.json() as Promise<any>;
}

export async function submitRating(
  workOrderId: string,
  input: { rating: number; review?: string },
  token?: string
) {
  const response = await requestWithLocalFallback(`/workflow/${workOrderId}/rating`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("No fue posible enviar calificación");
  return response.json() as Promise<any>;
}
