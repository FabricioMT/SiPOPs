import { useQuery } from '@tanstack/react-query';
import { Title, Text, Container, Grid, Card, Progress, Group, Badge, Stack, Center, Loader, Alert } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { Info, BookOpen } from 'lucide-react';
import { onboardingApi } from '../../api/onboarding';

export const OnboardingList = () => {
  const navigate = useNavigate();

  const { data: playlists, isLoading, error } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => onboardingApi.getPlaylists()
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

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1} c="mediBlue">Trilhas de Capacitação</Title>
          <Text c="dimmed">
            Acompanhe seu progresso nas trilhas de treinamento e procedimentos obrigatórios.
          </Text>
        </Stack>

        {!playlists || playlists.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">Nenhuma trilha de treinamento disponível no momento.</Text>
          </Center>
        ) : (
          <Grid>
            {playlists.map((playlist) => (
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
            <Text size="sm" fw={700} c={isCompleted ? 'green' : 'mediBlue'}>
              {percentage.toFixed(0)}%
            </Text>
          </Group>
          <Progress 
            value={percentage} 
            color={isCompleted ? 'green' : 'mediBlue'} 
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
