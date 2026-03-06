import { createTheme, type MantineColorsTuple } from '@mantine/core';

const mediBlue: MantineColorsTuple = [
  '#ebf5ff',
  '#d6eaff',
  '#abd4ff',
  '#7dbdff',
  '#59a9ff',
  '#449cff',
  '#3996ff',
  '#2b83e4',
  '#2074cd',
  '#0064b7'
];

export const theme = createTheme({
  primaryColor: 'mediBlue',
  colors: {
    mediBlue,
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
