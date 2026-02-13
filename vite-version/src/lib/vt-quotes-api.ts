const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface VtQuote {
  id: number;
  quoteNumber: string;
  subject: string;
  organizationId: number | null;
  contactId: number | null;
  assignedToId: number | null;
  stage: string;
  validUntil: string | null;
  billStreet: string | null;
  billPoBox: string | null;
  billCity: string | null;
  billState: string | null;
  billCode: string | null;
  billCountry: string | null;
  shipStreet: string | null;
  shipPoBox: string | null;
  shipCity: string | null;
  shipState: string | null;
  shipCode: string | null;
  shipCountry: string | null;
  termsConditions: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: { id: number; name: string } | null;
  contact?: { id: number; name: string } | null;
  assignedTo?: { id: number; username: string; firstName: string | null; lastName: string | null } | null;
}

export interface GetVtQuotesParams {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
  organizationId?: string;
}

class VtQuotesAPI {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Non autenticato');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async getAll(params: GetVtQuotesParams = {}) {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page.toString());
    if (params.limit) qp.append('limit', params.limit.toString());
    if (params.search) qp.append('search', params.search);
    if (params.stage) qp.append('stage', params.stage);
    if (params.organizationId) qp.append('organizationId', params.organizationId);

    const url = `${API_BASE_URL}/vt-quotes${qp.toString() ? `?${qp.toString()}` : ''}`;
    const response = await fetch(url, { headers: this.getAuthHeader() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async getById(id: number) {
    const response = await fetch(`${API_BASE_URL}/vt-quotes/${id}`, { headers: this.getAuthHeader() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async create(data: Partial<VtQuote>) {
    const response = await fetch(`${API_BASE_URL}/vt-quotes`, {
      method: 'POST', headers: this.getAuthHeader(), body: JSON.stringify(data),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async update(id: number, data: Partial<VtQuote>) {
    const response = await fetch(`${API_BASE_URL}/vt-quotes/${id}`, {
      method: 'PUT', headers: this.getAuthHeader(), body: JSON.stringify(data),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async delete(id: number) {
    const response = await fetch(`${API_BASE_URL}/vt-quotes/${id}`, {
      method: 'DELETE', headers: this.getAuthHeader(),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }
}

export const vtQuotesAPI = new VtQuotesAPI();
