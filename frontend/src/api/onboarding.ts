import apiClient from './client';

export interface PlaylistSOPResponse {
  sop_id: number;
  order_index: number;
  sop: {
    id: number;
    title: string;
    category: string;
    status: string;
    current_version_number: number | null;
  };
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
  }
};
