import React from 'react';
import { Cpu, Zap } from 'lucide-react';

interface HeavyTaskToggleProps {
  isHeavyTask: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export const HeavyTaskToggle: React.FC<HeavyTaskToggleProps> = () => {
  return null;
};
