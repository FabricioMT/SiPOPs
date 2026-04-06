import { useQuery } from '@tanstack/react-query';
import { Title, Text, Container, Paper, Progress, Group, Badge, Stack, Center, Loader, Alert, Button, Breadcrumbs, Anchor, ThemeIcon } from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { Info, ArrowLeft, BookOpen } from 'lucide-react';
import { onboardingApi } from '../../api/onboarding';
import type { PlaylistDetailResponse } from '../../api/onboarding';

export const OnboardingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: playlist, isLoading: isLoadingPlaylist, error: playlistError } = useQuery<PlaylistDetailResponse>({
    queryKey: ['playlist', id],
    queryFn: () => onboardingApi.getPlaylistDetail(id!)
  });

  const { data: progress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['playlist-progress', id],
    queryFn: () => onboardingApi.getPlaylistProgress(id!)
  });

  const isLoading = isLoadingPlaylist || isLoadingProgress;

  if (isLoading) return <Center h="100vh"><Loader /></Center>;

  if (playlistError || !playlist) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<Info size={16} />} title="Erro" color="red">
          Não foi possível carregar os detalhes da trilha de treinamento.
        </Alert>
        <Button leftSection={<ArrowLeft size={16} />} variant="subtle" mt="md" onClick={() => navigate('/onboarding')}>
          Voltar para Trilhas
        </Button>
      </Container>
    );
  }

  const items = [
    { title: 'Dashboard', href: '/' },
    { title: 'Trilhas de Capacitação', href: '/onboarding' },
    { title: playlist.title, href: '#' },
  ].map((item, index) => (
    <Anchor href={item.href} key={index} onClick={(e) => {
      if (item.href !== '#') {
        e.preventDefault();
        navigate(item.href);
      }
    }}>
      {item.title}
    </Anchor>
  ));

  const percentage = progress?.percentage || 0;
  const sops = playlist.sops || [];

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Breadcrumbs>{items}</Breadcrumbs>

        <Group justify="space-between" align="flex-start">
          <Stack gap="xs" style={{ flex: 1 }}>
            <Title order={1} c="mediBlue">{playlist.title}</Title>
            <Text c="dimmed" size="lg">
              {playlist.description || "Nenhuma descrição detalhada disponível."}
            </Text>
          </Stack>
          <Button 
            leftSection={<ArrowLeft size={16} />} 
            variant="default" 
            onClick={() => navigate('/onboarding')}
          >
            Voltar
          </Button>
        </Group>

        <Paper withBorder p="lg" radius="md" bg="var(--mantine-color-gray-0)">
          <Stack gap="sm">
            <Group justify="space-between">
              <Group gap="xs">
                <BookOpen size={20} color="var(--mantine-color-mediBlue-6)" />
                <Title order={3}>Progresso da Trilha</Title>
              </Group>
              <Badge size="lg" color={percentage === 100 ? 'green' : 'mediBlue'}>
                {percentage.toFixed(0)}%
              </Badge>
            </Group>
            
            <Progress 
              value={percentage} 
              color={percentage === 100 ? 'green' : 'mediBlue'} 
              size="xl" 
              radius="xl" 
            />
            {progress && (
              <Text ta="center" size="sm" c="dimmed" mt="xs">
                Você concluiu {progress.read_count} de {progress.total_count} procedimentos obrigatórios.
              </Text>
            )}
          </Stack>
        </Paper>

        <Stack gap="md">
          <Title order={3}>Procedimentos e Treinamentos ({sops.length})</Title>
          
          {sops.length === 0 ? (
            <Alert color="blue" title="Trilha vazia">
              Esta trilha ainda não possui nenhum procedimento ou guia adicionado pelos gestores.
            </Alert>
          ) : (
            <Stack gap="sm">
              {sops.map((item, index) => {
                const isProtocol = !!item.protocol_id;
                const title = isProtocol ? item.protocol?.title : item.sop?.title;
                const category = isProtocol ? "Guia de Convênio" : (item.sop?.category || 'Geral');
                const path = isProtocol 
                  ? `/health-plans/${item.protocol?.health_plan_id}/guide/${item.protocol?.patient_type}`
                  : `/sops/${item.sop?.id}`;

                return (
                  <Paper 
                    key={index}
                    withBorder 
                    p="md" 
                    radius="md" 
                    style={{ 
                      cursor: 'pointer', 
                      transition: 'border-color 0.2s ease, background-color 0.2s ease'
                    }}
                    onClick={() => navigate(path)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--mantine-color-mediBlue-outlineHover)';
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
                        color={isProtocol ? "teal" : "mediBlue"}
                        style={{ flexShrink: 0 }}
                      >
                        {index + 1}
                      </ThemeIcon>
                      
                      <Stack gap={4} style={{ flexGrow: 1 }}>
                        <Title order={5} c="mediBlue">{title}</Title>
                        <Group gap="xs">
                          <Badge size="xs" color={isProtocol ? "teal" : "gray"} variant="outline">
                            {category}
                          </Badge>
                          {!isProtocol && (
                            <Badge size="xs" color="blue" variant="light">
                              Versão {item.sop?.current_version_number || 1}
                            </Badge>
                          )}
                        </Group>
                      </Stack>
                      
                      <Button variant="light" size="sm" color={isProtocol ? "teal" : "blue"}>
                        {isProtocol ? "Ver Guia" : "Ver SOP"}
                      </Button>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Container>
  );
};
