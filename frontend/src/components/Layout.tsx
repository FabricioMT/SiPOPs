import { AppShell, Burger, Group, Text, NavLink, Divider, Stack, ActionIcon, useMantineColorScheme, Autocomplete } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { LayoutDashboard, BookOpen, ListTodo, MessageSquare, LogOut, User as UserIcon, Sun, Moon, Search, Hash } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { TokenTimer } from './TokenTimer';
import apiClient from '../api/client';

export function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ value: string; id: number }[]>([]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (search.length >= 2) {
        try {
          const response = await apiClient.get(`/sops/search?q=${search}`);
          setSearchResults(response.data.map((sop: any) => ({
            value: sop.title,
            id: sop.id
          })));
        } catch (error) {
          console.error("Erro na busca:", error);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const links = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: BookOpen, label: 'Planos de Saúde', path: '/health-plans' },
    { icon: ListTodo, label: 'Onboarding', path: '/onboarding' },
    { icon: Hash, label: 'Códigos TUSS', path: '/tuss' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={900} size="xl" c="mediBlue" style={{ letterSpacing: '-1px' }}>SiPOPs</Text>
          </Group>

          {user && (
            <Autocomplete
              placeholder="Buscar procedimento..."
              leftSection={<Search size={16} strokeWidth={1.5} />}
              data={searchResults}
              value={search}
              onChange={setSearch}
              onOptionSubmit={(val) => {
                const selected = searchResults.find(r => r.value === val);
                if (selected) {
                  navigate(`/sops/${selected.id}`);
                  setSearch('');
                }
              }}
              style={{ flex: 1, maxWidth: 400 }}
              visibleFrom="xs"
            />
          )}

          {user && (
            <Group gap="md">
              <Group visibleFrom="md">
                <TokenTimer />
              </Group>
              <Group gap="xs">
                <ActionIcon variant="default" onClick={() => toggleColorScheme()} size="lg" aria-label="Alterar Tema">
                  {colorScheme === 'dark' ? <Sun size="1.2rem" /> : <Moon size="1.2rem" />}
                </ActionIcon>
                <UserIcon size="1.2rem" />
                <Text size="sm" fw={500} visibleFrom="sm">{user.full_name}</Text>
              </Group>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ display: 'flex', flexDirection: 'column' }}>
        <Stack flex={1} gap="xs">
          {links.map((link) => (
            <NavLink
              key={link.path}
              label={link.label}
              leftSection={<link.icon size="1.2rem" strokeWidth={1.5} />}
              active={location.pathname === link.path}
              onClick={() => {
                navigate(link.path);
                if (opened) toggle();
              }}
            />
          ))}
        </Stack>

        <Stack mt="auto">
          <Divider />
          {user && (
            <Group hiddenFrom="sm" justify="space-between" mb="xs">
              <Group gap="xs">
                <UserIcon size="1.2rem" />
                <Text size="sm" fw={500}>{user.full_name}</Text>
              </Group>
              <TokenTimer />
            </Group>
          )}
          <NavLink
            label="Sair"
            leftSection={<LogOut size="1.2rem" strokeWidth={1.5} color="red" />}
            onClick={handleLogout}
            color="red"
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
