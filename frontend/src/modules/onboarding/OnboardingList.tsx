import { useQuery } from '@tanstack/react-query';
import { Container, Title, Text, Paper, Group, Stack, Button, Progress, Badge, Center, Loader, Alert, Card, Grid, ThemeIcon } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { Info, BookOpen, Star } from 'lucide-react';
import { onboardingApi } from '../../api/onboarding';

export const OnboardingList = () => {
  const navigate = useNavigate();

  const { data: playlists, isLoading, error } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => onboardingApi.getPlaylists()
  });

  const { data: allProgress } = useQuery({
    queryKey: ['my-total-progress'],
    queryFn: () => onboardingApi.getMyProgress(),
    enabled: !!playlists
  });

  if (isLoading) return <Center h="100vh"><Loader /></Center>;
  
  if (error) {
    return (
      <Container size="lg" py="xl">
        <Alert icon={<Info size={16} />} title="Erro" color="red">
          Não foi possível carregar as trilhas de treinamento.
        </Alert>
      </Container>
    );
  }

  const otherPlaylists = playlists?.filter(p => p.id !== 1) || [];

  // Agregando progresso total real (Soma de todos os lidos / Soma de todos os totais)
  const totals = allProgress?.reduce((acc, p) => ({
    read: acc.read + (p.read_count || 0),
    total: acc.total + (p.total_count || 0)
  }), { read: 0, total: 0 }) || { read: 0, total: 0 };

  const percentage = totals.total > 0 ? (totals.read / totals.total) * 100 : 0;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Stack gap="md">
          <Stack gap="xs">
            <Title order={1} c="sipopsGreen">Trilhas de Capacitação</Title>
            <Text c="dimmed">
              Acompanhe seu progresso nas trilhas de treinamento e procedimentos obrigatórios.
            </Text>
          </Stack>

          {/* New Global Progress Section */}
          <Paper withBorder p="xl" radius="lg" shadow="sm" bg="var(--mantine-color-gray-0)">
            <Stack gap="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={700} size="lg" c="sipopsGreen">Progresso Geral da Trilha</Text>
                  <Text fw={800} size="xl" c="sipopsGreen">{percentage.toFixed(0)}%</Text>
                </Group>
                <Progress 
                  value={percentage} 
                  size="xl" 
                  radius="xl" 
                  color="sipopsGreen" 
                  striped 
                  animated={percentage < 100} 
                />
              </Stack>

              <Stack gap="xs" mt="xs">
                <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>Acesso Obrigatório</Text>
                <Paper 
                  withBorder 
                  p="md" 
                  radius="md" 
                  style={{ 
                    cursor: 'pointer', 
                    transition: 'border-color 0.2s ease, background-color 0.2s ease'
                  }}
                  onClick={() => navigate('/sops/1')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--mantine-color-sipopsGreen-outlineHover)';
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-blue-0)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--mantine-color-default-border)';
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-body)';
                  }}
                >
                  <Group wrap="nowrap" align="center">
                    <ThemeIcon 
                      size="xl" 
                      radius="xl" 
                      variant="light" 
                      color="sipopsGreen"
                      style={{ flexShrink: 0 }}
                    >
                      <Star size={20} fill="currentColor" />
                    </ThemeIcon>
                    
                    <Stack gap={4} style={{ flexGrow: 1 }}>
                      <Title order={5} c="sipopsGreen">Normas de Atendimento Geral</Title>
                      <Group gap="xs">
                        <Badge size="xs" color="gray" variant="outline">
                          Procedimento Geral
                        </Badge>
                        <Badge size="xs" color="blue" variant="light">
                          Essencial
                        </Badge>
                      </Group>
                    </Stack>
                    
                    <Button variant="light" size="sm" color="blue">
                      Ver Procedimento
                    </Button>
                  </Group>
                </Paper>
              </Stack>

              <Text size="xs" c="dimmed" ta="right">
                {totals.total > 0 ? `${totals.read} de ${totals.total} procedimentos totais realizados` : 'Carregando...'}
              </Text>
            </Stack>
          </Paper>
        </Stack>

        <Title order={2} size="h3" mt="xl">Capacitações por Convênio</Title>

        {otherPlaylists.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">Nenhuma trilha complementar disponível no momento.</Text>
          </Center>
        ) : (
          <Grid>
            {otherPlaylists.map((playlist) => (
              <Grid.Col key={playlist.id} span={{ base: 12, sm: 6, md: 4 }}>
                <PlaylistCard playlist={playlist} onClick={() => navigate(`/onboarding/${playlist.id}`)} />
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
};

// Componente helper para buscar o progresso dentro do próprio card
const PlaylistCard = ({ playlist, onClick }: { playlist: any, onClick: () => void }) => {
  const { data: progress } = useQuery({
    queryKey: ['playlist-progress', playlist.id],
    queryFn: () => onboardingApi.getPlaylistProgress(playlist.id)
  });

  const percentage = progress?.percentage || 0;
  const isCompleted = percentage === 100;

  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius="md" 
      withBorder 
      style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)';
      }}
    >
      <Stack justify="space-between" h="100%">
        <Stack gap="xs">
          <Group justify="space-between" align="start" wrap="nowrap">
            <Title order={4} lineClamp={2}>{playlist.title}</Title>
            {isCompleted && <Badge color="green">Concluído</Badge>}
          </Group>
          
          <Text size="sm" c="dimmed" lineClamp={3} style={{ minHeight: '60px' }}>
            {playlist.description || "Nenhuma descrição fornecida para esta trilha de procedimentos."}
          </Text>
        </Stack>

        <Stack gap="xs" mt="md">
          <Group justify="space-between">
            <Group gap={6} c="dimmed">
              <BookOpen size={14} />
              <Text size="xs" fw={500}>Progresso</Text>
            </Group>
            <Text size="sm" fw={700} c={isCompleted ? 'green' : 'sipopsGreen'}>
              {percentage.toFixed(0)}%
            </Text>
          </Group>
          <Progress 
            value={percentage} 
            color={isCompleted ? 'green' : 'sipopsGreen'} 
            size="md" 
            radius="xl" 
          />
          <Text size="xs" c="dimmed" ta="right">
            {progress ? `${progress.read_count} de ${progress.total_count} lidos` : 'Carregando progresso...'}
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
};
