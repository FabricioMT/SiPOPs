import {
  TextInput,
  Paper,
  Title,
  Text,
  Container,
  Button,
  Anchor,
  Center,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import apiClient from '../../api/client';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'E-mail inválido'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/forgot-password', { email: values.email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocorreu um erro ao processar sua solicitação.');
      // Na prática de segurança, é melhor não revelar se o email existe ou não,
      // mas para este sistema interno, podemos exibir a mensagem de erro da API.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Title ta="center" order={2} c="sipopsGreen">
        Esqueci Minha Senha
      </Title>
      
      {!success ? (
        <>
          <Text c="dimmed" size="sm" ta="center" mt={5}>
            Digite seu e-mail para receber um link de recuperação.
          </Text>

          <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <TextInput
                label="E-mail"
                placeholder="seu@email.com"
                required
                {...form.getInputProps('email')}
              />

              {error && (
                <Text c="red" size="sm" mt="sm">
                  {error}
                </Text>
              )}

              <Button fullWidth mt="xl" type="submit" loading={loading}>
                Enviar link de recuperação
              </Button>
            </form>
          </Paper>
        </>
      ) : (
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Text ta="center" mb="lg">
            Se uma conta com este e-mail existir, você receberá instruções para redefinir a senha em breve.
            <br />
            (Para fins de dev local, o token/link será impresso no terminal do Backend)
          </Text>
        </Paper>
      )}

      <Center mt="xl">
        <Anchor
          component="button"
          size="sm"
          onClick={() => navigate('/login')}
          style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <ArrowLeft size={16} /> Voltar para o Login
        </Anchor>
      </Center>
    </Container>
  );
}
