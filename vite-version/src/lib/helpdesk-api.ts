const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface HelpDeskTicket {
  id: number;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string | null;
  callType: string | null;
  ticketOrigin: string | null;
  category: string | null;
  organizationId: number | null;
  contactId: number | null;
  assignedToId: number | null;
  description: string | null;
  solution: string | null;
  days: number | null;
  hours: number | null;
  keywords: string | null;
  technicianName: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: { id: number; name: string } | null;
  contact?: { id: number; name: string } | null;
  assignedTo?: { id: number; username: string; firstName: string | null; lastName: string | null } | null;
}

export interface GetHelpDeskParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  callType?: string;
  ticketOrigin?: string;
  category?: string;
}

class HelpDeskAPI {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Non autenticato');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async getAll(params: GetHelpDeskParams = {}) {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page.toString());
    if (params.limit) qp.append('limit', params.limit.toString());
    if (params.search) qp.append('search', params.search);
    if (params.status) qp.append('status', params.status);
    if (params.priority) qp.append('priority', params.priority);
    if (params.callType) qp.append('callType', params.callType);
    if (params.ticketOrigin) qp.append('ticketOrigin', params.ticketOrigin);
    if (params.category) qp.append('category', params.category);

    const url = `${API_BASE_URL}/helpdesk${qp.toString() ? `?${qp.toString()}` : ''}`;
    const response = await fetch(url, { headers: this.getAuthHeader() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async getById(id: number) {
    const response = await fetch(`${API_BASE_URL}/helpdesk/${id}`, { headers: this.getAuthHeader() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async create(data: Partial<HelpDeskTicket>) {
    const response = await fetch(`${API_BASE_URL}/helpdesk`, {
      method: 'POST', headers: this.getAuthHeader(), body: JSON.stringify(data),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async update(id: number, data: Partial<HelpDeskTicket>) {
    const response = await fetch(`${API_BASE_URL}/helpdesk/${id}`, {
      method: 'PUT', headers: this.getAuthHeader(), body: JSON.stringify(data),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }

  async delete(id: number) {
    const response = await fetch(`${API_BASE_URL}/helpdesk/${id}`, {
      method: 'DELETE', headers: this.getAuthHeader(),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Errore'); }
    return response.json();
  }
}

export const helpdeskAPI = new HelpDeskAPI();
