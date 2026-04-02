import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Title, Text, Container, TextInput, Table, Paper, Group, Stack, 
  Center, Loader, Alert, Pagination, rem, Tabs, CopyButton, ActionIcon, Tooltip 
} from '@mantine/core';
import { Search, Hash, Info, Copy, Check, Star } from 'lucide-react';
import { useDebouncedValue } from '@mantine/hooks';
import apiClient from '../../api/client';

export const TUSSList = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>('search');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 500);
  const [page, setPage] = useState(1);
  const limit = 50;

  // Query for all TUSS codes
  const { data: tussCodes, isLoading: isSearchLoading, error: searchError } = useQuery({
    queryKey: ['tuss-codes', debouncedSearch, page],
    queryFn: async () => {
      const response = await apiClient.get('/tuss', {
        params: {
          q: debouncedSearch,
          limit,
          offset: (page - 1) * limit
        }
      });
      return response.data;
    },
    enabled: activeTab === 'search'
  });

  // Query for recurrent TUSS codes
  const { data: recurrentCodes, isLoading: isRecurrentLoading } = useQuery({
    queryKey: ['tuss-recurrent'],
    queryFn: async () => {
      const response = await apiClient.get('/tuss/recurrent');
      return response.data;
    },
    enabled: activeTab === 'recurrent'
  });

  // Mutation to track usage
  const trackMutation = useMutation({
    mutationFn: (tussId: number) => apiClient.post(`/tuss/${tussId}/track`),
    onSuccess: () => {
      // Invalidate recurrent codes to refresh the list if a code reaches 3 uses
      queryClient.invalidateQueries({ queryKey: ['tuss-recurrent'] });
    }
  });

  if (searchError) {
    return (
      <Container size="lg" py="xl">
        <Alert icon={<Info size={16} />} title="Erro" color="red">
          Não foi possível carregar a tabela TUSS. Verifique se o servidor está rodando.
        </Alert>
      </Container>
    );
  }

  const renderTable = (data: any[], isLoading: boolean) => (
    <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }} shadow="sm">
      <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover striped>
        <Table.Thead bg="var(--mantine-color-blue-light)">
          <Table.Tr>
            <Table.Th style={{ width: rem(200) }}>Código TUSS</Table.Th>
            <Table.Th>Descrição do Procedimento</Table.Th>
            <Table.Th style={{ width: rem(80) }}></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <Table.Tr>
              <Table.Td colSpan={3}>
                <Center py="xl">
                  <Stack align="center" gap="xs">
                    <Loader size="md" type="dots" color="mediBlue" />
                    <Text size="sm" c="dimmed">Buscando na base de dados...</Text>
                  </Stack>
                </Center>
              </Table.Td>
            </Table.Tr>
          ) : data?.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={3}>
                <Center py="xl">
                  <Stack align="center" gap="xs">
                    <Info size={32} color="var(--mantine-color-gray-4)" />
                    <Text size="sm" c="dimmed">
                      {activeTab === 'search' 
                        ? `Nenhum código encontrado para "${search}".`
                        : "Você ainda não possui códigos recorrentes (usados 3x ou mais)."}
                    </Text>
                  </Stack>
                </Center>
              </Table.Td>
            </Table.Tr>
          ) : (
            data?.map((item: any) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Hash size={14} color="var(--mantine-color-mediBlue-6)" />
                    <Text fw={700} size="sm" style={{ fontFamily: 'monospace' }}>{item.code}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{item.description}</Text>
                </Table.Td>
                <Table.Td>
                  <CopyButton value={item.code} timeout={2000}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copiado!' : 'Copiar código'} withArrow position="right">
                        <ActionIcon
                          color={copied ? 'teal' : 'mediBlue'}
                          variant="subtle"
                          onClick={() => {
                            copy();
                            trackMutation.mutate(item.id);
                          }}
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Paper>
  );

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1} c="mediBlue">Tabela TUSS</Title>
          <Text c="dimmed">
            Consulta rápida à Terminologia Unificada da Saúde Suplementar.
          </Text>
        </Stack>

        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
          <Tabs.List mb="md">
            <Tabs.Tab value="search" leftSection={<Search size={14} />}>
              Pesquisa Geral
            </Tabs.Tab>
            <Tabs.Tab value="recurrent" leftSection={<Star size={14} />} color="orange">
              Códigos Recorrentes
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="search">
            <Stack gap="md">
              <Paper withBorder p="md" radius="md" shadow="xs">
                <TextInput
                  placeholder="Buscar por código ou descrição (Ex: 10101012 ou Consulta)..."
                  leftSection={<Search size={16} strokeWidth={1.5} />}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.currentTarget.value);
                    setPage(1);
                  }}
                  size="md"
                />
              </Paper>
              
              {renderTable(tussCodes, isSearchLoading)}

              <Group justify="center" mt="xl">
                <Pagination 
                  total={10} 
                  value={page} 
                  onChange={setPage} 
                  color="mediBlue" 
                  radius="xl"
                  withEdges
                />
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="recurrent">
            <Stack gap="md">
              <Alert icon={<Star size={16} />} title="Códigos Recorrentes" color="orange" variant="light">
                Códigos que você copiou 3 vezes ou mais aparecem aqui automaticamente para acesso rápido.
              </Alert>
              {renderTable(recurrentCodes, isRecurrentLoading)}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};
