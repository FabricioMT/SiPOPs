import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Login } from './Login';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock axios client
vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import apiClient from '../../api/client';

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o formulário de login corretamente', () => {
    renderWithProviders(<Login />);

    expect(screen.getByText('MediCore')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sua senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('exibe erro de validação para e-mail inválido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'emailinvalido');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
  });

  it('exibe erro de validação para senha curta', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), '123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByText('A senha deve ter pelo menos 6 caracteres')).toBeInTheDocument();
  });

  it('faz login com credenciais válidas e navega para dashboard', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { access_token: 'fake-token', token_type: 'bearer' },
    });
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { id: 1, email: 'test@example.com', full_name: 'Test User' },
    });

    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.any(URLSearchParams),
        expect.objectContaining({ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('exibe mensagem de erro ao falhar no login', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.post).mockRejectedValueOnce({
      response: { data: { detail: 'Incorrect email or password' } },
    });

    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Incorrect email or password')).toBeInTheDocument();
    });
  });
});
