import { DirectionProvider, MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import type { PropsWithChildren } from 'react';

import { mantineTheme } from '../theme/mantineTheme';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <DirectionProvider initialDirection="rtl">
      <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
        <ModalsProvider
          labels={{
            confirm: 'אישור',
            cancel: 'ביטול',
          }}
          modalProps={{
            dir: 'rtl',
            withinPortal: true,
          }}
        >
          {children}
          <Notifications position="top-left" zIndex={1000} />
        </ModalsProvider>
      </MantineProvider>
    </DirectionProvider>
  );
}
