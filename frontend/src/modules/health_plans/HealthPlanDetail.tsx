import { useQuery } from '@tanstack/react-query';
import { Title, Text, Loader, Center, Container, Grid, Card, Group, Button, Breadcrumbs, Anchor, Paper } from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, ExternalLink } from 'lucide-react';
import apiClient from '../../api/client';

interface HealthPlan {
  id: number;
  name: string;
  logo_path: string | null;
}

interface SOP {
  id: number;
  title: string;
  category: string;
  current_version_number: number;
}

export function HealthPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: plan, isLoading: isLoadingPlan } = useQuery<HealthPlan>({
    queryKey: ['health-plan', id],
    queryFn: async () => {
      const response = await apiClient.get(`/health-plans/${id}`);
      return response.data;
    },
  });

  const { data: sops, isLoading: isLoadingSops } = useQuery<SOP[]>({
    queryKey: ['health-plan-sops', id],
    queryFn: async () => {
      const response = await apiClient.get(`/health-plans/${id}/sops`);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoadingPlan || isLoadingSops) {
    return (
      <Center h="50vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (!plan) {
    return (
      <Container>
        <Text color="red">Plano de saúde não encontrado.</Text>
        <Button onClick={() => navigate('/health-plans')}>Voltar</Button>
      </Container>
    );
  }

  const items = [
    { title: 'Planos de Saúde', href: '/health-plans' },
    { title: plan.name, href: `/health-plans/${id}` },
  ].map((item, index) => (
    <Anchor href={item.href} key={index} onClick={(e) => { e.preventDefault(); navigate(item.href); }}>
      {item.title}
    </Anchor>
  ));

  return (
    <Container size="lg">
      <Breadcrumbs mb="xl">{items}</Breadcrumbs>

      <Group justify="space-between" mb="xl">
        <Group>
          <Button 
            variant="subtle" 
            leftSection={<ChevronLeft size={16} />} 
            onClick={() => navigate('/health-plans')}
          >
            Voltar
          </Button>
          <Title order={2} c="mediBlue">{plan.name}</Title>
        </Group>
      </Group>

      <Title order={4} mb="md">Procedimentos e POPs Disponíveis</Title>

      {sops?.length === 0 ? (
        <Paper p="xl" withBorder style={{ backgroundColor: '#f9fafb' }}>
          <Text ta="center" c="dimmed">Nenhum procedimento cadastrado para este plano no momento.</Text>
        </Paper>
      ) : (
        <Grid>
          {sops?.map((sop) => (
            <Grid.Col key={sop.id} span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Group wrap="nowrap">
                    <div style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 8, 
                      backgroundColor: '#e7f5ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#228be6'
                    }}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <Text fw={600} size="md" lineClamp={1}>{sop.title}</Text>
                      <Text size="xs" c="dimmed">{sop.category} • Versão {sop.current_version_number}</Text>
                    </div>
                  </Group>
                  <Button 
                    variant="light" 
                    size="xs" 
                    rightSection={<ExternalLink size={14} />}
                    onClick={() => navigate(`/sops/${sop.id}`)}
                  >
                    Ver POP
                  </Button>
                </Group>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </Container>
  );
}
