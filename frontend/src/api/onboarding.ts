import apiClient from './client';

export interface PlaylistSOPResponse {
  sop_id: number | null;
  protocol_id: number | null;
  order_index: number;
  image_path?: string;
  sop?: {
    id: number;
    title: string;
    category: string;
    status: string;
    current_version_number: number | null;
  };
  protocol?: {
    id: number;
    health_plan_id: number;
    patient_type: string;
    title: string;
  };
}

export interface OnboardingItem {
  id: number;
  title: string;
  content: string;
  order_index: number;
  sector_slug: string;
  image_path?: string;
  protocol_id?: number;
  sop_id?: number;
}

export interface OnboardingItemUpdate {
  title?: string;
  content?: string;
  order_index?: number;
  sector_slug?: string;
}

export interface PlaylistResponse {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaylistDetailResponse extends PlaylistResponse {
  sops: PlaylistSOPResponse[];
}

export interface ProgressResponse {
  playlist_id: number;
  playlist_title: string;
  percentage: number;
  read_count: number;
  total_count: number;
}

export const onboardingApi = {
  getPlaylists: async (limit = 20, offset = 0) => {
    const response = await apiClient.get<PlaylistResponse[]>('/playlists', {
      params: { limit, offset }
    });
    return response.data;
  },

  getPlaylistDetail: async (id: number | string) => {
    const response = await apiClient.get<PlaylistDetailResponse>(`/playlists/${id}`);
    return response.data;
  },

  getPlaylistProgress: async (id: number | string) => {
    const response = await apiClient.get<ProgressResponse>(`/playlists/${id}/progress`);
    return response.data;
  },

  getMyProgress: async () => {
    const response = await apiClient.get<ProgressResponse[]>('/playlists/me/progress');
    return response.data;
  },

  getUsers: async (limit = 50, offset = 0) => {
    const response = await apiClient.get<UserResponse[]>('/auth/users', {
      params: { limit, offset }
    });
    return response.data;
  },

  getUserAllProgress: async (userId: number) => {
    const response = await apiClient.get<ProgressResponse[]>(`/playlists/users/${userId}/progress`);
    return response.data;
  },

  updateUser: async (userId: number, data: Partial<UserResponse> & { password?: string }) => {
    const response = await apiClient.patch<UserResponse>(`/auth/users/${userId}`, data);
    return response.data;
  },

  createUser: async (data: { email: string; full_name: string; roles: string[] }) => {
    const response = await apiClient.post<UserResponse & { plain_password: string }>('/auth/users', data);
    return response.data;
  },

  deleteUser: async (userId: number) => {
    await apiClient.delete(`/auth/users/${userId}`);
  },

  updateGuide: async (guideId: number, data: { title?: string; content?: string; order_index?: number }) => {
    const response = await apiClient.patch(`/spdata-guides/${guideId}`, data);
    return response.data;
  },
  
  uploadAsset: async (itemId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/playlists/items/${itemId}/upload-asset`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // --- Item Management ---
  getItems: async (params: { protocol_id?: number; sop_id?: number }) => {
    const r = await apiClient.get<OnboardingItem[]>('/playlists/items', { params });
    return r.data;
  },

  createItem: async (data: Partial<OnboardingItem>) => {
    const r = await apiClient.post<OnboardingItem>('/playlists/items', data);
    return r.data;
  },

  updateItem: async (itemId: number, data: OnboardingItemUpdate) => {
    const r = await apiClient.patch<OnboardingItem>(`/playlists/items/${itemId}`, data);
    return r.data;
  },

  deleteItem: async (itemId: number) => {
    await apiClient.delete(`/playlists/items/${itemId}`);
  }
};

export interface UserResponse {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
}
