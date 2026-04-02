import { Modal, Stack, Group, Text, Progress, Paper, ScrollArea, Loader, Center, Badge } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { onboardingApi } from '../../api/onboarding';
import type { ProgressResponse } from '../../api/onboarding';
import { CheckCircle } from 'lucide-react';

interface UserProgressModalProps {
  opened: boolean;
  onClose: () => void;
  userId: number | null;
  userName: string | null;
}

export const UserProgressModal = ({ opened, onClose, userId, userName }: UserProgressModalProps) => {
  const { data: progress, isLoading } = useQuery({
    queryKey: ['user-progress', userId],
    queryFn: () => onboardingApi.getUserAllProgress(userId!),
    enabled: !!userId && opened,
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700}>Progresso de Onboarding: {userName}</Text>}
      size="lg"
      radius="md"
    >
      <ScrollArea.Autosize mah={500} type="always">
        {isLoading ? (
          <Center py="xl">
            <Loader size="md" />
          </Center>
        ) : (
          <Stack gap="md" py="xs">
            {progress?.map((p: ProgressResponse) => (
              <Paper key={p.playlist_id} withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600} size="sm">{p.playlist_title}</Text>
                    <Badge color={p.percentage === 100 ? 'green' : 'blue'} variant="light">
                      {p.percentage}%
                    </Badge>
                  </Group>
                  <Progress 
                    value={p.percentage} 
                    color={p.percentage === 100 ? 'green' : 'blue'} 
                    size="sm" 
                    radius="xl"
                    animated={p.percentage > 0 && p.percentage < 100}
                  />
                  <Group gap="xs" mt={4}>
                    <Text size="xs" c="dimmed">
                      {p.read_count} de {p.total_count} lidos
                    </Text>
                    {p.percentage === 100 && (
                      <Group gap={4}>
                        <CheckCircle size={14} color="var(--mantine-color-green-6)" />
                        <Text size="xs" c="green" fw={500}>Concluído</Text>
                      </Group>
                    )}
                  </Group>
                </Stack>
              </Paper>
            ))}
            {progress?.length === 0 && (
              <Center py="xl">
                <Text c="dimmed" size="sm">Nenhuma trilha de onboarding encontrada.</Text>
              </Center>
            )}
          </Stack>
        )}
      </ScrollArea.Autosize>
    </Modal>
  );
};
