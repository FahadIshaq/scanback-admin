const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://scanback-backend.onrender.com/api';

// TypeScript interfaces
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface QRCode {
  _id: string;
  code: string;
  type: 'item' | 'pet';
  isActivated: boolean;
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
    age?: number;
    microchipId?: string;
    value?: number;
    purchaseDate?: string;
    warrantyExpiry?: string;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
    message?: string;
  };
  status: "active" | "inactive" | "suspended" | "found";
  scanCount: number;
  lastScanned?: string;
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
  activatedQRCodes: number;
  itemQRCodes: number;
  petQRCodes: number;
  recentQRCodes: QRCode[];
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
  async adminLogin(credentials: { email: string; password: string }): Promise<ApiResponse<{ user: AdminUser; token: string }>> {
    const response = await this.request<ApiResponse<{ user: AdminUser; token: string }>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async getCurrentAdmin(): Promise<ApiResponse<{ user: AdminUser }>> {
    return this.request<ApiResponse<{ user: AdminUser }>>('/auth/me');
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

  async getAllQRCodes(params?: { page?: number; limit?: number; type?: string; status?: string }): Promise<ApiResponse<QRCodeListResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    return this.request<ApiResponse<QRCodeListResponse>>(`/admin/qr-codes${queryString ? `?${queryString}` : ''}`);
  }

  async getQRCodeStats(): Promise<ApiResponse<QRCodeStats>> {
    return this.request<ApiResponse<QRCodeStats>>('/admin/stats');
  }

  async updateQRCodeStatus(code: string, status: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/admin/qr-codes/${code}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteQRCode(code: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/admin/qr-codes/${code}`, {
      method: 'DELETE',
    });
  }

  // User management
  async getAllUsers(params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    return this.request<ApiResponse<any>>(`/admin/users${queryString ? `?${queryString}` : ''}`);
  }

  async getUserStats(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/admin/user-stats');
  }

  async updateUserStatus(userId: string, status: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Analytics
  async getAnalytics(period: string = '30d'): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/admin/analytics?period=${period}`);
  }

  async getScanHistory(params?: { page?: number; limit?: number; code?: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.code) queryParams.append('code', params.code);

    const queryString = queryParams.toString();
    return this.request<ApiResponse<any>>(`/admin/scan-history${queryString ? `?${queryString}` : ''}`);
  }

  // Notifications
  async getAllNotifications(params?: { page?: number; limit?: number; type?: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);

    const queryString = queryParams.toString();
    return this.request<ApiResponse<any>>(`/admin/notifications${queryString ? `?${queryString}` : ''}`);
  }

  // Bulk operations
  async bulkGenerateQRCodes(data: { count: number; type: 'item' | 'pet'; template: any }): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/admin/bulk-generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async exportQRCodes(format: 'csv' | 'excel' = 'csv'): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/admin/export?format=${format}`);
  }
}

export const adminApiClient = new AdminApiClient(API_BASE_URL);
export default adminApiClient;

// Export types for use in components
export type { QRCode, ApiResponse, QRCodeListResponse, QRCodeStats, AdminUser };
