const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ServiceContract {
  id: number;
  contractNumber: string;
  subject: string | null;
  contractType: string | null;
  status: string;
  frequency: string | null;
  contractValue: number | null;
  startDate: string | null;
  dueDate: string | null;
  nextInvoiceDate: string | null;
  organizationId: number | null;
  assignedToId: number | null;
  isConsultecno: boolean;
  isPaid: boolean;
  invoiceRef: string | null;
  trackingUnit: string | null;
  totalUnits: number | null;
  usedUnits: number | null;
  priority: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: { id: number; name: string; denomination: string | null; code: string | null; legalRep: string | null; shareholders: string | null } | null;
  assignedTo?: { id: number; username: string; firstName: string | null; lastName: string | null } | null;
}

export interface GetServiceContractsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  frequency?: string;
  isConsultecno?: string;
  isPaid?: string;
  includeStats?: string;
  contractNumber?: string;
  contractType?: string;
  orgName?: string;
  subject?: string;
  startDateFrom?: string;
  startDateTo?: string;
  nextInvoiceDateFrom?: string;
  nextInvoiceDateTo?: string;
}

class ServiceContractsAPI {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Non autenticato');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async getAll(params: GetServiceContractsParams = {}) {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page.toString());
    if (params.limit) qp.append('limit', params.limit.toString());
    if (params.search) qp.append('search', params.search);
    if (params.status) qp.append('status', params.status);
    if (params.frequency) qp.append('frequency', params.frequency);
    if (params.isConsultecno) qp.append('isConsultecno', params.isConsultecno);
    if (params.isPaid) qp.append('isPaid', params.isPaid);
    if (params.includeStats) qp.append('includeStats', params.includeStats);
    if (params.contractNumber) qp.append('contractNumber', params.contractNumber);
    if (params.contractType) qp.append('contractType', params.contractType);
    if (params.orgName) qp.append('orgName', params.orgName);
    if (params.subject) qp.append('subject', params.subject);
    if (params.startDateFrom) qp.append('startDateFrom', params.startDateFrom);
    if (params.startDateTo) qp.append('startDateTo', params.startDateTo);
    if (params.nextInvoiceDateFrom) qp.append('nextInvoiceDateFrom', params.nextInvoiceDateFrom);
    if (params.nextInvoiceDateTo) qp.append('nextInvoiceDateTo', params.nextInvoiceDateTo);

    const url = `${API_BASE_URL}/service-contracts${qp.toString() ? `?${qp.toString()}` : ''}`;
    const response = await fetch(url, { headers: this.getAuthHeader() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async getById(id: number) {
    const response = await fetch(`${API_BASE_URL}/service-contracts/${id}`, { headers: this.getAuthHeader() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async create(data: Partial<ServiceContract>) {
    const response = await fetch(`${API_BASE_URL}/service-contracts`, {
      method: 'POST', headers: this.getAuthHeader(), body: JSON.stringify(data),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async update(id: number, data: Partial<ServiceContract>) {
    const response = await fetch(`${API_BASE_URL}/service-contracts/${id}`, {
      method: 'PUT', headers: this.getAuthHeader(), body: JSON.stringify(data),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async delete(id: number) {
    const response = await fetch(`${API_BASE_URL}/service-contracts/${id}`, {
      method: 'DELETE', headers: this.getAuthHeader(),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }
}

export const serviceContractsAPI = new ServiceContractsAPI();
