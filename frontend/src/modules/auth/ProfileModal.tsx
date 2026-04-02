import { useState } from 'react';
import { Modal, TextInput, PasswordInput, Button, Group, Stack, Tabs, LoadingOverlay } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { Mail, Lock, User, Check } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';

interface ProfileModalProps {
  opened: boolean;
  onClose: () => void;
}

export const ProfileModal = ({ opened, onClose }: ProfileModalProps) => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string | null>('email');

  const emailForm = useForm({
    initialValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'E-mail inválido'),
      full_name: (value) => (value.length < 2 ? 'Nome muito curto' : null),
    },
  });

  const passwordForm = useForm({
    initialValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
    validate: {
      new_password: (value) => (value.length < 6 ? 'A senha deve ter pelo menos 6 caracteres' : null),
      confirm_password: (value, values) =>
        value !== values.new_password ? 'As senhas não coincidem' : null,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: typeof emailForm.values) => {
      const response = await apiClient.patch('/auth/me', values);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      notifications.show({
        title: 'Sucesso',
        message: 'Perfil atualizado com sucesso!',
        color: 'green',
        icon: <Check size={16} />,
      });
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.detail || 'Erro ao atualizar perfil',
        color: 'red',
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (values: typeof passwordForm.values) => {
      await apiClient.patch('/auth/me/password', {
        current_password: values.current_password,
        new_password: values.new_password,
      });
    },
    onSuccess: () => {
      notifications.show({
        title: 'Sucesso',
        message: 'Senha alterada com sucesso!',
        color: 'green',
        icon: <Check size={16} />,
      });
      passwordForm.reset();
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.detail || 'Senha atual incorreta',
        color: 'red',
      });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Meu Perfil" centered radius="md" size="md">
      <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
        <Tabs.List grow mb="md">
          <Tabs.Tab value="email" leftSection={<Mail size={14} />}>
            Dados Básicos
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<Lock size={14} />}>
            Segurança
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="email">
          <div style={{ position: 'relative' }}>
            <LoadingOverlay visible={updateProfileMutation.isPending} />
            <form onSubmit={emailForm.onSubmit((values) => updateProfileMutation.mutate(values))}>
              <Stack>
                <TextInput
                  label="Nome Completo"
                  placeholder="Seu nome"
                  leftSection={<User size={16} />}
                  required
                  {...emailForm.getInputProps('full_name')}
                />
                <TextInput
                  label="E-mail"
                  placeholder="seu@email.com"
                  leftSection={<Mail size={16} />}
                  required
                  {...emailForm.getInputProps('email')}
                />
                <Group justify="flex-end" mt="md">
                  <Button variant="subtle" onClick={onClose}>Cancelar</Button>
                  <Button type="submit" color="mediBlue" loading={updateProfileMutation.isPending}>
                    Salvar Alterações
                  </Button>
                </Group>
              </Stack>
            </form>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="security">
          <div style={{ position: 'relative' }}>
            <LoadingOverlay visible={updatePasswordMutation.isPending} />
            <form onSubmit={passwordForm.onSubmit((values) => updatePasswordMutation.mutate(values))}>
              <Stack>
                <PasswordInput
                  label="Senha Atual"
                  placeholder="Digite sua senha atual"
                  required
                  {...passwordForm.getInputProps('current_password')}
                />
                <PasswordInput
                  label="Nova Senha"
                  placeholder="Mínimo 6 caracteres"
                  required
                  {...passwordForm.getInputProps('new_password')}
                />
                <PasswordInput
                  label="Confirmar Nova Senha"
                  placeholder="Repita a nova senha"
                  required
                  {...passwordForm.getInputProps('confirm_password')}
                />
                <Group justify="flex-end" mt="md">
                  <Button variant="subtle" onClick={onClose}>Cancelar</Button>
                  <Button type="submit" color="mediBlue" loading={updatePasswordMutation.isPending}>
                    Alterar Senha
                  </Button>
                </Group>
              </Stack>
            </form>
          </div>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};
