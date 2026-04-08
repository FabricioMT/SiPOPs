import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Text,
  Container,
  Button,
  Anchor,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import apiClient from '../../api/client';

export function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      full_name: (value) => (value.length < 3 ? 'O nome deve ter pelo menos 3 caracteres' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'E-mail inválido'),
      password: (value) => (value.length < 6 ? 'A senha deve ter pelo menos 6 caracteres' : null),
      confirmPassword: (value, values) =>
        value !== values.password ? 'As senhas não coincidem' : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/register', {
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        role: 'colaborador', // Default role mapping
      });

      // Navigate to login after successful registration
      navigate('/login', { state: { message: 'Conta criada com sucesso! Faça login.' } });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocorreu um erro ao criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" order={1} c="sipopsGreen">
        MediCore
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Já possui uma conta?{' '}
        <Anchor size="sm" component="button" onClick={() => navigate('/login')}>
          Fazer login
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Nome Completo"
            placeholder="Seu nome completo"
            required
            {...form.getInputProps('full_name')}
          />
          <TextInput
            label="E-mail"
            placeholder="seu@email.com"
            required
            mt="md"
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Senha"
            placeholder="Sua senha"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <PasswordInput
            label="Confirmar Senha"
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
            Criar Conta
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
