import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Title, Text, Loader, Center, Container, Paper, Stack, 
  Button, Group, Divider, Badge, Breadcrumbs, Anchor, Alert, ThemeIcon, ActionIcon, Tooltip, Image, Box
} from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Clock, ShieldCheck, CheckCircle2, Pencil, BookOpen } from 'lucide-react';
import apiClient from '../../api/client';
import { onboardingApi } from '../../api/onboarding';
import { useAuthStore } from '../../store/authStore';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { GuideEditModal } from '../setores/GuideEditModal';
import { useReadingTimer } from '../../hooks/useReadingTimer';

interface SOPDetail {
  id: number;
  title: string;
  category: string;
  content: string;
  status: string;
  current_version_number: number;
  updated_at: string;
  min_reading_seconds: number;
  latest_version?: {
    content: string;
    version_number: number;
    created_at: string;
  };
}

export const SOPDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [selectedSop, setSelectedSop] = useState<any>(null);

  const isAdminOrGestor = user?.roles?.includes('admin') || user?.roles?.includes('gestor');

  // Fetch dynamic items for this SOP
  const { data: dynamicItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['sop-items', id],
    queryFn: () => onboardingApi.getItems({ sop_id: Number(id) }),
    enabled: !!id,
  });

  const { data: sop, isLoading, error } = useQuery<SOPDetail>({
    queryKey: ['sop', id],
    queryFn: async () => {
      const response = await apiClient.get(`/sops/${id}`);
      return response.data;
    },
  });

  const { data: readingStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['sop-reading-status', id],
    queryFn: async () => {
      const response = await apiClient.get(`/sops/${id}/reading-status`);
      return response.data;
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/sops/${id}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop-reading-status', id] });
      queryClient.invalidateQueries({ queryKey: ['playlist-progress'] });
    },
  });

  const { isReady, remainingSeconds } = useReadingTimer(id || '', sop?.min_reading_seconds || 30);

  const isRead = readingStatus?.has_read_current_version || acknowledgeMutation.isSuccess;

  if (isLoading || isLoadingStatus || isLoadingItems) return <Center h="100vh"><Loader /></Center>;
  
  if (error || !sop) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<Info size={16} />} title="Erro" color="red">
          Não foi possível carregar o procedimento. Ele pode ter sido removido ou você não tem permissão.
        </Alert>
        <Button leftSection={<ArrowLeft size={16} />} variant="subtle" mt="md" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </Container>
    );
  }

  const isGeneralSOP = sop.category.toLowerCase().includes('normas') || sop.category.toLowerCase().includes('geral') || sop.id === 1;

  const breadcrumbItems = [
    { title: 'Dashboard', href: '/' },
    { 
      title: isGeneralSOP ? 'Trilhas de Capacitação' : 'Base de Conhecimento', 
      href: isGeneralSOP ? '/onboarding' : '#' 
    },
    { title: 'Procedimentos', href: '#' },
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

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

        <Group justify="space-between" align="flex-start">
          <Stack gap="xs" style={{ flex: 1 }}>
            <Group gap="sm" align="center">
              <Title order={1}>{sop.title}</Title>
              {isAdminOrGestor && (
                <Tooltip label="Editar este procedimento">
                  <ActionIcon 
                    variant="subtle" 
                    color="gray" 
                    onClick={() => {
                      setSelectedSop({
                        id: sop.id,
                        sop_id: sop.id,
                        title: sop.title,
                        content: sop.latest_version?.content || sop.content,
                        order_index: 0
                      });
                      openEdit();
                    }}
                  >
                    <Pencil size={18} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
            <Group gap="xs">
              <Badge color="blue" variant="light">{sop.category}</Badge>
              <Badge color="gray" variant="outline">Versão {sop.current_version_number}</Badge>
              <Group gap={4} ml="xs">
                <Clock size={14} color="gray" />
                <Text size="xs" c="dimmed">
                  Atualizado em: {new Date(sop.updated_at).toLocaleDateString('pt-BR')}
                </Text>
              </Group>
            </Group>
          </Stack>
          
          <Button 
            leftSection={<ArrowLeft size={16} />} 
            variant="default" 
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
        </Group>

        <Paper withBorder p={0} radius="md" shadow="sm" style={{ overflow: 'hidden' }}>
          {dynamicItems && dynamicItems.length > 0 ? (
            <Stack gap={0}>
              <Box p="md" bg="var(--mantine-color-gray-0)">
                <Group gap="xs">
                  <BookOpen size={18} color="#046c44" />
                  <Text fw={700} c="sipopsGreen">Guia de Treinamento</Text>
                </Group>
              </Box>
              <Stack gap="xl" p="xl">
                {dynamicItems.map((item, idx) => (
                  <Paper key={item.id} withBorder radius="md" p="lg" style={{ position: 'relative' }}>
                    {isAdminOrGestor && (
                      <ActionIcon 
                        variant="subtle" 
                        color="gray" 
                        size="sm"
                        style={{ position: 'absolute', top: 10, right: 10 }}
                        onClick={() => {
                          setSelectedSop({
                            id: Number(id),
                            item_id: item.id,
                            sop_id: Number(id),
                            title: item.title,
                            content: item.content,
                            order_index: item.order_index,
                            image_path: item.image_path,
                            sector_slug: 'general'
                          });
                          openEdit();
                        }}
                      >
                        <Pencil size={14} />
                      </ActionIcon>
                    )}
                    <Group gap="md" align="flex-start">
                      <ThemeIcon size={32} radius="md" color="sipopsGreen" variant="light">
                        <Text fw={700} size="xs">{idx + 1}</Text>
                      </ThemeIcon>
                      <Stack gap={8} style={{ flex: 1 }}>
                        <Text fw={700}>{item.title}</Text>
                        {item.image_path && (
                          <Image 
                            src={item.image_path} 
                            radius="md" 
                            maw={500}
                            style={{ border: '1px solid #eee' }} 
                          />
                        )}
                        <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                          {item.content}
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Stack gap="md" p="xl">
              <Group gap="xs">
                <BookOpen size={20} color="#046c44" />
                <Text fw={700} size="lg">Documento Original</Text>
              </Group>
              <Divider />
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sop.latest_version?.content || sop.content }} 
              />
            </Stack>
          )}
        </Paper>

        <Divider />

        <Paper
          p="xl"
          radius="lg"
          withBorder
          style={{
            borderColor: isRead ? '#bbf7d0' : '#bfdbfe',
            background: isRead ? '#f0fdf4' : '#eff6ff',
            textAlign: 'center',
          }}
        >
          <Stack align="center" gap="md">
            <ThemeIcon
              size={64}
              radius="xl"
              color={isRead ? 'green' : 'blue'}
              variant="light"
            >
              {isRead ? <ShieldCheck size={32} /> : <CheckCircle2 size={32} />}
            </ThemeIcon>

            {isRead ? (
              <>
                <Stack gap={4} align="center">
                  <Text fw={700} size="lg" c="green.8">Treinamento Confirmado ✓</Text>
                  <Text size="sm" c="dimmed">
                    Você confirmou o recebimento destas instruções em {readingStatus?.read_at ? new Date(readingStatus.read_at).toLocaleString('pt-BR') : new Date().toLocaleDateString('pt-BR')}.
                  </Text>
                </Stack>
                <Badge color="green" size="lg" variant="light" leftSection={<ShieldCheck size={14} />}>
                  Registrado no sistema
                </Badge>
              </>
            ) : (
              <>
                <Stack gap={4} align="center">
                  <Text fw={700} size="lg" c="blue.8">Confirmar Recebimento</Text>
                  <Text size="sm" c="dimmed" maw={420}>
                    Ao clicar abaixo, você confirma que leu e compreendeu todas as instruções 
                    deste procedimento operacional. Isso será registrado no seu progresso.
                  </Text>
                </Stack>

                {!isReady && (
                  <Alert 
                    icon={<Clock size={16} />} 
                    color="orange" 
                    variant="light" 
                    py="xs"
                    style={{ width: '100%', maxWidth: 420 }}
                  >
                    <Text size="sm" fw={500}>
                      Continue estudando por mais <strong>{remainingSeconds} segundos</strong> para habilitar a confirmação.
                    </Text>
                  </Alert>
                )}

                <Button
                  size="lg"
                  color={isReady ? "blue" : "gray"}
                  leftSection={isReady ? <ShieldCheck size={20} /> : <Clock size={20} />}
                  loading={acknowledgeMutation.isPending || isLoadingStatus}
                  onClick={() => isReady && acknowledgeMutation.mutate()}
                  disabled={!isReady}
                  style={{ minWidth: 280 }}
                >
                  {isReady ? "✅ Li e Estou Ciente" : "Estudo em Andamento..."}
                </Button>
              </>
            )}
          </Stack>
        </Paper>
      </Stack>

      <GuideEditModal
        opened={editOpened}
        onClose={closeEdit}
        guide={selectedSop}
      />
    </Container>
  );
};
