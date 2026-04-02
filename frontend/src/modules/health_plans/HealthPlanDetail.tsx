import { useQuery } from '@tanstack/react-query';
import { Title, Text, Loader, Center, Container, Grid, Card, Group, Button, Breadcrumbs, Anchor, Paper, Stack, ThemeIcon, Divider, SimpleGrid } from '@mantine/core';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, FileText, ExternalLink, Users, UserCheck, BookOpen } from 'lucide-react';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import apiClient from '../../api/client';
import { ProtocolModal } from './ProtocolModal';

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

interface Protocol {
  id: number;
  title: string;
  content: string | null;
  patient_type: 'externo' | 'interno';
  images_json: string | null;
}

export function HealthPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);

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

  const { data: protocols, isLoading: isLoadingProtocols } = useQuery<Protocol[]>({
    queryKey: ['health-plan-protocols', id],
    queryFn: async () => {
      const response = await apiClient.get(`/health-plans/${id}/protocols`);
      return response.data;
    },
    enabled: !!id,
  });

  const getSectoInfo = () => {
    const parts = location.pathname.split('/');
    const sector = parts[1] || '';
    const type = parts[2] || '';
    
    let sectorName = 'Setor';
    if (sector.includes('pa')) sectorName = 'Pronto Atendimento';
    else if (sector.includes('portaria')) sectorName = 'Portaria';
    
    const typeName = type === 'externo' ? 'Externo' : 'Interno';
    
    return { sectorName, typeName, baseSectorPath: `/${sector}/${type}`, basePlansPath: `/${sector}/${type}/health-plans` };
  };

  const { sectorName, typeName, baseSectorPath, basePlansPath } = getSectoInfo();

  if (isLoadingPlan || isLoadingSops || isLoadingProtocols) {
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
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </Container>
    );
  }

  const items = [
    { title: sectorName, href: `/${location.pathname.split('/')[1]}` },
    { title: typeName, href: baseSectorPath },
    { title: 'Convênios', href: basePlansPath },
    { title: plan.name, href: '#' },
  ].map((item, index) => (
    <Anchor href={item.href} key={index} onClick={(e) => { e.preventDefault(); if (item.href !== '#') navigate(item.href); }}>
      {item.title}
    </Anchor>
  ));

  const handleOpenProtocol = (type: 'externo' | 'interno') => {
    const protocol = protocols?.find(p => p.patient_type === type);
    if (protocol) {
      setSelectedProtocol(protocol);
      open();
    }
  };

  return (
    <Container size="lg">
      <Breadcrumbs mb="xl">{items}</Breadcrumbs>

      <Group justify="space-between" mb="xl">
        <Group>
          <Button 
            variant="subtle" 
            leftSection={<ChevronLeft size={16} />} 
            onClick={() => navigate(basePlansPath)}
          >
            Voltar
          </Button>
          <Title order={2} c="mediBlue">{plan.name}</Title>
        </Group>
      </Group>

      {/* Protocol Section */}
      <Stack mb="xl">
        <Group gap="xs">
          <ThemeIcon variant="light" color="blue" radius="md">
            <BookOpen size={20} />
          </ThemeIcon>
          <Title order={4}>Protocolos de Atendimento</Title>
        </Group>
        <Text size="sm" c="dimmed">Instruções específicas para abertura de guias e recepção</Text>
        
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Card 
            withBorder 
            radius="md" 
            p="md" 
            style={{ 
              cursor: protocols?.some(p => p.patient_type === 'externo') ? 'pointer' : 'default',
              opacity: protocols?.some(p => p.patient_type === 'externo') ? 1 : 0.6 
            }}
            onClick={() => handleOpenProtocol('externo')}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm">
                <ThemeIcon radius="xl" size="lg" color="blue" variant="light">
                  <Users size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={700}>Paciente Externo</Text>
                  <Text size="xs" c="dimmed">Consultas e Exames</Text>
                </div>
              </Group>
              <Button 
                variant="light" 
                size="xs" 
                disabled={!protocols?.some(p => p.patient_type === 'externo')}
              >
                {protocols?.some(p => p.patient_type === 'externo') ? 'Ver Protocolo' : 'Não cadastrado'}
              </Button>
            </Group>
          </Card>

          <Card 
            withBorder 
            radius="md" 
            p="md"
            style={{ 
              cursor: protocols?.some(p => p.patient_type === 'interno') ? 'pointer' : 'default',
              opacity: protocols?.some(p => p.patient_type === 'interno') ? 1 : 0.6 
            }}
            onClick={() => handleOpenProtocol('interno')}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm">
                <ThemeIcon radius="xl" size="lg" color="teal" variant="light">
                  <UserCheck size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={700}>Paciente Interno</Text>
                  <Text size="xs" c="dimmed">Internação e Urgência</Text>
                </div>
              </Group>
              <Button 
                variant="light" 
                size="xs" 
                color="teal"
                disabled={!protocols?.some(p => p.patient_type === 'interno')}
              >
                {protocols?.some(p => p.patient_type === 'interno') ? 'Ver Protocolo' : 'Não cadastrado'}
              </Button>
            </Group>
          </Card>
        </SimpleGrid>
      </Stack>

      <Divider my="xl" label="Procedimentos e POPs Disponíveis" labelPosition="center" />

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
                    <ThemeIcon variant="light" color="mediBlue" size="lg">
                      <FileText size={24} />
                    </ThemeIcon>
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

      <ProtocolModal 
        opened={opened} 
        onClose={close} 
        protocol={selectedProtocol}
      />
    </Container>
  );
}
