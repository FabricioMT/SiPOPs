import { AppShell, Burger, Group, Text, NavLink, Divider, Stack, ActionIcon, useMantineColorScheme, Autocomplete, Menu, Avatar, Tooltip, ThemeIcon, Image } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  LayoutDashboard, ListTodo, MessageSquare, LogOut, 
  User as UserIcon, Sun, Moon, Search, Hash, Shield, Settings, ChevronDown,
  AlertCircle, Activity, DoorOpen, BookOpen
} from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { TokenTimer } from './TokenTimer';
import apiClient from '../api/client';
import { ProfileModal } from '../modules/auth/ProfileModal';

export function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const [profileOpened, { open: openProfile, close: closeProfile }] = useDisclosure(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (search.length >= 2) {
        try {
          const response = await apiClient.get(`/sops/global-search?q=${search}`);
          setSearchResults(response.data);
        } catch (error) {
          console.error("Erro na busca:", error);
        }
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleSearchSubmit = (val: string) => {
    const selected = searchResults.find(r => r.value === val);
    if (selected) {
      if (selected.type === 'sop') {
        navigate(`/sops/${selected.id}`);
      } else if (selected.type === 'protocol') {
        const { health_plan_id, patient_type } = selected.metadata;
        navigate(`/health-plans/${health_plan_id}/guide/${patient_type}`);
      }
      setSearch('');
    }
  };

  // Base navigation links
  const mainLinks = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: ListTodo, label: 'Trilhas de Capacitação', path: '/onboarding' },
    { icon: Hash, label: 'Códigos TUSS', path: '/tuss' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
  ];

  // Sector links with RBAC logic
  const sectorLinks = [];
  const userRoles = user?.roles || [];
  const isAdminOrGestor = userRoles.includes('admin') || userRoles.includes('gestor');

  if (isAdminOrGestor || userRoles.includes('sec_ue_sus')) {
    sectorLinks.push({ 
      icon: AlertCircle, 
      label: 'Urgência/Emergência SUS', 
      path: '/ue-sus',
      color: 'red'
    });
  }

  if (isAdminOrGestor || userRoles.includes('sec_pa')) {
    sectorLinks.push({ 
      icon: Activity, 
      label: 'Pronto Atendimento', 
      path: '/pa',
      color: 'blue'
    });
  }

  if (isAdminOrGestor || userRoles.includes('sec_portaria')) {
    sectorLinks.push({ 
      icon: DoorOpen, 
      label: 'Portaria Principal', 
      path: '/portaria',
      color: 'teal'
    });
  }

  // Admin specific - Visible to both Admin and Gestor
  const adminLinks = [];
  if (isAdminOrGestor) {
    adminLinks.push({ icon: Shield, label: 'Gestão de Equipe', path: '/users' });
  }

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
            <Group gap={8} wrap="nowrap">
              <Image src="/logo.png" h={34} w="auto" fit="contain" />
              <Text fw={900} size="xl" c="sipopsGreen" style={{ letterSpacing: '-1px' }}>SiPOPs</Text>
            </Group>
          </Group>

          {user && (
            <Autocomplete
              placeholder="Buscar procedimento ou guia de convênio..."
              leftSection={<Search size={16} strokeWidth={1.5} />}
              data={searchResults.map(r => ({
                value: r.value,
                id: r.id.toString(), // Mantine expects string for id in some contexts, but value is standard
                type: r.type,
                category: r.category
              }))}
              value={search}
              onChange={setSearch}
              onOptionSubmit={handleSearchSubmit}
              renderOption={({ option }) => {
                const opt = option as any;
                return (
                  <Group gap="sm">
                    <ThemeIcon 
                      variant="light" 
                      size="sm" 
                      color={opt.type === 'sop' ? 'blue' : 'teal'}
                    >
                      {opt.type === 'sop' ? <BookOpen size={12} /> : <Activity size={12} />}
                    </ThemeIcon>
                    <Stack gap={0} flex={1}>
                      <Text size="sm" fw={500}>{opt.value}</Text>
                      <Text size="xs" c="dimmed">{opt.category}</Text>
                    </Stack>
                  </Group>
                );
              }}
              style={{ flex: 1, maxWidth: 450 }}
              visibleFrom="xs"
              maxDropdownHeight={400}
            />
          )}

          {user && (
            <Group gap="md">
              <Group visibleFrom="md">
                <TokenTimer />
              </Group>
              
              <Group gap="xs">
                <Tooltip label="Alternar Tema">
                  <ActionIcon variant="default" onClick={() => toggleColorScheme()} size="lg" radius="md">
                    {colorScheme === 'dark' ? <Sun size="1.2rem" /> : <Moon size="1.2rem" />}
                  </ActionIcon>
                </Tooltip>

                <Menu shadow="md" width={220} position="bottom-end" transitionProps={{ transition: 'pop-top-right' }}>
                  <Menu.Target>
                    <Group gap={8} style={{ cursor: 'pointer' }} className="user-menu-trigger">
                      <Avatar color="sipopsGreen" radius="xl" size="sm">
                        {user.full_name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Stack gap={0} visibleFrom="sm">
                        <Text size="sm" fw={700} style={{ lineHeight: 1 }}>{user.full_name}</Text>
                        <Text size="xs" c="dimmed">
                          {user.roles.length > 1 
                            ? `${user.roles.length} Funções` 
                            : user.roles[0]?.charAt(0).toUpperCase() + user.roles[0]?.slice(1) || 'Colaborador'
                          }
                        </Text>
                      </Stack>
                      <ChevronDown size={14} color="gray" />
                    </Group>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>Sua Conta</Menu.Label>
                    <Menu.Item 
                      leftSection={<UserIcon size={14} />} 
                      onClick={openProfile}
                    >
                      Meu Perfil
                    </Menu.Item>
                    <Menu.Item 
                      leftSection={<Settings size={14} />}
                      onClick={openProfile}
                    >
                      Configurações
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Label>Sessão</Menu.Label>
                    <Menu.Item 
                      color="red" 
                      leftSection={<LogOut size={14} />}
                      onClick={handleLogout}
                    >
                      Sair do SiPOPs
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ display: 'flex', flexDirection: 'column' }}>
        <Stack flex={1} gap="xs" style={{ overflowY: 'auto' }}>
          {/* Main Navigation */}
          {mainLinks.map((link) => (
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

          {/* SPDATA Sectors */}
          {sectorLinks.length > 0 && (
            <>
              <Divider my="sm" label="Guias" labelPosition="center" />
              {sectorLinks.map((link) => (
                <NavLink
                  key={link.path}
                  label={link.label}
                  leftSection={<link.icon size="1.2rem" strokeWidth={1.5} color={link.color} />}
                  active={location.pathname === link.path || location.pathname.startsWith(`${link.path}/`)}
                  onClick={() => {
                    navigate(link.path);
                    if (opened) toggle();
                  }}
                />
              ))}
            </>
          )}

          {/* Admin Section */}
          {adminLinks.length > 0 && (
            <>
              <Divider my="sm" label="Administração" labelPosition="center" />
              {adminLinks.map((link) => (
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
            </>
          )}
        </Stack>

        <Stack mt="auto">
          <Divider />
          {user && (
            <Group hiddenFrom="sm" justify="space-between" mb="xs">
              <Group gap="xs">
                <Avatar color="sipopsGreen" radius="xl" size="sm">
                  {user.full_name.charAt(0).toUpperCase()}
                </Avatar>
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

      <ProfileModal opened={profileOpened} onClose={closeProfile} />
    </AppShell>
  );
}
