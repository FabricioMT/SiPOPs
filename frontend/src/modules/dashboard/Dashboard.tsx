import { Container, Title, Text, SimpleGrid, Paper, Group, Stack, ThemeIcon, Button, Progress, Badge, Box } from '@mantine/core';
import { BookOpen, Trophy, Activity, AlertCircle, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { onboardingApi } from '../../api/onboarding';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Fetch all playlists progress for the dashboard overview using the new aggregated API
  const { data: playlists } = useQuery({
    queryKey: ['dashboard-training-progress'],
    queryFn: () => onboardingApi.getMyProgress(),
  });

  // Agregando progresso total real para o Dashboard
  const totals = playlists?.reduce((acc, p) => ({
    read: acc.read + (p.read_count || 0),
    total: acc.total + (p.total_count || 0)
  }), { read: 0, total: 0 }) || { read: 0, total: 0 };

  const globalPercentage = totals.total > 0 ? (totals.read / totals.total) * 100 : 0;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Welcome Header */}
        <Box>
          <Title order={1} fw={800}>
            <Text span variant="gradient" gradient={{ from: 'sipopsGreen', to: 'blue', deg: 45 }} inherit>
              Olá, {user?.email.split('@')[0]}!
            </Text>
          </Title>
          <Text c="dimmed" size="lg" mt={5}>
            Bem-vindo ao <strong>SiPOPs</strong>. O que vamos aprender hoje?
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
          {/* Featured SOP Card (SOP #1) */}
          <Paper withBorder p="xl" radius="lg" shadow="md" style={{ borderLeft: '6px solid var(--mantine-color-sipopsGreen-6)' }}>
            <Stack justify="space-between" h="100%">
              <Box>
                <Group justify="space-between" mb="xs">
                  <Badge color="sipopsGreen" variant="light" leftSection={<Star size={12} fill="currentColor" />}>
                    Destaque
                  </Badge>
                  <ThemeIcon size="lg" radius="md" variant="light" color="sipopsGreen">
                    <BookOpen size={20} />
                  </ThemeIcon>
                </Group>
                <Title order={3} mb={10}>Normas de Atendimento Geral</Title>
                <Text size="sm" c="dimmed" lineClamp={2}>
                  Protocolo essencial para o início do processo de internação e faturamento hospitalar.
                </Text>
              </Box>
              <Button
                variant="filled"
                color="sipopsGreen"
                radius="md"
                onClick={() => navigate('/sops/1')}
                rightSection={<ArrowRight size={16} />}
              >
                Acessar Procedimento
              </Button>
            </Stack>
          </Paper>

          {/* Training Track Progress Card - Now Aggregated */}
          <Paper withBorder p="xl" radius="lg" shadow="sm">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={3}>Sua Capacitação</Title>
                <Trophy size={28} color="var(--mantine-color-yellow-6)" />
              </Group>

              {playlists ? (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>Progresso Geral</Text>
                    <Text size="sm" c="dimmed">{globalPercentage.toFixed(0)}%</Text>
                  </Group>
                  <Progress
                    value={globalPercentage}
                    size="lg"
                    radius="xl"
                    color="green"
                    striped
                    animated={globalPercentage < 100}
                  />
                  <Text size="xs" c="dimmed" mt={5}>
                    Você completou {totals.read} de {totals.total} itens totais.
                  </Text>

                  <Button variant="light" mt="xs" onClick={() => navigate('/onboarding')}>
                    Continuar Trilhas
                  </Button>
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">Carregando Trilhas de Capacitação...</Text>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Shortcuts Section */}
        <Box>
          <Title order={4} mb="md" c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
            Acesso Rápido por Setor
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Paper withBorder p="md" radius="md" component="button" onClick={() => navigate('/pa')} style={{ cursor: 'pointer', textAlign: 'left', background: 'none' }}>
              <Group>
                <ThemeIcon color="blue" size="lg" radius="md">
                  <Activity size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Pronto Atendimento</Text>
                  <Text size="xs" c="dimmed">Guias e Convênios</Text>
                </Box>
              </Group>
            </Paper>

            <Paper withBorder p="md" radius="md" component="button" onClick={() => navigate('/ue-sus')} style={{ cursor: 'pointer', textAlign: 'left', background: 'none' }}>
              <Group>
                <ThemeIcon color="red" size="lg" radius="md">
                  <AlertCircle size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Urgência SUS</Text>
                  <Text size="xs" c="dimmed">Triagem e Atendimento</Text>
                </Box>
              </Group>
            </Paper>

            <Paper withBorder p="md" radius="md" component="button" onClick={() => navigate('/tuss')} style={{ cursor: 'pointer', textAlign: 'left', background: 'none' }}>
              <Group>
                <ThemeIcon color="teal" size="lg" radius="md">
                  <BookOpen size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Tabela TUSS</Text>
                  <Text size="xs" c="dimmed">Consulta Rápida de Códigos</Text>
                </Box>
              </Group>
            </Paper>
          </SimpleGrid>
        </Box>
      </Stack>
    </Container>
  );
};
