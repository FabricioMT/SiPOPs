import { Modal, Stack, Text, Divider, Group, ThemeIcon, ScrollArea, Image, SimpleGrid } from '@mantine/core';
import { Info, Users, UserCheck } from 'lucide-react';

interface Protocol {
  id: number;
  title: string;
  content: string | null;
  patient_type: 'externo' | 'interno';
  images_json: string | null; // JSON array of URLs
}

interface ProtocolModalProps {
  opened: boolean;
  onClose: () => void;
  protocol: Protocol | null;
}

export const ProtocolModal = ({ opened, onClose, protocol }: ProtocolModalProps) => {
  if (!protocol) return null;

  const images: string[] = protocol.images_json ? JSON.parse(protocol.images_json) : [];

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={
        <Group gap="xs">
          <ThemeIcon 
            variant="light" 
            color={protocol.patient_type === 'externo' ? 'blue' : 'teal'}
          >
            {protocol.patient_type === 'externo' ? <Users size={16} /> : <UserCheck size={16} />}
          </ThemeIcon>
          <Text fw={700}>Protocolo: {protocol.title}</Text>
        </Group>
      }
      size="lg"
      radius="md"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        <Divider />
        
        <Group align="flex-start" wrap="nowrap" gap="sm">
          <ThemeIcon variant="subtle" color="gray">
            <Info size={16} />
          </ThemeIcon>
          <Stack gap={4}>
            <Text size="sm" fw={600} c="dimmed">Instruções Técnicas</Text>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {protocol.content || 'Nenhuma instrução detalhada cadastrada.'}
            </Text>
          </Stack>
        </Group>

        {images.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={600} c="dimmed">Imagens de Referência</Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {images.map((url, i) => (
                <Image 
                  key={i} 
                  src={url} 
                  radius="md" 
                  fallbackSrc="https://placehold.co/600x400?text=Logo+Não+Disponível" 
                  alt={`Protocol image ${i + 1}`}
                />
              ))}
            </SimpleGrid>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
};
