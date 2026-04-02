import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Title, Text, Container, Center, Loader } from '@mantine/core';

import { Login } from './modules/auth/Login';
import { Register } from './modules/auth/Register';
import { ForgotPassword } from './modules/auth/ForgotPassword';
import { ResetPassword } from './modules/auth/ResetPassword';
import { HealthPlanList } from './modules/health_plans/HealthPlanList';
import { HealthPlanDetail } from './modules/health_plans/HealthPlanDetail';
import { SOPDetail } from './modules/knowledge_base/SOPDetail';
import { OnboardingList } from './modules/onboarding/OnboardingList';
import { OnboardingDetail } from './modules/onboarding/OnboardingDetail';
import { TUSSList } from './modules/tuss/TUSSList';
import { UsersList } from './modules/admin/UsersList';
import { useAuthStore } from './store/authStore';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoadingAuth } = useAuthStore();

  if (isLoadingAuth) {
    return (
      <Center h="100vh">
        <Loader size="xl" type="bars" color="mediBlue" />
      </Center>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Placeholder components
const Dashboard = () => (
  <Container>
    <Title order={2}>Dashboard</Title>
    <Text mt="md">Bem-vindo ao <strong>SiPOPs</strong> — Sistema de Instrução aos Procedimentos Operacionais Padrão. Selecione uma opção no menu lateral para começar.</Text>
  </Container>
);

const Chat = () => (
  <Container>
    <Title order={2}>Chat de Suporte</Title>
    <Text mt="md">Comunicação em tempo real com a gestão.</Text>
  </Container>
);

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="health-plans" element={<HealthPlanList />} />
          <Route path="health-plans/:id" element={<HealthPlanDetail />} />
          <Route path="sops/:id" element={<SOPDetail />} />
          <Route path="onboarding" element={<OnboardingList />} />
          <Route path="onboarding/:id" element={<OnboardingDetail />} />
          <Route path="tuss" element={<TUSSList />} />
          <Route path="users" element={<UsersList />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

