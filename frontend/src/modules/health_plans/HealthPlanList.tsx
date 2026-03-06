import { useQuery } from '@tanstack/react-query';
import { Title, SimpleGrid, Card, Image, Text, Loader, Center, Container, Paper } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

interface HealthPlan {
  id: number;
  name: string;
  logo_path: string | null;
  is_active: boolean;
}

export function HealthPlanList() {
  const navigate = useNavigate();

  const { data: plans, isLoading, error } = useQuery<HealthPlan[]>({
    queryKey: ['health-plans'],
    queryFn: async () => {
      const response = await apiClient.get('/health-plans/');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <Center h="50vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (error) {
    return (
      <Container>
        <Paper p="xl" withBorder style={{ borderColor: 'red' }}>
          <Text c="red" ta="center">Erro ao carregar planos de saúde. Tente novamente mais tarde.</Text>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Title order={2} mb="xl" c="mediBlue">Planos de Saúde (Convênios)</Title>
      
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
        {plans?.map((plan) => (
          <Card
            key={plan.id}
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            component="button"
            onClick={() => navigate(`/health-plans/${plan.id}`)}
            style={{ 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Card.Section p="md">
              <Center h={100}>
                {plan.logo_path ? (
                  <Image
                    src={plan.logo_path}
                    alt={plan.name}
                    height={80}
                    fit="contain"
                    fallbackSrc="https://placehold.co/200x100?text=Logo"
                  />
                ) : (
                  <div style={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: '50%', 
                    backgroundColor: '#f0f3f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Text fw={700} size="xl" c="mediBlue">{plan.name.charAt(0)}</Text>
                  </div>
                )}
              </Center>
            </Card.Section>

            <Text fw={600} size="lg" ta="center" mt="md">
              {plan.name}
            </Text>
            
            <Text size="xs" c="dimmed" ta="center" mt={4}>
              Clique para ver procedimentos
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
