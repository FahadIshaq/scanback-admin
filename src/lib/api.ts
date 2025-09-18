const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

class AdminApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    console.log('API Client initialized with token:', this.token ? 'exists' : 'none');
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
  async adminLogin(credentials: { email: string; password: string }) {
    const response = await this.request<{
      success: boolean;
      data: { user: any; token: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async getCurrentAdmin() {
    return this.request('/auth/me');
  }

  // QR Code management
  async generateQRCode(data: {
    type: 'item' | 'pet';
    details: any;
    contact: any;
  }) {
    return this.request('/admin/generate-qr', {
      method: 'POST',
      body: JSON.stringify({ type: data.type }),
    });
  }

  async getAllQRCodes(params?: { page?: number; limit?: number; type?: string; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    return this.request(`/admin/qr-codes${queryString ? `?${queryString}` : ''}`);
  }

  async getQRCodeStats() {
    return this.request('/admin/stats');
  }

  async updateQRCodeStatus(code: string, status: string) {
    return this.request(`/admin/qr-codes/${code}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteQRCode(code: string) {
    return this.request(`/admin/qr-codes/${code}`, {
      method: 'DELETE',
    });
  }

  // User management
  async getAllUsers(params?: { page?: number; limit?: number; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    return this.request(`/admin/users${queryString ? `?${queryString}` : ''}`);
  }

  async getUserStats() {
    return this.request('/admin/user-stats');
  }

  async updateUserStatus(userId: string, status: string) {
    return this.request(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Analytics
  async getAnalytics(period: string = '30d') {
    return this.request(`/admin/analytics?period=${period}`);
  }

  async getScanHistory(params?: { page?: number; limit?: number; code?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.code) queryParams.append('code', params.code);

    const queryString = queryParams.toString();
    return this.request(`/admin/scan-history${queryString ? `?${queryString}` : ''}`);
  }

  // Notifications
  async getAllNotifications(params?: { page?: number; limit?: number; type?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);

    const queryString = queryParams.toString();
    return this.request(`/admin/notifications${queryString ? `?${queryString}` : ''}`);
  }

  // Bulk operations
  async bulkGenerateQRCodes(data: { count: number; type: 'item' | 'pet'; template: any }) {
    return this.request('/admin/bulk-generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async exportQRCodes(format: 'csv' | 'excel' = 'csv') {
    return this.request(`/admin/export?format=${format}`);
  }
}

export const adminApiClient = new AdminApiClient(API_BASE_URL);
export default adminApiClient;
