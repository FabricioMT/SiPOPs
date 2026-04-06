import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Title, Text, Stack, Paper, Group, ThemeIcon, Button,
  Breadcrumbs, Anchor, Center, Loader, Alert, Badge, Divider,
  Image, Box, Card
} from '@mantine/core';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, BookOpen, Info, CheckCircle2, AlertCircle,
  ExternalLink, Users, UserCheck, Camera, ListChecks, ShieldCheck
} from 'lucide-react';
import apiClient from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuideStep {
  section?: string;        // Optional section label (e.g. "Primeiros Passos")
  image?: string;          // Image URL
  instructions: string[];  // Array of instruction lines
}

interface Protocol {
  id: number;
  title: string;
  content: string | null;  // JSON string of GuideStep[]
  patient_type: 'externo' | 'interno';
  images_json: string | null;
  health_plan_id: number;
}

interface HealthPlan {
  id: number;
  name: string;
  logo_path: string | null;
  external_portal_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSteps(content: string | null): GuideStep[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed as GuideStep[];
  } catch {
    // fallback: treat as plain text step
    return [{ instructions: content.split('\n').filter(Boolean) }];
  }
  return [];
}



// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  stepNumber,
  totalSteps,
}: {
  step: GuideStep;
  stepNumber: number;
  totalSteps: number;
}) {
  const isLast = stepNumber === totalSteps;

  return (
    <Paper
      withBorder
      radius="lg"
      p={0}
      shadow="sm"
      style={{ overflow: 'hidden', position: 'relative' }}
    >
      {/* Step header bar */}
      <Box
        style={{
          background: 'linear-gradient(135deg, #1a6fc4 0%, #1098ad 100%)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Box
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isLast ? (
            <CheckCircle2 size={20} color="white" />
          ) : (
            <Text fw={700} c="white" size="sm">{stepNumber}</Text>
          )}
        </Box>
        <Text fw={600} c="white" size="sm">
          {isLast ? 'Finalização' : `Passo ${stepNumber} de ${totalSteps - 1}`}
        </Text>
        {step.section && (
          <Badge
            ml="auto"
            color="rgba(255,255,255,0.2)"
            variant="filled"
            size="sm"
            style={{ color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}
          >
            {step.section}
          </Badge>
        )}
      </Box>

      {/* Content */}
      <Stack gap={0}>
        {/* Screenshot */}
        {step.image && (
          <Box style={{ background: '#f8fafc', borderBottom: '1px solid #e8edf2', padding: '16px 20px' }}>
            <Group gap="xs" mb={10}>
              <Camera size={14} color="#94a3b8" />
              <Text size="xs" c="dimmed" fw={500}>Tela de referência</Text>
            </Group>
            <Image
              src={step.image}
              alt={`Passo ${stepNumber}`}
              radius="md"
              style={{
                border: '2px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                maxHeight: 420,
                objectFit: 'contain',
              }}
            />
          </Box>
        )}

        {/* Instructions */}
        <Box p="lg">
          <Group gap="xs" mb={12}>
            <ListChecks size={16} color="#1a6fc4" />
            <Text size="sm" fw={600} c="mediBlue">O que fazer:</Text>
          </Group>
          <Stack gap={8}>
            {step.instructions.map((line, i) => (
              <Group key={i} gap="sm" align="flex-start" wrap="nowrap">
                <Box
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Text size="xs" fw={700} c="blue">{i + 1}</Text>
                </Box>
                <Text size="sm" style={{ lineHeight: 1.6, flex: 1 }}>
                  {line}
                </Text>
              </Group>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HealthPlanGuide() {
  const { id, protocolType } = useParams<{ id: string; protocolType: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Derive path info
  const getPathInfo = () => {
    const parts = location.pathname.split('/');
    const sectorPath = parts[1] || '';
    const isSectorPath = ['ue-sus', 'pa', 'portaria'].includes(sectorPath);

    if (!isSectorPath) {
      return {
        sectorName: null,
        humanPatientType: protocolType === 'externo' ? 'Externo' : 'Interno',
        baseSectorPath: '/onboarding',
        basePlansPath: '/onboarding',
        backPath: `/health-plans/${id}`,
      };
    }

    const patientTypePath = parts[2];
    const baseSectorPath = `/${sectorPath}/${patientTypePath}`;
    const basePlansPath = `${baseSectorPath}/health-plans`;
    const backPath = `${basePlansPath}/${id}`;

    const humanPatientType = patientTypePath === 'externo' ? 'Externo' : 'Interno';
    let sectorName = 'Setor';
    if (sectorPath === 'pa') sectorName = 'Pronto Atendimento';
    else if (sectorPath === 'portaria') sectorName = 'Portaria';
    else if (sectorPath === 'ue-sus') sectorName = 'Urgência/Emergência SUS';

    return { sectorName, humanPatientType, baseSectorPath, basePlansPath, backPath };
  };

  const { sectorName, humanPatientType, baseSectorPath, basePlansPath, backPath } = getPathInfo();

  // Fetch plan info
  const { data: plan, isLoading: isLoadingPlan } = useQuery<HealthPlan>({
    queryKey: ['health-plan', id],
    queryFn: async () => {
      const r = await apiClient.get(`/health-plans/${id}`);
      return r.data;
    },
    enabled: !!id,
  });

  // Fetch protocols for this plan
  const { data: protocols, isLoading: isLoadingProtocols } = useQuery<Protocol[]>({
    queryKey: ['health-plan-protocols', id],
    queryFn: async () => {
      const r = await apiClient.get(`/health-plans/${id}/protocols`);
      return r.data;
    },
    enabled: !!id,
  });

  const protocol = protocols?.find(p => p.patient_type === (protocolType ?? (location.pathname.split('/')[2] === 'externo' || location.pathname.split('/')[2] === 'interno' ? location.pathname.split('/')[2] : 'externo')));
  const steps = parseSteps(protocol?.content ?? null);

  const isLoading = isLoadingPlan || isLoadingProtocols;

  // ── Reading status query ─────────────────────────────────────────────────
  const { data: readingStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['protocol-reading-status', id, protocol?.id],
    queryFn: async () => {
      const r = await apiClient.get(`/health-plans/${id}/protocols/${protocol!.id}/reading-status`);
      return r.data as { protocol_id: number; has_acknowledged: boolean; acknowledged_at: string | null };
    },
    enabled: !!protocol,
  });

  // ── Acknowledge mutation ──────────────────────────────────────────────────
  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post(`/health-plans/${id}/protocols/${protocol!.id}/acknowledge`);
      return r.data;
    },
    onSuccess: () => {
      // Invalidate reading status + any onboarding progress caches
      queryClient.invalidateQueries({ queryKey: ['protocol-reading-status', id, protocol?.id] });
      queryClient.invalidateQueries({ queryKey: ['playlist-progress'] });
    },
  });

  const hasAcknowledged = readingStatus?.has_acknowledged ?? false;
  const acknowledgedAt = readingStatus?.acknowledged_at
    ? new Date(readingStatus.acknowledged_at).toLocaleString('pt-BR')
    : null;

  // Breadcrumbs
  const breadcrumbItems = [
    { title: 'Dashboard', href: '/' },
  ];

  if (sectorName) {
    breadcrumbItems.push({ title: sectorName, href: `/${location.pathname.split('/')[1]}` });
    breadcrumbItems.push({ title: humanPatientType, href: baseSectorPath });
    breadcrumbItems.push({ title: 'Convênios', href: basePlansPath });
  } else {
    breadcrumbItems.push({ title: 'Trilhas de Capacitação', href: '/onboarding' });
  }

  breadcrumbItems.push({ title: plan?.name ?? '...', href: backPath });
  breadcrumbItems.push({ title: 'Guia de Treinamento', href: '#' });

  const breadcrumbs = breadcrumbItems.map((item, i) => (
    <Anchor
      key={i}
      href={item.href}
      onClick={(e) => {
        e.preventDefault();
        if (item.href !== '#') navigate(item.href);
      }}
    >
      {item.title}
    </Anchor>
  ));

  if (isLoading) {
    return (
      <Center h="60vh">
        <Stack align="center" gap="md">
          <Loader size="xl" type="dots" color="mediBlue" />
          <Text c="dimmed">Carregando guia de treinamento...</Text>
        </Stack>
      </Center>
    );
  }

  if (!protocol) {
    return (
      <Container size="lg" py="xl">
        <Breadcrumbs mb="xl">{breadcrumbs}</Breadcrumbs>
        <Alert icon={<Info size={16} />} color="orange" title="Guia não encontrado">
          Não há protocolo cadastrado para este plano e tipo de atendimento.
        </Alert>
        <Button mt="md" leftSection={<ChevronLeft size={16} />} onClick={() => navigate(backPath)}>
          Voltar
        </Button>
      </Container>
    );
  }

  const patientIcon = protocol.patient_type === 'externo'
    ? <Users size={18} />
    : <UserCheck size={18} />;
  const patientColor = protocol.patient_type === 'externo' ? 'blue' : 'teal';
  const patientLabel = protocol.patient_type === 'externo' ? 'Paciente Externo' : 'Paciente Interno';

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs>{breadcrumbs}</Breadcrumbs>

        {/* Header */}
        <Group gap="md" align="flex-start">
          <Button
            variant="subtle"
            leftSection={<ChevronLeft size={16} />}
            onClick={() => navigate(backPath)}
          >
            Voltar
          </Button>

          <Stack gap={4} style={{ flex: 1 }}>
            <Group gap="sm" align="center">
              {plan?.logo_path && (
                <Image
                  src={plan.logo_path}
                  alt={plan.name}
                  h={36}
                  fit="contain"
                  style={{ opacity: 0.9 }}
                />
              )}
              <Title order={1} c="mediBlue">{plan?.name}</Title>
              <Badge color={patientColor} variant="light" size="lg" leftSection={patientIcon}>
                {patientLabel}
              </Badge>
            </Group>
            <Text c="dimmed" size="sm">{protocol.title}</Text>
          </Stack>
        </Group>

        {/* Steps count banner */}
        {steps.length > 0 && (
          <Card
            radius="lg"
            style={{
              background: 'linear-gradient(135deg, #1a6fc4 0%, #1098ad 100%)',
              border: 'none',
            }}
            p="lg"
          >
            <Group justify="space-between" wrap="wrap" gap="md">
              <Stack gap={4}>
                <Group gap="xs">
                  <BookOpen size={20} color="white" />
                  <Text fw={700} c="white" size="lg">Trilha de Treinamento</Text>
                </Group>
                <Text c="rgba(255,255,255,0.8)" size="sm">
                  Siga os passos abaixo para realizar a autorização corretamente. Cada passo inclui a tela do sistema para referência.
                </Text>
              </Stack>
              <Badge
                size="xl"
                radius="md"
                color="rgba(255,255,255,0.2)"
                variant="filled"
                style={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                {steps.length} {steps.length === 1 ? 'passo' : 'passos'}
              </Badge>
            </Group>
          </Card>
        )}

        <Divider label="Início do Guia" labelPosition="center" />

        {/* Steps */}
        {steps.length === 0 ? (
          <Alert icon={<AlertCircle size={16} />} color="gray" title="Sem conteúdo estruturado">
            Este protocolo ainda não possui passos cadastrados. Aguarde atualização.
          </Alert>
        ) : (
          <Stack gap="xl">
            {steps.map((step, idx) => (
              <StepCard
                key={idx}
                step={step}
                stepNumber={idx + 1}
                totalSteps={steps.length}
              />
            ))}
          </Stack>
        )}

        {/* Footer */}
        {steps.length > 0 && (
          <>
            <Divider />
            <Paper
              p="lg"
              radius="md"
              withBorder
              style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}
            >
              <Group gap="md">
                <ThemeIcon size={48} radius="md" color="green" variant="light">
                  <CheckCircle2 size={24} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={700} c="green.8">Treinamento Concluído!</Text>
                  <Text size="sm" c="dimmed">
                    Você chegou ao fim do guia de autorização para <strong>{plan?.name}</strong>.
                    Em caso de dúvidas, entre em contato com a gestão.
                  </Text>
                </Stack>
              </Group>
            </Paper>

            <Group justify="center">
              <Button
                variant="light"
                leftSection={<ChevronLeft size={16} />}
                onClick={() => navigate(backPath)}
              >
                Voltar ao plano
              </Button>
              {plan?.external_portal_url && (
                <Button
                  variant="filled"
                  rightSection={<ExternalLink size={14} />}
                  component="a"
                  href={plan.external_portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Acessar sistema {plan.name}
                </Button>
              )}
            </Group>

            {/* ── Acknowledgment Button ── */}
            <Paper
              p="xl"
              radius="lg"
              withBorder
              style={{
                borderColor: hasAcknowledged ? '#bbf7d0' : '#bfdbfe',
                background: hasAcknowledged ? '#f0fdf4' : '#eff6ff',
                textAlign: 'center',
              }}
            >
              <Stack align="center" gap="md">
                <ThemeIcon
                  size={64}
                  radius="xl"
                  color={hasAcknowledged ? 'green' : 'blue'}
                  variant="light"
                >
                  {hasAcknowledged ? <ShieldCheck size={32} /> : <CheckCircle2 size={32} />}
                </ThemeIcon>

                {hasAcknowledged ? (
                  <>
                    <Stack gap={4} align="center">
                      <Text fw={700} size="lg" c="green.8">Treinamento Confirmado ✓</Text>
                      <Text size="sm" c="dimmed">
                        Você confirmou o recebimento destas instruções em {acknowledgedAt}.
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
                        deste guia de treinamento. Isso será registrado no seu progresso.
                      </Text>
                    </Stack>
                    <Button
                      size="lg"
                      color="blue"
                      leftSection={<ShieldCheck size={20} />}
                      loading={acknowledgeMutation.isPending || isLoadingStatus}
                      onClick={() => acknowledgeMutation.mutate()}
                      style={{ minWidth: 280 }}
                    >
                      ✅ Li e Estou Ciente
                    </Button>
                  </>
                )}
              </Stack>
            </Paper>
          </>
        )}
      </Stack>
    </Container>
  );
}
