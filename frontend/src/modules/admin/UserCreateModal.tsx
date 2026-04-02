import { 
  Modal, TextInput, Select, Button, Group, Stack, LoadingOverlay, 
  Paper, Text, Alert, CopyButton, ActionIcon, Tooltip, Divider 
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '../../api/onboarding';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { Check, Copy, UserCheck, User } from 'lucide-react';

interface UserCreateModalProps {
  opened: boolean;
  onClose: () => void;
}

export const UserCreateModal = ({ opened, onClose }: UserCreateModalProps) => {
  const queryClient = useQueryClient();
  const [createdUser, setCreatedUser] = useState<{ name: string; email: string; pass: string } | null>(null);

  const form = useForm({
    initialValues: {
      full_name: '',
      email: '',
      role: 'colaborador',
    },
    validate: {
      full_name: (value) => (value.length < 2 ? 'Nome muito curto' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'E-mail inválido'),
      role: (value) => (!value ? 'Selecione um cargo' : null),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: typeof form.values) => onboardingApi.createUser(values),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreatedUser({
        name: data.full_name,
        email: data.email,
        pass: data.plain_password
      });
      form.reset();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.detail || 'Erro ao criar colaborador',
        color: 'red',
      });
    },
  });

  const handleClose = () => {
    setCreatedUser(null);
    onClose();
  };

  return (
    <Modal 
      opened={opened} 
      onClose={handleClose} 
      title={
        <Group gap="xs">
          <UserCheck size={20} color="var(--mantine-color-mediBlue-6)" />
          <Text fw={700}>Cadastrar Novo Colaborador</Text>
        </Group>
      }
      centered 
      radius="md"
      size="md"
    >
      <div style={{ position: 'relative' }}>
        <LoadingOverlay visible={mutation.isPending} />

        {!createdUser ? (
          <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
            <Stack>
              <Text size="sm" c="dimmed">
                Preencha os dados básicos. A senha será gerada automaticamente e exibida na tela seguinte.
              </Text>

              <TextInput
                label="Nome Completo"
                placeholder="Ex: João da Silva"
                required
                leftSection={<User size={16} strokeWidth={1.5} />}
                {...form.getInputProps('full_name')}
              />

              <TextInput
                label="E-mail Corporativo"
                placeholder="colaborador@medicore.com"
                required
                leftSection={<Text size="xs" fw={700} c="dimmed">@</Text>}
                {...form.getInputProps('email')}
              />

              <Select
                label="Permissão de Acesso"
                placeholder="Selecione o cargo"
                required
                data={[
                  { value: 'admin', label: '🛡️ Admin (Acesso Total)' },
                  { value: 'gestor', label: '👔 Gestor (Acesso Administrativo)' },
                  { value: 'colaborador', label: '👤 Colaborador (Geral)' },
                  { group: 'Setores Especializados', items: [
                    { value: 'sec_ue_sus', label: '🚨 Sec. Urgência e Emergência SUS' },
                    { value: 'sec_pa', label: '🏥 Sec. Pronto Atendimento' },
                    { value: 'sec_portaria', label: '🚪 Sec. Portaria Principal' },
                    { value: 'sec_guias', label: '📋 Sec. Central de Guias' },
                  ]},
                ]}
                {...form.getInputProps('role')}
              />

              <Group justify="flex-end" mt="xl">
                <Button variant="subtle" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" color="mediBlue" loading={mutation.isPending}>
                  Finalizar Cadastro
                </Button>
              </Group>
            </Stack>
          </form>
        ) : (
          <Stack gap="md">
            <Alert color="green" title="Usuário Criado com Sucesso!" icon={<Check size={18} />}>
              O colaborador <strong>{createdUser.name}</strong> foi cadastrado. 
              Por favor, forneça os dados de acesso abaixo para ele.
            </Alert>

            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-gray-0)">
              <Stack gap="xs">
                <div>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">E-mail de Acesso</Text>
                  <Text fw={600}>{createdUser.email}</Text>
                </div>
                
                <Divider size="xs" />

                <div>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">Senha Temporária</Text>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={700} size="lg" c="mediBlue" style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>
                      {createdUser.pass}
                    </Text>
                    <CopyButton value={createdUser.pass}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copiado!' : 'Copiar Senha'}>
                          <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy} variant="light">
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </div>
              </Stack>
            </Paper>

            <Text size="xs" c="red" fw={500}>
              ⚠️ Esta senha não será exibida novamente por segurança.
            </Text>

            <Button fullWidth onClick={handleClose} color="mediBlue" mt="md">
              Entendido e Copiado
            </Button>
          </Stack>
        )}
      </div>
    </Modal>
  );
};
