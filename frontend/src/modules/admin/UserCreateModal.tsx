import { 
  Modal, TextInput, Button, Group, Stack, LoadingOverlay, 
  Paper, Text, Alert, CopyButton, ActionIcon, Tooltip, Divider,
  SimpleGrid, Checkbox
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '../../api/onboarding';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { Check, Copy, UserCheck, User, Shield } from 'lucide-react';

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
      roles: ['colaborador'] as string[],
    },
    validate: {
      full_name: (value) => (value.length < 2 ? 'Nome muito curto' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'E-mail inválido'),
      roles: (value) => (value.length === 0 ? 'Selecione ao menos um acesso' : null),
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
          <UserCheck size={20} color="var(--mantine-color-sipopsGreen-6)" />
          <Text fw={700}>Cadastrar Novo Colaborador</Text>
        </Group>
      }
      centered 
      radius="md"
      size="lg"
    >
      <div style={{ position: 'relative' }}>
        <LoadingOverlay visible={mutation.isPending} />

        {!createdUser ? (
          <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Preencha os dados básicos e defina as permissões. A senha será gerada automaticamente.
              </Text>

              <Group grow>
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
              </Group>

              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Group gap="xs">
                    <Shield size={18} color="var(--mantine-color-blue-6)" />
                    <Text fw={700}>Matriz de Acessos e Funções</Text>
                  </Group>
                  
                  <Divider label="Administrativo e Gestão" labelPosition="center" mt="xs" />
                  <Checkbox.Group {...form.getInputProps('roles')}>
                    <SimpleGrid cols={3} mt="xs">
                      <Checkbox value="admin" label="🛡️ Admin" color="red" />
                      <Checkbox value="gestor" label="👔 Gestor" color="blue" />
                      <Checkbox value="colaborador" label="👤 Colaborador" color="gray" />
                    </SimpleGrid>

                    <Divider label="Secretarias e Setores" labelPosition="center" mt="lg" />
                    <SimpleGrid cols={2} mt="xs">
                      <Checkbox value="sec_ue_sus" label="🚨 Urgência/Emergência SUS" color="red" />
                      <Checkbox value="sec_pa" label="🏥 Pronto Atendimento" color="blue" />
                      <Checkbox value="sec_portaria" label="🚪 Portaria Principal" color="teal" />
                      <Checkbox value="sec_guias" label="📋 Central de Guias" color="cyan" />
                    </SimpleGrid>
                  </Checkbox.Group>
                </Stack>
              </Paper>

              <Group justify="flex-end" mt="xl">
                <Button variant="subtle" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" color="sipopsGreen" loading={mutation.isPending}>
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
                    <Text fw={700} size="lg" c="sipopsGreen" style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>
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

            <Button fullWidth onClick={handleClose} color="sipopsGreen" mt="md">
              Entendido e Copiado
            </Button>
          </Stack>
        )}
      </div>
    </Modal>
  );
};
