import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ForgotPassword } from './ForgotPassword';

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

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza a tela de Esqueci Minha Senha', () => {
    renderWithProviders(<ForgotPassword />);

    expect(screen.getByText('Esqueci Minha Senha')).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar link/i })).toBeInTheDocument();
  });

  it('valida e-mail inválido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPassword />);

    await user.type(screen.getByLabelText(/e-mail/i), 'emailinvalido');
    await user.click(screen.getByRole('button', { name: /enviar link/i }));

    expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
  });

  it('envia solicitação e exibe mensagem de sucesso', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { msg: 'If the email is registered, a password reset link will be sent.' },
    });

    renderWithProviders(<ForgotPassword />);

    await user.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /enviar link/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Se uma conta com este e-mail existir/i)
      ).toBeInTheDocument();
    });
  });

  it('possui link para voltar ao login', () => {
    renderWithProviders(<ForgotPassword />);

    expect(screen.getByText(/voltar para o login/i)).toBeInTheDocument();
  });
});
