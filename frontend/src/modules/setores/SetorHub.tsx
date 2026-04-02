import { useQuery } from '@tanstack/react-query';
import { Container, Title, Text, SimpleGrid, Card, Group, Stack, Badge, Center, Loader, ThemeIcon } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck } from 'lucide-react';
import apiClient from '../../api/client';

interface SetorHubProps {
  title: string;
  description: string;
  sector: string;        // 'ue_sus' | 'pa' | 'portaria'
  basePath: string;      // e.g. '/secretaria-ue-sus'
  icon: React.ReactNode;
  color: string;
}

export const SetorHub = ({ title, description, sector, basePath, icon, color }: SetorHubProps) => {
  const navigate = useNavigate();

  const { data: externGuides, isLoading: loadingExtern } = useQuery({
    queryKey: ['spdata-guides', sector, 'externo'],
    queryFn: async () => {
      const r = await apiClient.get('/spdata-guides', { params: { sector, patient_type: 'externo' } });
      return r.data;
    }
  });

  const { data: internoGuides, isLoading: loadingInterno } = useQuery({
    queryKey: ['spdata-guides', sector, 'interno'],
    queryFn: async () => {
      const r = await apiClient.get('/spdata-guides', { params: { sector, patient_type: 'interno' } });
      return r.data;
    }
  });

  const isLoading = loadingExtern || loadingInterno;

  const patientTypes = [
    {
      type: 'externo',
      label: 'Pacientes Externos',
      subtitle: 'Atendimento ambulatorial e consultas',
      count: externGuides?.length ?? 0,
      icon: <Users size={28} />,
      colorScheme: 'blue',
    },
    {
      type: 'interno',
      label: 'Pacientes Internos',
      subtitle: 'Internação e procedimentos hospitalares',
      count: internoGuides?.length ?? 0,
      icon: <UserCheck size={28} />,
      colorScheme: 'teal',
    },
  ];

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group gap="md" align="flex-start">
          <ThemeIcon size={56} radius="xl" color={color} variant="light">
            {icon}
          </ThemeIcon>
          <Stack gap={4}>
            <Title order={1} c={color}>{title}</Title>
            <Text c="dimmed" size="md">{description}</Text>
          </Stack>
        </Group>

        <Text size="sm" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.05em' }}>
          Selecione o tipo de atendimento
        </Text>

        {isLoading ? (
          <Center py="xl"><Loader size="lg" color={color} type="dots" /></Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
            {patientTypes.map((pt) => (
              <Card
                key={pt.type}
                shadow="md"
                radius="lg"
                padding="xl"
                withBorder
                style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onClick={() => navigate(`${basePath}/${pt.type}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <Stack gap="md">
                  <Group justify="space-between">
                    <ThemeIcon size={48} radius="md" color={pt.colorScheme} variant="light">
                      {pt.icon}
                    </ThemeIcon>
                    <Badge color={pt.colorScheme} variant="light" size="lg">
                      {pt.count} guia{pt.count !== 1 ? 's' : ''}
                    </Badge>
                  </Group>

                  <Stack gap={4}>
                    <Text fw={700} size="lg">{pt.label}</Text>
                    <Text c="dimmed" size="sm">{pt.subtitle}</Text>
                  </Stack>

                  <Text size="xs" c={`${pt.colorScheme}.6`} fw={600}>
                    Acessar guias →
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
};
