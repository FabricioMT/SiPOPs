import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Title, Text, Container, Table, Paper, Group, Stack, 
  Badge, Avatar, ScrollArea, TextInput, Button, ActionIcon, Menu
} from '@mantine/core';
import { Search, Eye, Users, Shield, UserCheck, Mail, Edit, Trash2, MoreVertical, Power } from 'lucide-react';
import { onboardingApi } from '../../api/onboarding';
import type { UserResponse } from '../../api/onboarding';
import { UserProgressModal } from './UserProgressModal';
import { UserEditModal } from './UserEditModal';
import { UserCreateModal } from './UserCreateModal';
import { useDisclosure } from '@mantine/hooks';

export const UsersList = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUserProgress, setSelectedUserProgress] = useState<{ id: number; name: string } | null>(null);
  const [selectedUserEdit, setSelectedUserEdit] = useState<UserResponse | null>(null);
  
  const [progressOpened, { open: openProgress, close: closeProgress }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => onboardingApi.getUsers(),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => onboardingApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => 
      onboardingApi.updateUser(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const filteredUsers = users?.filter((user: UserResponse) => 
    user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleShowProgress = (user: UserResponse) => {
    setSelectedUserProgress({ id: user.id, name: user.full_name });
    openProgress();
  };

  const handleEdit = (user: UserResponse) => {
    setSelectedUserEdit(user);
    openEdit();
  };

  const handleDelete = (user: UserResponse) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o usuário ${user.full_name}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleToggleStatus = (user: UserResponse) => {
    toggleStatusMutation.mutate({ id: user.id, is_active: !user.is_active });
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; color: string; icon?: any }> = {
      admin: { label: 'Admin', color: 'red', icon: <Shield size={12} /> },
      gestor: { label: 'Gestor', color: 'blue' },
      colaborador: { label: 'Colaborador', color: 'gray' },
      sec_ue_sus: { label: 'Sec. UE SUS', color: 'red' },
      sec_pa: { label: 'Sec. PA', color: 'blue' },
      sec_portaria: { label: 'Sec. Portaria', color: 'teal' },
      sec_guias: { label: 'Sec. Guias', color: 'cyan' },
    };

    const config = roleMap[role.toLowerCase()] || { label: role, color: 'gray' };
    
    return (
      <Badge 
        key={role} 
        color={config.color} 
        variant="light" 
        size="xs"
        leftSection={config.icon}
      >
        {config.label}
      </Badge>
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <Stack gap="xs">
            <Group gap="sm">
              <Users size={28} color="var(--mantine-color-mediBlue-6)" />
              <Title order={1} c="mediBlue">Gestão de Equipe</Title>
            </Group>
            <Text c="dimmed">Administre os colaboradores e acompanhe o progresso do Onboarding.</Text>
          </Stack>
          
          <Button 
            leftSection={<UserCheck size={16} />} 
            variant="light" 
            color="mediBlue"
            onClick={openCreate}
          >
            Novo Colaborador
          </Button>
        </Group>

        <Paper withBorder p="md" radius="md" shadow="xs">
          <TextInput
            placeholder="Buscar por nome ou e-mail..."
            leftSection={<Search size={16} strokeWidth={1.5} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="md"
          />
        </Paper>

        <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }} shadow="sm">
          <ScrollArea>
            <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover striped>
              <Table.Thead bg="var(--mantine-color-blue-light)">
                <Table.Tr>
                  <Table.Th>Colaborador</Table.Th>
                  <Table.Th>Cargo / Role</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Data de Cadastro</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Ações</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredUsers?.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar color="mediBlue" radius="xl">
                          {user.full_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Stack gap={0}>
                          <Text size="sm" fw={700}>{user.full_name}</Text>
                          <Group gap={4}>
                            <Mail size={12} color="gray" />
                            <Text size="xs" c="dimmed">{user.email}</Text>
                          </Group>
                        </Stack>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {user.roles?.map(role => getRoleBadge(role)) || <Badge color="gray">Nenhuma</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={user.is_active ? 'green' : 'red'} variant="dot">
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{new Date(user.created_at).toLocaleDateString('pt-BR')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Button 
                          variant="subtle" 
                          color="mediBlue" 
                          size="xs"
                          leftSection={<Eye size={14} />}
                          onClick={() => handleShowProgress(user)}
                        >
                          Progresso
                        </Button>
                        
                        <Menu shadow="md" width={200} position="bottom-end">
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                              <MoreVertical size={16} />
                            </ActionIcon>
                          </Menu.Target>

                          <Menu.Dropdown>
                            <Menu.Label>Gerenciamento</Menu.Label>
                            <Menu.Item 
                              leftSection={<Edit size={14} />} 
                              onClick={() => handleEdit(user)}
                            >
                              Editar Dados
                            </Menu.Item>
                            <Menu.Item 
                              leftSection={<Power size={14} />} 
                              color={user.is_active ? 'orange' : 'green'}
                              onClick={() => handleToggleStatus(user)}
                            >
                              {user.is_active ? 'Desativar Acesso' : 'Ativar Acesso'}
                            </Menu.Item>
                            
                            <Menu.Divider />
                            
                            <Menu.Label>Perigo</Menu.Label>
                            <Menu.Item 
                              color="red" 
                              leftSection={<Trash2 size={14} />}
                              onClick={() => handleDelete(user)}
                            >
                              Excluir Conta
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      </Stack>

      <UserProgressModal 
        opened={progressOpened} 
        onClose={closeProgress} 
        userId={selectedUserProgress?.id ?? null} 
        userName={selectedUserProgress?.name ?? null}
      />

      <UserEditModal
        opened={editOpened}
        onClose={closeEdit}
        user={selectedUserEdit}
      />

      <UserCreateModal
        opened={createOpened}
        onClose={closeCreate}
      />
    </Container>
  );
};
