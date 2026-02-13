const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface SalesOrder {
  id: number;
  orderNumber: string;
  subject: string;
  organizationId: number | null;
  contactId: number | null;
  quoteId: number | null;
  assignedToId: number | null;
  customerNumber: string | null;
  purchaseOrder: string | null;
  invoiceStatus: string | null;
  dueDate: string | null;
  status: string;
  salesCommission: number | null;
  carrier: string | null;
  exciseDuty: number | null;
  consultecnoContract: string | null;
  opening: string | null;
  enableRecurring: boolean;
  recurringFreq: string | null;
  startPeriod: string | null;
  endPeriod: string | null;
  paymentDuration: string | null;
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
  quote?: { id: number; quoteNumber: string; subject: string } | null;
  assignedTo?: { id: number; username: string; firstName: string | null; lastName: string | null } | null;
}

export interface GetSalesOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  invoiceStatus?: string;
}

class SalesOrdersAPI {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Non autenticato');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async getAll(params: GetSalesOrdersParams = {}) {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page.toString());
    if (params.limit) qp.append('limit', params.limit.toString());
    if (params.search) qp.append('search', params.search);
    if (params.status) qp.append('status', params.status);
    if (params.invoiceStatus) qp.append('invoiceStatus', params.invoiceStatus);

    const url = `${API_BASE_URL}/sales-orders${qp.toString() ? `?${qp.toString()}` : ''}`;
    const response = await fetch(url, { headers: this.getAuthHeader() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async getById(id: number) {
    const response = await fetch(`${API_BASE_URL}/sales-orders/${id}`, { headers: this.getAuthHeader() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async create(data: Partial<SalesOrder>) {
    const response = await fetch(`${API_BASE_URL}/sales-orders`, {
      method: 'POST', headers: this.getAuthHeader(), body: JSON.stringify(data),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async update(id: number, data: Partial<SalesOrder>) {
    const response = await fetch(`${API_BASE_URL}/sales-orders/${id}`, {
      method: 'PUT', headers: this.getAuthHeader(), body: JSON.stringify(data),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async delete(id: number) {
    const response = await fetch(`${API_BASE_URL}/sales-orders/${id}`, {
      method: 'DELETE', headers: this.getAuthHeader(),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }
}

export const salesOrdersAPI = new SalesOrdersAPI();
