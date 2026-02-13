const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Organization {
  id: number;
  name: string;
  vatNumber: string | null;
  uniqueCode: string | null;
  pec: string | null;
  isActive: boolean;
  code: string | null;
  denomination: string | null;
  phone: string | null;
  otherPhone: string | null;
  mobile: string | null;
  fax: string | null;
  email: string | null;
  employees: number | null;
  industry: string | null;
  accountType: string | null;
  devices: string | null;
  parentId: number | null;
  nasInfo: string | null;
  shareholders: string | null;
  nasContract: string | null;
  legalRep: string | null;
  secretary: string | null;
  assignedToId: number | null;
  priceList: string | null;
  billStreet: string | null;
  billCity: string | null;
  billState: string | null;
  billCode: string | null;
  billCountry: string | null;
  shipStreet: string | null;
  shipCity: string | null;
  shipState: string | null;
  shipCode: string | null;
  shipCountry: string | null;
  bankName: string | null;
  iban: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: number; username: string; firstName: string | null; lastName: string | null } | null;
  parent?: { id: number; name: string } | null;
}

export interface GetOrganizationsParams {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  accountType?: string;
  isActive?: string;
}

class OrganizationsAPI {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Non autenticato');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async getAll(params: GetOrganizationsParams = {}) {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page.toString());
    if (params.limit) qp.append('limit', params.limit.toString());
    if (params.search) qp.append('search', params.search);
    if (params.industry) qp.append('industry', params.industry);
    if (params.accountType) qp.append('accountType', params.accountType);
    if (params.isActive !== undefined) qp.append('isActive', params.isActive);

    const url = `${API_BASE_URL}/organizations${qp.toString() ? `?${qp.toString()}` : ''}`;
    const response = await fetch(url, { headers: this.getAuthHeader() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async getById(id: number) {
    const response = await fetch(`${API_BASE_URL}/organizations/${id}`, { headers: this.getAuthHeader() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async create(data: Partial<Organization>) {
    const response = await fetch(`${API_BASE_URL}/organizations`, {
      method: 'POST', headers: this.getAuthHeader(), body: JSON.stringify(data),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async update(id: number, data: Partial<Organization>) {
    const response = await fetch(`${API_BASE_URL}/organizations/${id}`, {
      method: 'PUT', headers: this.getAuthHeader(), body: JSON.stringify(data),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async delete(id: number) {
    const response = await fetch(`${API_BASE_URL}/organizations/${id}`, {
      method: 'DELETE', headers: this.getAuthHeader(),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }
}

export const organizationsAPI = new OrganizationsAPI();
