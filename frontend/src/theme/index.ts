import { createTheme, type MantineColorsTuple } from '@mantine/core';

const sipopsGreen: MantineColorsTuple = [
  '#e8f5f0', // 0 — background sutil
  '#cce8dd', // 1 — badges leves
  '#a1c9b9', // 2 — bordas e dividers
  '#7bb8a4', // 3 — ícones secundários
  '#64a48c', // 4 — elementos de apoio
  '#549c7c', // 5 — hover em botões
  '#449474', // 6 — botões secundários
  '#26805e', // 7 — cor primária de texto
  '#046c44', // 8 — PRIMARY (botões, links, destaques)
  '#034f32', // 9 — dark mode (texto e borda escura)
];

export const theme = createTheme({
  primaryColor: 'sipopsGreen',
  colors: {
    sipopsGreen,
  },
  fontFamily: 'Inter, sans-serif',
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        fw: 500,
      },
    },
  },
});
