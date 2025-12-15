// API base URL - backend root URL (paths already include /api/)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://scanback-backend.vercel.app';

// TypeScript interfaces
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface QRCode {
  _id: string;
  code: string;
  type: 'item' | 'pet' | 'emergency' | 'general';
  isActivated: boolean;
  owner?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  } | string;
  details: {
    name: string;
    description?: string;
    category?: string;
    color?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    species?: string;
    breed?: string;
    age?: string | number;
    microchipId?: string;
    value?: number;
    purchaseDate?: string;
    warrantyExpiry?: string;
    image?: string;
    // Pet-specific fields
    emergencyDetails?: string;
    pedigreeInfo?: string;
    medicalNotes?: string;
    vetName?: string;
    vetPhone?: string;
    vetCountryCode?: string;
    emergencyContact?: string;
    emergencyCountryCode?: string;
    registrationNumber?: string;
    breederInfo?: string;
    // Emergency Details fields
    medicalAidProvider?: string;
    medicalAidNumber?: string;
    bloodType?: string;
    allergies?: string;
    medications?: string;
    organDonor?: boolean;
    iceNote?: string;
    // Emergency Contacts fields
    emergencyContact1Name?: string;
    emergencyContact1Phone?: string;
    emergencyContact1CountryCode?: string;
    emergencyContact1Relation?: string;
    emergencyContact2Name?: string;
    emergencyContact2Phone?: string;
    emergencyContact2CountryCode?: string;
    emergencyContact2Relation?: string;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
    countryCode?: string;
    backupPhone?: string;
    backupCountryCode?: string;
    message?: string;
  };
  settings?: {
    instantAlerts?: boolean;
    locationSharing?: boolean;
    showContactOnFinderPage?: boolean;
    useBackupNumber?: boolean;
  };
  metadata?: Record<string, any>;
  status: "active" | "inactive" | "suspended" | "found";
  scanCount: number;
  lastScanned?: string;
  activationDate?: string;
  createdAt: string;
  updatedAt: string;
  qrImageUrl?: string;
}

interface QRCodeListResponse {
  qrCodes: QRCode[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

interface QRCodeStats {
  totalQRCodes: number;
  activeQRCodes: number;
  totalUsers: number;
  totalScans: number;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

class AdminApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Admin authentication
  async adminLogin(credentials: { email: string; password: string }): Promise<ApiResponse<{ user: AdminUser; token: string }>> {
    const response = await this.request<ApiResponse<{ user: AdminUser; token: string }>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async getCurrentAdmin(): Promise<ApiResponse<{ user: AdminUser }>> {
    return this.request<ApiResponse<{ user: AdminUser }>>('/api/auth/me');
  }

  // QR Code management
  async generateQRCode(data: {
    type: 'item' | 'pet' | 'emergency' | 'general';
    details?: any;
    contact?: any;
    clientId?: string;
    whiteLabelId?: string;
    quantity?: number;
    mode?: 'connected' | 'unique';
  }) {
    return this.request('/api/admin/generate-qr', {
      method: 'POST',
      body: JSON.stringify({
        type: data.type,
        clientId: data.clientId,
        whiteLabelId: data.whiteLabelId,
        quantity: data.quantity,
        mode: data.mode 
      }),
    });
  }

  async getAllQRCodes(params?: { page?: number; limit?: number; type?: string; status?: string; search?: string }): Promise<ApiResponse<QRCodeListResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    return this.request<ApiResponse<QRCodeListResponse>>(`/api/admin/qr-codes${queryString ? `?${queryString}` : ''}`);
  }

  async getQRCodeStats(): Promise<ApiResponse<QRCodeStats>> {
    return this.request<ApiResponse<QRCodeStats>>('/api/admin/stats');
  }

  async updateQRCodeStatus(code: string, status: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/admin/qr-codes/${code}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteQRCode(code: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/admin/qr-codes/${code}`, {
      method: 'DELETE',
    });
  }

  async updateQRCode(code: string, data: any): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/admin/qr-codes/${code}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateQRCodeOwner(code: string, data: { ownerId?: string; ownerEmail?: string; clearOwner?: boolean }): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/admin/qr-codes/${code}/owner`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getQRCodeByCode(code: string): Promise<ApiResponse<{ qrCode: QRCode }>> {
    return this.request<ApiResponse<{ qrCode: QRCode }>>(`/api/admin/qr-codes/${code}`);
  }

  // User management
  async getAllUsers(params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    return this.request<ApiResponse<any>>(`/api/admin/users${queryString ? `?${queryString}` : ''}`);
  }

  async getUserById(userId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/admin/users/${userId}`);
  }

  async getUserQRCodes(userId: string): Promise<ApiResponse<{ qrCodes: QRCode[] }>> {
    return this.request<ApiResponse<{ qrCodes: QRCode[] }>>(`/api/admin/users/${userId}/qr-codes`);
  }

  async getUserStats(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/api/admin/user-stats');
  }

  async updateUserStatus(userId: string, status: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateUser(userId: string, data: any): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string, options?: { deleteQRCodes?: boolean; reassignQrToUserId?: string; reassignQrToEmail?: string }): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify(options || {}),
    });
  }

  // Analytics
  async getAnalytics(period: string = '30d'): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/admin/analytics?period=${period}`);
  }

  async getScanHistory(params?: { page?: number; limit?: number; code?: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.code) queryParams.append('code', params.code);

    const queryString = queryParams.toString();
    return this.request<ApiResponse<any>>(`/api/admin/scan-history${queryString ? `?${queryString}` : ''}`);
  }

  async getRecentActivity(limit: number = 10): Promise<ApiResponse<{ activities: any[] }>> {
    return this.request<ApiResponse<{ activities: any[] }>>(`/api/admin/recent-activity?limit=${limit}`);
  }

  // Notifications
  async getAllNotifications(params?: { page?: number; limit?: number; type?: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);

    const queryString = queryParams.toString();
    return this.request<ApiResponse<any>>(`/api/admin/notifications${queryString ? `?${queryString}` : ''}`);
  }

  // Bulk operations
  async bulkGenerateQRCodes(data: { count: number; type: 'item' | 'pet' | 'emergency'; template: any; clientId?: string }): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/api/admin/bulk-generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Client management
  async getAllClients(): Promise<ApiResponse<{ clients: any[] }>> {
    return this.request<ApiResponse<{ clients: any[] }>>('/api/clients');
  }

  async getClientById(clientId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/clients/${clientId}`);
  }

  async createClient(data: { name: string; contactName?: string; email?: string; phone?: string; address?: string }): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(clientId: string, data: any): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(clientId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/clients/${clientId}`, {
      method: 'DELETE',
    });
  }

  async getClientStockBalance(clientId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/clients/${clientId}/stock-balance`);
  }

  async getClientGenerations(clientId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/clients/${clientId}/generations`);
  }

  async getAllClientsStockBalance(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/api/clients/stock-balance');
  }

  async exportQRCodes(format: 'csv' | 'excel' = 'csv'): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/api/admin/export?format=${format}`);
  }

  async sendBulkEmail(data: {
    userIds?: string[];
    clientIds?: string[];
    customEmails?: string[];
    subject: string;
    htmlContent: string;
    textContent?: string;
    attachments?: Array<{ filename: string; url: string }>;
  }): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/api/admin/send-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadImage(file: File, folder?: string): Promise<{ success: boolean; url?: string; message?: string }> {
    const formData = new FormData();
    formData.append('image', file);
    if (folder) {
      formData.append('folder', folder);
    }

    const url = `${this.baseURL}/api/storage/upload`;
    const config: RequestInit = {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload image');
      }

      return data;
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }

  async uploadFile(file: File, folder?: string): Promise<{ success: boolean; url?: string; filename?: string; message?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }

    const url = `${this.baseURL}/api/storage/upload-file`;
    const config: RequestInit = {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload file');
      }

      return data;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // White Label management
  async getAllWhiteLabels(params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    return this.request(`/api/white-label?${queryParams.toString()}`);
  }

  async getWhiteLabelById(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/white-label/${id}`);
  }

  async createWhiteLabel(data: {
    email: string;
    logo: string;
    brandName: string;
    website: string;
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/white-label', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWhiteLabel(id: string, data: {
    email?: string;
    logo?: string;
    brandName?: string;
    website?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request(`/api/white-label/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWhiteLabel(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/white-label/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleWhiteLabelStatus(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/white-label/${id}/toggle`, {
      method: 'PATCH',
    });
  }

  async createWhiteLabelAdmin(data: {
    whiteLabelId: string;
    email: string;
    password: string;
    name: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/admin/white-label-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWhiteLabelAdmins(whiteLabelId?: string): Promise<ApiResponse<{ admins: any[] }>> {
    const query = whiteLabelId ? `?whiteLabelId=${whiteLabelId}` : '';
    return this.request<ApiResponse<{ admins: any[] }>>(`/api/admin/white-label-admins${query}`);
  }
}

export const adminApiClient = new AdminApiClient(API_BASE_URL);
export default adminApiClient;

// Export types for use in components
export type { QRCode, ApiResponse, QRCodeListResponse, QRCodeStats, AdminUser };
