import { useState, useEffect } from 'react';
import { Text, Group, Tooltip, ThemeIcon } from '@mantine/core';
import { Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function TokenTimer() {
  const getTokenExpiration = useAuthStore((state) => state.getTokenExpiration);
  const [timeLeft, setTimeLeft] = useState<string>('--:--');
  const [isLow, setIsLow] = useState(false);

  useEffect(() => {
    const expTime = getTokenExpiration();
    if (!expTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffStr = expTime - now;

      if (diffStr <= 0) {
        setTimeLeft('00:00');
        clearInterval(interval);
        return;
      }

      // Convert diff to mm:ss
      const totalSeconds = Math.floor(diffStr / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setIsLow(totalSeconds < 300); // less than 5 mins
      setTimeLeft(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [getTokenExpiration]);

  return (
    <Tooltip label="Tempo de validade da sessão" position="right" withArrow>
      <Group gap="xs">
        <ThemeIcon variant="light" color={isLow ? 'red' : 'gray'} size="sm">
          <Clock size="1rem" />
        </ThemeIcon>
        <Text size="xs" c={isLow ? 'red' : 'dimmed'} fw={600}>
          Sessão: {timeLeft}
        </Text>
      </Group>
    </Tooltip>
  );
}
