import { useEffect } from 'react';
import { Modal, TextInput, Checkbox, Switch, Button, Group, Stack, LoadingOverlay, Text, Paper, SimpleGrid, Divider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '../../api/onboarding';
import type { UserResponse } from '../../api/onboarding';
import { notifications } from '@mantine/notifications';
import { Shield } from 'lucide-react';

interface UserEditModalProps {
  opened: boolean;
  onClose: () => void;
  user: UserResponse | null;
}

export const UserEditModal = ({ opened, onClose, user }: UserEditModalProps) => {
  const queryClient = useQueryClient();

  const form = useForm({
    initialValues: {
      full_name: '',
      email: '',
      roles: [] as string[],
      is_active: true,
    },
    validate: {
      full_name: (value) => (value.length < 2 ? 'Nome muito curto' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'E-mail inválido'),
      roles: (value) => (value.length === 0 ? 'Selecione ao menos um acesso' : null),
    },
  });

  useEffect(() => {
    if (user) {
      form.setValues({
        full_name: user.full_name,
        email: user.email,
        roles: user.roles || [],
        is_active: user.is_active,
      });
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: (values: typeof form.values) => onboardingApi.updateUser(user!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      notifications.show({
        title: 'Sucesso',
        message: 'Usuário atualizado com sucesso!',
        color: 'green',
      });
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.detail || 'Erro ao atualizar usuário',
        color: 'red',
      });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Editar Colaborador" centered radius="md" size="lg">
      <div style={{ position: 'relative' }}>
        <LoadingOverlay visible={mutation.isPending} />
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Nome Completo"
                placeholder="Nome do colaborador"
                required
                {...form.getInputProps('full_name')}
              />
              <TextInput
                label="E-mail"
                placeholder="email@exemplo.com"
                required
                {...form.getInputProps('email')}
              />
            </Group>

            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Group gap="xs">
                  <Shield size={18} color="var(--mantine-color-blue-6)" />
                  <Text fw={700}>Matriz de Acessos e Funções</Text>
                </Group>
                <Text size="xs" c="dimmed" mb="xs">
                  Marque as competências que este colaborador possui no sistema.
                </Text>
                
                <Divider label="Administrativo e Gestão" labelPosition="center" />
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

            <Switch
              label="Conta Ativa"
              {...form.getInputProps('is_active', { type: 'checkbox' })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" color="mediBlue" loading={mutation.isPending}>
                Salvar Alterações
              </Button>
            </Group>
          </Stack>
        </form>
      </div>
    </Modal>
  );
};
