import {
  PasswordInput,
  Paper,
  Title,
  Text,
  Container,
  Button,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import apiClient from '../../api/client';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) => (value.length < 6 ? 'A senha deve ter pelo menos 6 caracteres' : null),
      confirmPassword: (value, values) =>
        value !== values.password ? 'As senhas não coincidem' : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    if (!token) {
      setError('Token de recuperação não encontrado. Solicite um novo link.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/reset-password', {
        token: token,
        new_password: values.password,
      });

      // Navigate to login after successful reset
      navigate('/login', { state: { message: 'Senha atualizada com sucesso! Você já pode fazer login.' } });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocorreu um erro ao redefinir a senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Container size={420} my={80}>
        <Title ta="center" order={2} c="red">
          Link Inválido
        </Title>
        <Text ta="center" mt="md">
          O link de recuperação de senha está incompleto ou inválido.
          Por favor, solicite a recuperação novamente.
        </Text>
        <Button fullWidth mt="xl" onClick={() => navigate('/forgot-password')}>
          Solicitar novo link
        </Button>
      </Container>
    );
  }

  return (
    <Container size={420} my={80}>
      <Title ta="center" order={2} c="sipopsGreen">
        Redefinir Senha
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Crie uma nova senha segura para sua conta.
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <PasswordInput
            label="Nova Senha"
            placeholder="Sua senha"
            required
            {...form.getInputProps('password')}
          />
          <PasswordInput
            label="Confirmar Nova Senha"
            placeholder="Confirme sua senha"
            required
            mt="md"
            {...form.getInputProps('confirmPassword')}
          />

          {error && (
            <Text c="red" size="sm" mt="sm">
              {error}
            </Text>
          )}

          <Button fullWidth mt="xl" type="submit" loading={loading}>
            Atualizar Senha
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
