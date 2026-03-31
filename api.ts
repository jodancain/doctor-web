async function handleResponse(res: Response, fallbackMsg: string) {
  if (!res.ok) {
    let errorMsg = fallbackMsg;
    try {
      const body = await res.json();
      if (body.error) errorMsg = body.error;
    } catch {
      // Response was not valid JSON; use fallback message
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  async login(username: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });
    return handleResponse(res, 'Login failed');
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  },

  async getMe() {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    return handleResponse(res, 'Not authenticated');
  },

  async updateProfile(data: any) {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return handleResponse(res, 'Failed to update profile');
  },

  async getPatients(params?: { limit?: number; offset?: number; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.q) searchParams.set('q', params.q);

    const res = await fetch(`/api/patients?${searchParams.toString()}`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch patients');
  },

  async getPatient(patientOpenid: string) {
    const res = await fetch(`/api/patients/${patientOpenid}`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch patient');
  },

  async createPatient(data: any) {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return handleResponse(res, 'Failed to create patient');
  },

  async updatePatient(patientOpenid: string, data: any) {
    const res = await fetch(`/api/patients/${patientOpenid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return handleResponse(res, 'Failed to update patient');
  },

  async deletePatient(patientOpenid: string) {
    const res = await fetch(`/api/patients/${patientOpenid}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res, 'Failed to delete patient');
  },

  async getPatientRecords(patientOpenid: string, type: string, params?: { limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams({ type });
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const res = await fetch(`/api/patients/${patientOpenid}/records?${searchParams.toString()}`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch patient records');
  },

  async getPatientSummary(patientOpenid: string) {
    const res = await fetch(`/api/patients/${patientOpenid}/summary`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch patient summary');
  },

  async getDashboardStats() {
    const res = await fetch('/api/patients/dashboard/stats', { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch dashboard stats');
  },

  // Education Articles (Hospital Knowledge Base)
  async getEducationArticles(params?: { limit?: number; offset?: number; category?: string; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.category) searchParams.set('category', params.category);
    if (params?.q) searchParams.set('q', params.q);

    const res = await fetch(`/api/education?${searchParams.toString()}`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch education articles');
  },

  async getEducationArticle(id: string) {
    const res = await fetch(`/api/education/${id}`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch article');
  },

  async createEducationArticle(data: any) {
    const res = await fetch('/api/education', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return handleResponse(res, 'Failed to create article');
  },

  async updateEducationArticle(id: string, data: any) {
    const res = await fetch(`/api/education/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return handleResponse(res, 'Failed to update article');
  },

  async deleteEducationArticle(id: string) {
    const res = await fetch(`/api/education/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res, 'Failed to delete article');
  }
};
