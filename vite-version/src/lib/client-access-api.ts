import { api } from './api';

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface Quote {
  id: number;
  quoteNumber: string;
  title: string;
  status: string;
  total: number;
}

export interface ClientAccess {
  id: number;
  contactId: number;
  accessType: 'QUOTE_ONLY' | 'FULL_CLIENT';
  username: string;
  emailVerified: boolean;
  isActive: boolean;
  activationToken: string | null;
  activationExpires: string | null;
  projectName: string | null;
  projectDescription: string | null;
  projectBudget: number | null;
  projectStartDate: string | null;
  projectEndDate: string | null;
  monthlyFee: number;
  supportHoursIncluded: number;
  supportHoursUsed: number;
  driveFolderLink: string | null;
  documentsFolder: string | null;
  assetsFolder: string | null;
  invoiceFolder: string | null;
  bespokeDetails: string | null;
  linkedQuoteId: number | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
  linkedQuote: Quote | null;
}

export interface CreateClientAccessData {
  contactId: number;
  accessType: 'QUOTE_ONLY' | 'FULL_CLIENT';
  linkedQuoteId?: number | null;
  projectName?: string;
  projectDescription?: string;
  projectBudget?: number;
  projectStartDate?: string;
  projectEndDate?: string;
  monthlyFee?: number;
  supportHoursIncluded?: number;
  driveFolderLink?: string;
  documentsFolder?: string;
  assetsFolder?: string;
  invoiceFolder?: string;
  bespokeDetails?: any;
}

export interface UpdateClientAccessData extends Partial<CreateClientAccessData> {
  isActive?: boolean;
}

export interface UpgradeToFullClientData {
  projectName: string;
  projectDescription?: string;
  projectBudget?: number;
  projectStartDate?: string;
  projectEndDate?: string;
  monthlyFee?: number;
  supportHoursIncluded?: number;
  driveFolderLink?: string;
  documentsFolder?: string;
  assetsFolder?: string;
  invoiceFolder?: string;
  bespokeDetails?: any;
}

export interface ClientAccessListResponse {
  success: boolean;
  data: ClientAccess[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ClientAccessResponse {
  success: boolean;
  data: ClientAccess;
  message?: string;
}

export const clientAccessAPI = {
  /**
   * Get all client accesses with filters
   */
  async getAll(params?: {
    search?: string;
    accessType?: string;
    emailVerified?: boolean;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ClientAccessListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.accessType) queryParams.append('accessType', params.accessType);
    if (params?.emailVerified !== undefined) queryParams.append('emailVerified', params.emailVerified.toString());
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`/client-access?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get single client access by ID
   */
  async getById(id: number): Promise<ClientAccessResponse> {
    const response = await api.get(`/client-access/${id}`);
    return response.data;
  },

  /**
   * Create new client access
   */
  async create(data: CreateClientAccessData): Promise<ClientAccessResponse> {
    const response = await api.post('/client-access', data);
    return response.data;
  },

  /**
   * Update client access
   */
  async update(id: number, data: UpdateClientAccessData): Promise<ClientAccessResponse> {
    const response = await api.put(`/client-access/${id}`, data);
    return response.data;
  },

  /**
   * Delete client access
   */
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/client-access/${id}`);
    return response.data;
  },

  /**
   * Resend activation email
   */
  async resendActivation(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/client-access/${id}/resend-activation`);
    return response.data;
  },

  /**
   * Upgrade from QUOTE_ONLY to FULL_CLIENT
   */
  async upgradeToFullClient(id: number, data: UpgradeToFullClientData): Promise<ClientAccessResponse> {
    const response = await api.post(`/client-access/${id}/upgrade-to-full`, data);
    return response.data;
  },

  /**
   * Copy activation link to clipboard
   */
  getActivationLink(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/client/activate?token=${token}`;
  },
};
