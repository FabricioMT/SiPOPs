import { AppShell, Burger, Group, Text, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { LayoutDashboard, BookOpen, ListTodo, MessageSquare } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: BookOpen, label: 'POPs', path: '/knowledge-base' },
    { icon: ListTodo, label: 'Onboarding', path: '/onboarding' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
  ];

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
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text fw={700} size="xl" c="mediBlue">MediCore</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
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
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
