import { useEffect } from 'react';
import { Modal, TextInput, Select, Switch, Button, Group, Stack, LoadingOverlay } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '../../api/onboarding';
import type { UserResponse } from '../../api/onboarding';
import { notifications } from '@mantine/notifications';

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
      role: '',
      is_active: true,
    },
    validate: {
      full_name: (value) => (value.length < 2 ? 'Nome muito curto' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'E-mail inválido'),
    },
  });

  useEffect(() => {
    if (user) {
      form.setValues({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
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
    <Modal opened={opened} onClose={onClose} title="Editar Colaborador" centered radius="md">
      <div style={{ position: 'relative' }}>
        <LoadingOverlay visible={mutation.isPending} />
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack>
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
            <Select
              label="Cargo / Role"
              placeholder="Selecione o cargo"
              data={[
                { value: 'admin', label: 'Admin' },
                { value: 'gestor', label: 'Gestor' },
                { value: 'colaborador', label: 'Colaborador' },
              ]}
              {...form.getInputProps('role')}
            />
            <Switch
              label="Conta Ativa"
              mt="md"
              {...form.getInputProps('is_active', { type: 'checkbox' })}
            />

            <Group justify="flex-end" mt="xl">
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
