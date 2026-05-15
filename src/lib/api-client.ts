const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = {
    getAuthToken: () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('access_token');
        }
        return null;
    },

    setAuthToken: (token: string, user: any) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', token);
            localStorage.setItem('current_user', JSON.stringify(user));
        }
    },

    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('current_user');
            localStorage.removeItem('biz_list');
        }
    },

    async request(endpoint: string, options: RequestInit = {}) {
        const token = this.getAuthToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...((options.headers as Record<string, string>) || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'An error occurred during the request');
        }

        // Best-effort JSON parse — DELETE may return empty body
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    },

    async post(endpoint: string, data: any) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async patch(endpoint: string, data: any) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async put(endpoint: string, data: any) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(endpoint: string) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    async get(endpoint: string) {
        return this.request(endpoint, {
            method: 'GET',
        });
    }
};
