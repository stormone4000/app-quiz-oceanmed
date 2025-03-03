import React from 'react';
import { cn } from '../../lib/utils';

interface DotPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  spacing?: number;
  radius?: number;
  dotColor?: string;
  className?: string;
  patternClassName?: string;
}

export function DotPattern({
  size = 1,
  spacing = 16,
  radius = 1.5,
  dotColor = 'rgba(255, 255, 255, 0.2)',
  className,
  patternClassName,
  ...props
}: DotPatternProps) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)} {...props}>
      <div
        className={cn("absolute inset-0 z-0", patternClassName)}
        style={{
          backgroundImage: `radial-gradient(${dotColor} ${size}px, transparent 0)`,
          backgroundSize: `${spacing}px ${spacing}px`,
          backgroundPosition: `0 0, ${spacing / 2}px ${spacing / 2}px`,
          maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 40%, transparent 70%)',
        }}
      />
      {props.children}
    </div>
  );
} 