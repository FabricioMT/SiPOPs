import { useQuery } from '@tanstack/react-query';
import { 
  Container, Title, Text, Stack, Paper, Group, ThemeIcon, Button, 
  Breadcrumbs, Anchor, Center, Loader, Divider, Alert, Badge,
  ActionIcon, Tooltip
} from '@mantine/core';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, BookOpen, Info, Pencil } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { GuideEditModal } from './GuideEditModal';

interface GuideItem {
  id: number;
  title: string;
  content: string | null;
  order_index: number;
}

interface GuidesListProps {
  sectorLabel: string;
  sectorKey: string;
  basePath: string;
  sectorColor: string;
}

const PATIENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  externo: { label: 'Pacientes Externos', color: 'blue' },
  interno: { label: 'Pacientes Internos', color: 'teal' },
};

export const GuidesList = ({ sectorLabel, sectorKey, basePath, sectorColor }: GuidesListProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { patientType } = useParams<{ patientType: string }>();
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [selectedGuide, setSelectedGuide] = useState<GuideItem | null>(null);

  const isAdminOrGestor = user?.role === 'admin' || user?.role === 'gestor';

  const typeInfo = PATIENT_TYPE_LABELS[patientType ?? ''] ?? { label: patientType, color: 'gray' };

  const { data: guides, isLoading } = useQuery<GuideItem[]>({
    queryKey: ['spdata-guides', sectorKey, patientType],
    queryFn: async () => {
      const r = await apiClient.get('/spdata-guides', {
        params: { sector: sectorKey, patient_type: patientType }
      });
      return r.data;
    },
    enabled: !!patientType
  });

  const breadcrumbs = [
    { title: sectorLabel, href: basePath },
    { title: typeInfo.label, href: '#' },
  ].map((item, i) => (
    <Anchor key={i} href={item.href} onClick={(e) => { e.preventDefault(); if (item.href !== '#') navigate(item.href); }}>
      {item.title}
    </Anchor>
  ));

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Breadcrumbs>{breadcrumbs}</Breadcrumbs>

        <Group gap="md">
          <Button
            variant="subtle"
            leftSection={<ChevronLeft size={16} />}
            onClick={() => navigate(basePath)}
          >
            Voltar
          </Button>
          <Stack gap={2}>
            <Group gap="sm">
              <Title order={1} c={sectorColor}>{typeInfo.label}</Title>
              <Badge color={typeInfo.color} variant="light" size="lg">{sectorLabel}</Badge>
            </Group>
            <Text c="dimmed">Guias do sistema SPDATA para este tipo de atendimento</Text>
          </Stack>
        </Group>

        {sectorKey !== 'ue_sus' && (
          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-blue-light)">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text fw={700} c="blue">Protocolos de Convênios</Text>
                <Text size="sm" c="dimmed">Acesse as instruções específicas de cada plano de saúde para {typeInfo.label.toLowerCase()}.</Text>
              </Stack>
              <Button 
                variant="filled" 
                color="blue" 
                leftSection={<BookOpen size={16} />}
                onClick={() => navigate(`${location.pathname}/health-plans`)}
              >
                Ver Convênios
              </Button>
            </Group>
          </Paper>
        )}

        <Divider />

        {isLoading ? (
          <Center py="xl"><Loader size="lg" type="dots" color={sectorColor} /></Center>
        ) : guides?.length === 0 ? (
          <Alert icon={<Info size={16} />} color="gray" title="Sem guias ainda">
            Não há guias cadastrados para este setor e tipo de atendimento. Em breve serão adicionados.
          </Alert>
        ) : (
          <Stack gap="md">
            {guides?.map((guide, idx) => (
              <Paper key={guide.id} withBorder radius="md" p="lg" shadow="sm" style={{ position: 'relative' }}>
                {isAdminOrGestor && (
                  <Tooltip label="Editar este passo">
                    <ActionIcon 
                      variant="subtle" 
                      color="gray" 
                      style={{ position: 'absolute', top: 10, right: 10 }}
                      onClick={() => {
                        setSelectedGuide(guide);
                        openEdit();
                      }}
                    >
                      <Pencil size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                
                <Group gap="md" align="flex-start">
                  <ThemeIcon size={40} radius="md" color={typeInfo.color} variant="light">
                    <BookOpen size={20} />
                  </ThemeIcon>
                  <Stack gap={8} style={{ flex: 1 }}>
                    <Group gap="sm">
                      <Badge variant="outline" color="gray" size="sm">Passo {idx + 1}</Badge>
                      <Text fw={700} size="md">{guide.title}</Text>
                    </Group>
                    {guide.content && (
                      <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                        {guide.content}
                      </Text>
                    )}
                  </Stack>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>

      <GuideEditModal 
        opened={editOpened} 
        onClose={closeEdit} 
        guide={selectedGuide} 
      />
    </Container>
  );
};
