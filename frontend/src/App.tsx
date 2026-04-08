import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Title, Text, Container, Center, Loader } from '@mantine/core';

import { Login } from './modules/auth/Login';
import { Register } from './modules/auth/Register';
import { ForgotPassword } from './modules/auth/ForgotPassword';
import { ResetPassword } from './modules/auth/ResetPassword';
import { HealthPlanList } from './modules/health_plans/HealthPlanList';
import { HealthPlanDetail } from './modules/health_plans/HealthPlanDetail';
import { HealthPlanGuide } from './modules/health_plans/HealthPlanGuide';
import { SOPDetail } from './modules/knowledge_base/SOPDetail';
import { OnboardingList } from './modules/onboarding/OnboardingList';
import { OnboardingDetail } from './modules/onboarding/OnboardingDetail';
import { TUSSList } from './modules/tuss/TUSSList';
import { UsersList } from './modules/admin/UsersList';
import { useAuthStore } from './store/authStore';
import { Dashboard } from './modules/dashboard/Dashboard';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoadingAuth } = useAuthStore();

  if (isLoadingAuth) {
    return (
      <Center h="100vh">
        <Loader size="xl" type="bars" color="sipopsGreen" />
      </Center>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Route protector for specific roles
const RoleProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, isLoadingAuth } = useAuthStore();

  if (isLoadingAuth) return <Center h="100vh"><Loader size="xl" /></Center>;

  // Check if at least one of user's roles is in the allowed list
  const hasAccess = user?.roles?.some(role => allowedRoles.includes(role));

  if (!user || !hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};



const Chat = () => (
  <Container>
    <Title order={2}>Chat de Suporte</Title>
    <Text mt="md">Comunicação em tempo real com a gestão.</Text>
  </Container>
);

import { AlertCircle, Activity, DoorOpen } from 'lucide-react';
import { SetorHub } from './modules/setores/SetorHub';
import { GuidesList } from './modules/setores/GuidesList';

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

          {/* Setores e Guias SPDATA */}
          <Route path="ue-sus" element={
            <RoleProtectedRoute allowedRoles={['admin', 'gestor', 'sec_ue_sus']}>
              <Outlet />
            </RoleProtectedRoute>
          }>
            <Route index element={
              <SetorHub
                title="Secretaria Urgência e Emergência SUS"
                description="Guia de uso do sistema para o setor de Urgência/Emergência"
                sector="ue_sus"
                basePath="/ue-sus"
                icon={<AlertCircle size={28} />}
                color="red"
              />
            } />
            <Route path=":patientType">
              <Route index element={
                <GuidesList
                  sectorLabel="Urgência/Emergência SUS"
                  sectorKey="ue_sus"
                  basePath="/ue-sus"
                  sectorColor="red"
                />
              } />
              <Route path="health-plans" element={<HealthPlanList />} />
              <Route path="health-plans/:id" element={<HealthPlanDetail />} />
              <Route path="health-plans/:id/guide/:protocolType" element={<HealthPlanGuide />} />
            </Route>
          </Route>

          <Route path="pa" element={
            <RoleProtectedRoute allowedRoles={['admin', 'gestor', 'sec_pa']}>
              <Outlet />
            </RoleProtectedRoute>
          }>
            <Route index element={
              <SetorHub
                title="Secretaria Pronto Atendimento"
                description="Guia de uso do sistema para o setor de Pronto Atendimento"
                sector="pa"
                basePath="/pa"
                icon={<Activity size={28} />}
                color="blue"
              />
            } />
            <Route path=":patientType">
              <Route index element={
                <GuidesList
                  sectorLabel="Pronto Atendimento"
                  sectorKey="pa"
                  basePath="/pa"
                  sectorColor="blue"
                />
              } />
              <Route path="health-plans" element={<HealthPlanList />} />
              <Route path="health-plans/:id" element={<HealthPlanDetail />} />
              <Route path="health-plans/:id/guide/:protocolType" element={<HealthPlanGuide />} />
            </Route>
          </Route>

          <Route path="portaria" element={
            <RoleProtectedRoute allowedRoles={['admin', 'gestor', 'sec_portaria']}>
              <Outlet />
            </RoleProtectedRoute>
          }>
            <Route index element={
              <SetorHub
                title="Secretaria Portaria Principal"
                description="Guia de uso do sistema para o setor da Portaria"
                sector="portaria"
                basePath="/portaria"
                icon={<DoorOpen size={28} />}
                color="teal"
              />
            } />
            <Route path=":patientType">
              <Route index element={
                <GuidesList
                  sectorLabel="Portaria Principal"
                  sectorKey="portaria"
                  basePath="/portaria"
                  sectorColor="teal"
                />
              } />
              <Route path="health-plans" element={<HealthPlanList />} />
              <Route path="health-plans/:id" element={<HealthPlanDetail />} />
              <Route path="health-plans/:id/guide/:protocolType" element={<HealthPlanGuide />} />
            </Route>
          </Route>

          <Route path="sops/:id" element={<SOPDetail />} />
          <Route path="onboarding" element={<OnboardingList />} />
          <Route path="onboarding/:id" element={<OnboardingDetail />} />
          <Route path="tuss" element={<TUSSList />} />
          <Route path="users" element={<UsersList />} />
          <Route path="chat" element={<Chat />} />

          {/* Shared Health Plan Routes (accessible from anywhere, like Onboarding) */}
          <Route path="health-plans/:id" element={<HealthPlanDetail />} />
          <Route path="health-plans/:id/guide/:protocolType" element={<HealthPlanGuide />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

