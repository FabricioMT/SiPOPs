import {
  TextInput,
  PasswordInput,
  Checkbox,
  Anchor,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Button,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { useState } from 'react';

export function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'E-mail inválido'),
      password: (value) => (value.length < 6 ? 'A senha deve ter pelo menos 6 caracteres' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.append('username', values.email);
      formData.append('password', values.password);

      const response = await apiClient.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const token = response.data.access_token;
      
      // Get user profile after login
      const userResponse = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAuth(userResponse.data, token, values.rememberMe);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocorreu um erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" order={1} c="mediBlue">
        SiPOPs
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Não possui uma conta?{' '}
        <Anchor size="sm" component="button" onClick={() => navigate('/register')}>
          Criar conta
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="E-mail"
            placeholder="seu@email.com"
            required
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Senha"
            placeholder="Sua senha"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <Group justify="space-between" mt="lg">
            <Checkbox 
              label="Lembrar-me" 
              {...form.getInputProps('rememberMe', { type: 'checkbox' })}
            />
            <Anchor component="button" size="sm" onClick={() => navigate('/forgot-password')}>
              Esqueceu sua senha?
            </Anchor>
          </Group>

          {error && (
            <Text c="red" size="sm" mt="sm">
              {error}
            </Text>
          )}

          <Button fullWidth mt="xl" type="submit" loading={loading} color="mediBlue">
            Entrar
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
