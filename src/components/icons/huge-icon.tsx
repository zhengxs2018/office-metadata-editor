import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';

export interface HugeIconProps {
  icon: IconSvgElement;
  altIcon?: IconSvgElement;
  showAlt?: boolean;
  /** 紧凑桌面端默认 16px */
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

export const HugeIcon: React.FC<HugeIconProps> = ({
  icon,
  altIcon,
  showAlt,
  size = 16,
  strokeWidth = 1.8,
  color = 'currentColor',
  className,
}) => (
  <HugeiconsIcon
    icon={icon}
    altIcon={altIcon}
    showAlt={showAlt}
    size={size}
    strokeWidth={strokeWidth}
    color={color}
    className={className}
  />
);
