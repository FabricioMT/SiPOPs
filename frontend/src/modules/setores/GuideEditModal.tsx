import { Modal, TextInput, Textarea, NumberInput, Button, Stack, Group, LoadingOverlay } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '../../api/onboarding';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';

interface GuideEditModalProps {
  opened: boolean;
  onClose: () => void;
  guide: {
    id: number;
    title: string;
    content: string | null;
    order_index: number;
  } | null;
}

export const GuideEditModal = ({ opened, onClose, guide }: GuideEditModalProps) => {
  const queryClient = useQueryClient();

  const form = useForm({
    initialValues: {
      title: '',
      content: '',
      order_index: 0,
    },
    validate: {
      title: (value) => (value.length < 2 ? 'Título muito curto' : null),
    },
  });

  useEffect(() => {
    if (guide) {
      form.setValues({
        title: guide.title,
        content: guide.content || '',
        order_index: guide.order_index,
      });
    }
  }, [guide]);

  const mutation = useMutation({
    mutationFn: (values: typeof form.values) => 
      onboardingApi.updateGuide(guide!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spdata-guides'] });
      notifications.show({
        title: 'Sucesso',
        message: 'Guia atualizado com sucesso',
        color: 'green',
      });
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.detail || 'Erro ao atualizar guia',
        color: 'red',
      });
    },
  });

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title="Editar Guia SPDATA"
      centered
      size="lg"
    >
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack style={{ position: 'relative' }}>
          <LoadingOverlay visible={mutation.isPending} />
          
          <TextInput
            label="Título do Passo"
            placeholder="Ex: Abrir ficha de atendimento"
            required
            {...form.getInputProps('title')}
          />

          <Textarea
            label="Instruções Detalhadas"
            placeholder="Descreva o passo a passo..."
            minRows={5}
            autosize
            {...form.getInputProps('content')}
          />

          <NumberInput
            label="Ordem de Exibição"
            description="Define a posição na lista (números menores aparecem primeiro)"
            {...form.getInputProps('order_index')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>Cancelar</Button>
            <Button type="submit" color="mediBlue" loading={mutation.isPending}>Salvar Alterações</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
