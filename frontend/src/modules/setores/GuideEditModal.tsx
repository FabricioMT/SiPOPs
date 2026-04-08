import { Modal, Button, TextInput, Textarea, Stack, Group, Text, Image, ActionIcon, LoadingOverlay, Alert } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import type { FileWithPath } from '@mantine/dropzone';
import { useState, useEffect } from 'react';
import { Camera, X, Upload, Check, Trash } from 'lucide-react';
import { onboardingApi } from '../../api/onboarding';
import { notifications } from '@mantine/notifications';

interface GuideEditModalProps {
  opened: boolean;
  onClose: () => void;
  guide: any; // Can be SPDATAGuide or a protocol-step object
}

export const GuideEditModal = ({ opened, onClose, guide }: GuideEditModalProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (guide) {
      setTitle(guide.title || '');
      setContent(guide.content || '');
      setImage(guide.image_path || null);
      setFile(null);
    }
  }, [guide, opened]);

  const handleUpload = async (file: FileWithPath) => {
    setFile(file);
    setImage(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!guide) return;
    setLoading(true);
    try {
      // If it's a protocol step, we use the items CRUD
      if (guide.protocol_id || guide.sop_id) {
        // If it already has an item ID, update it
        if (guide.item_id) {
          await onboardingApi.updateItem(guide.item_id, {
            title,
            content,
          });
          if (file) await onboardingApi.uploadAsset(guide.item_id, file);
        } else {
          // Otherwise, create a new item
          const newItem = await onboardingApi.createItem({
            title,
            content,
            protocol_id: guide.protocol_id,
            sop_id: guide.sop_id,
            order_index: guide.order_index,
            sector_slug: guide.sector_slug || 'general'
          });
          if (file) await onboardingApi.uploadAsset(newItem.id, file);
        }
      } else {
        // Fallback for sector guides (legacy)
        await onboardingApi.updateGuide(guide.id, {
          title,
          content,
        });
        if (file) await onboardingApi.uploadAsset(guide.id, file);
      }

      notifications.show({
        title: 'Sucesso',
        message: 'Guia atualizado com sucesso!',
        color: 'green',
        icon: <Check size={18} />,
      });
      onClose();
    } catch (error) {
      console.error(error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível salvar as alterações.',
        color: 'red',
        icon: <X size={18} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={`Editar Manual: ${guide?.title || ''}`}
      size="lg"
      radius="md"
    >
      <LoadingOverlay visible={loading} />
      <Stack gap="md">
        <TextInput
          label="Título do Passo/Instrução"
          placeholder="Ex: Primeiros Passos no Portal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Textarea
          label="Instruções (Markdown suportado)"
          placeholder="Descreva o que o colaborador deve fazer..."
          minRows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />

        <Stack gap={4}>
          <Text size="sm" fw={500}>Captura de Tela (Asset)</Text>
          
          {image ? (
            <div style={{ position: 'relative' }}>
              <Image 
                src={image} 
                radius="md" 
                h={250} 
                fit="contain" 
                style={{ border: '2px solid #eee' }}
              />
              <ActionIcon 
                variant="filled" 
                color="red" 
                radius="xl"
                style={{ position: 'absolute', top: 10, right: 10 }}
                onClick={() => {
                  setImage(null);
                  setFile(null);
                }}
              >
                <Trash size={16} />
              </ActionIcon>
            </div>
          ) : (
            <Dropzone
              onDrop={(files) => handleUpload(files[0])}
              maxSize={5 * 1024 ** 2}
              accept={IMAGE_MIME_TYPE}
              radius="md"
              styles={{
                root: {
                  border: '2px dashed #046c44',
                  backgroundColor: '#f0fdf4',
                  '&:hover': {
                    backgroundColor: '#dcfce7',
                  }
                }
              }}
            >
              <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <Upload size={40} color="#046c44" />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <X size={40} color="red" />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <Camera size={40} color="#046c44" />
                </Dropzone.Idle>

                <div>
                  <Text size="xl" inline c="sipopsGreen" fw={700}>
                    Arraste a imagem aqui
                  </Text>
                  <Text size="sm" c="dimmed" inline mt={7}>
                    PNG ou JPG até 5MB
                  </Text>
                </div>
              </Group>
            </Dropzone>
          )}
        </Stack>

        <Alert icon={<Camera size={16} />} title="Importante" color="blue" radius="md">
          Imagens com timestamp ajudam a evitar cache no navegador dos colaboradores.
        </Alert>

        <Group justify="flex-end" mt="md">
          <Button variant="outline" color="gray" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            color="#046c44"
            leftSection={<Check size={18} />}
          >
            Salvar Alterações
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
