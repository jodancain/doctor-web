export const api = {
  async login(username: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
  },

  async getMe() {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  async updateProfile(data: any) {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  async getPatients(params?: { limit?: number; offset?: number; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.q) searchParams.set('q', params.q);

    const res = await fetch(`/api/patients?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch patients');
    return res.json();
  },

  async getPatient(patientOpenid: string) {
    const res = await fetch(`/api/patients/${patientOpenid}`);
    if (!res.ok) throw new Error('Failed to fetch patient');
    return res.json();
  },

  async createPatient(data: any) {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create patient');
    return res.json();
  },

  async updatePatient(patientOpenid: string, data: any) {
    const res = await fetch(`/api/patients/${patientOpenid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update patient');
    return res.json();
  },

  async deletePatient(patientOpenid: string) {
    const res = await fetch(`/api/patients/${patientOpenid}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete patient');
    return res.json();
  },

  async getPatientRecords(patientOpenid: string, type: string, params?: { limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams({ type });
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const res = await fetch(`/api/patients/${patientOpenid}/records?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch patient records');
    return res.json();
  },

  async getPatientSummary(patientOpenid: string) {
    const res = await fetch(`/api/patients/${patientOpenid}/summary`);
    if (!res.ok) throw new Error('Failed to fetch patient summary');
    return res.json();
  },

  async getDashboardStats() {
    const res = await fetch('/api/patients/dashboard/stats');
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  }
};
