import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { theme } from '../theme';

/**
 * Custom render that wraps the component with MantineProvider + MemoryRouter.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...renderOptions }: RenderOptions & { route?: string } = {}
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <MantineProvider theme={theme}>
        {ui}
      </MantineProvider>
    </MemoryRouter>,
    renderOptions
  );
}
