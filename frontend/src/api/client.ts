import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 15000, // 15s — previne travamentos silenciosos
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ───────────────────────────────────────────────────────
// Injeta o token JWT automaticamente em todas as requisições
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────────────────────────
// Tratamento global de erros com notificações contextuais
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isNetworkError = !error.response && (
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error'
    );

    if (isNetworkError) {
      // Falha de conexão — pode ser causada por queda do backend ou
      // pelo usuário ter perdido o contexto após usar um portal externo
      notifications.show({
        id: 'sipops-network-error',
        title: '📡 Sem conexão com o SiPOPs',
        message:
          'Não foi possível contactar o servidor. Verifique sua conexão e, ' +
          'se estava usando um portal de convênio, retorne ao guia do SiPOPs para continuar.',
        color: 'orange',
        autoClose: 8000,
        withBorder: true,
      });
      return Promise.reject(error);
    }

    if (status === 401) {
      // Token expirado — logout silencioso e redirecionamento
      useAuthStore.getState().logout();
      // Não exibe notificação para evitar redundância com o redirecionamento
      return Promise.reject(error);
    }

    if (status === 403) {
      notifications.show({
        id: 'sipops-forbidden',
        title: '🔒 Acesso Negado',
        message: 'Você não tem permissão para acessar esta área. Contate seu gestor.',
        color: 'red',
        autoClose: 5000,
        withBorder: true,
      });
      return Promise.reject(error);
    }

    if (status === 422) {
      // Erros de validação — tratados individualmente pelos formulários
      return Promise.reject(error);
    }

    if (status >= 500) {
      notifications.show({
        id: 'sipops-server-error',
        title: '⚠️ Erro no Servidor',
        message: 'Ocorreu um erro interno. Tente novamente em alguns instantes.',
        color: 'red',
        autoClose: 6000,
        withBorder: true,
      });
      return Promise.reject(error);
    }

    // Outros erros (404, etc.) — tratados localmente pelos componentes
    return Promise.reject(error);
  }
);

export default apiClient;
