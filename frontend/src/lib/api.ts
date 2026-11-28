import { API_URL } from './config';

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      // Keep the server's machine-readable fields (e.g. code, retryAfter) on the error
      throw Object.assign(new Error(error.error || 'Request failed'), {
        status: response.status,
        code: error.code,
        retryAfter: error.retryAfter,
      });
    }

    return response.json();
  }

  // Auth
  /** Emails a sign-up code; the address must not be registered yet */
  async sendSignupCode(email: string) {
    return this.request<{ sent: boolean; codeLength: number; expiresInSeconds: number; resendInSeconds: number }>(
      '/api/auth/signup-code',
      { method: 'POST', body: JSON.stringify({ email }) }
    );
  }

  /** Returns the token that register() needs to prove the email was verified */
  async verifySignupCode(email: string, code: string) {
    return this.request<{ verified: boolean; emailVerificationToken: string }>('/api/auth/signup-code/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    birthday: string;
    gender: string;
    emailVerificationToken: string;
  }) {
    return this.request<{ token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Forgot password: email a code -> check it -> set the new password
  async sendPasswordResetCode(email: string) {
    return this.request<{ sent: boolean; codeLength: number; expiresInSeconds: number; resendInSeconds: number }>(
      '/api/auth/password-reset/code',
      { method: 'POST', body: JSON.stringify({ email }) }
    );
  }

  async verifyPasswordResetCode(email: string, code: string) {
    return this.request<{ verified: boolean; resetToken: string }>('/api/auth/password-reset/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async resetPassword(resetToken: string, newPassword: string) {
    return this.request<{ success: boolean }>('/api/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Profile
  async getProfile() {
    return this.request<any>('/api/profile');
  }

  async updateProfile(data: any) {
    return this.request<any>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  uploadPhoto(file: File) {
    return this.sendPhoto('/api/profile/photo', file);
  }

  addPhoto(file: File) {
    return this.sendPhoto('/api/profile/photos', file);
  }

  private async sendPhoto(endpoint: string, file: File) {
    const formData = new FormData();
    formData.append('photo', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload photo');
    }

    return response.json();
  }

  async deletePhoto(photoUrl: string) {
    return this.request<any>('/api/profile/photo', {
      method: 'DELETE',
      body: JSON.stringify({ photoUrl }),
    });
  }

  // Users
  async discoverUsers() {
    return this.request<any[]>('/api/users/discover');
  }

  async getUserById(id: string) {
    return this.request<any>(`/api/users/${id}`);
  }

  // Matches
  async likeUser(userId: string) {
    return this.request<any>(`/api/matches/like/${userId}`, {
      method: 'POST',
    });
  }

  async passUser(userId: string) {
    return this.request<any>(`/api/matches/pass/${userId}`, {
      method: 'POST',
    });
  }

  async getMatches() {
    return this.request<any[]>('/api/matches');
  }

  // Messages
  async getMessages(matchId: string, limit?: number, cursor?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);
    
    const queryString = params.toString();
    const endpoint = `/api/messages/${matchId}${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint);
  }
}

export const api = new ApiClient();
