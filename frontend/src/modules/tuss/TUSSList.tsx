import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Title, Text, Container, TextInput, Table, Paper, Group, Stack, Center, Loader, Alert, Pagination, rem } from '@mantine/core';
import { Search, Hash, Info } from 'lucide-react';
import { useDebouncedValue } from '@mantine/hooks';
import apiClient from '../../api/client';

export const TUSSList = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 500);
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data: tussCodes, isLoading, error } = useQuery({
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
  });

  if (error) {
    return (
      <Container size="lg" py="xl">
        <Alert icon={<Info size={16} />} title="Erro" color="red">
          Não foi possível carregar a tabela TUSS. Verifique se o servidor está rodando.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1} c="mediBlue">Tabela TUSS</Title>
          <Text c="dimmed">
            Consulta rápida à Terminologia Unificada da Saúde Suplementar.
          </Text>
        </Stack>

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

        <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }} shadow="sm">
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover striped>
            <Table.Thead bg="var(--mantine-color-blue-light)">
              <Table.Tr>
                <Table.Th style={{ width: rem(180) }}>Código TUSS</Table.Th>
                <Table.Th>Descrição do Procedimento</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={2}>
                    <Center py="xl">
                      <Stack align="center" gap="xs">
                        <Loader size="md" type="dots" color="mediBlue" />
                        <Text size="sm" c="dimmed">Buscando na base de dados...</Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : tussCodes?.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={2}>
                    <Center py="xl">
                      <Stack align="center" gap="xs">
                        <Info size={32} color="var(--mantine-color-gray-4)" />
                        <Text size="sm" c="dimmed">Nenhum código encontrado para "{search}".</Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                tussCodes?.map((item: any) => (
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
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>

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
    </Container>
  );
};
