import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Register } from './Register';

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

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o formulário de cadastro corretamente', () => {
    renderWithProviders(<Register />);

    expect(screen.getByText('MediCore')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sua senha')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirme sua senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();
  });

  it('valida nome curto', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'AB');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirme sua senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(screen.getByText('O nome deve ter pelo menos 3 caracteres')).toBeInTheDocument();
  });

  it('valida senhas que não coincidem', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'Test User');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirme sua senha'), 'different123');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
    });
  });

  it('cadastra com sucesso e navega para login', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { id: 1, email: 'test@example.com', full_name: 'Test User' },
    });

    renderWithProviders(<Register />);

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'Test User');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirme sua senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User',
        role: 'colaborador',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', expect.anything());
    });
  });

  it('exibe erro da API ao falhar no cadastro', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.post).mockRejectedValueOnce({
      response: { data: { detail: 'Email already registered' } },
    });

    renderWithProviders(<Register />);

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'Test User');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirme sua senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
  });
});
