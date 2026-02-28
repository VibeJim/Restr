import React from 'react';
import { cn } from '@/lib/utils';

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
  max?: number;
  className?: string;
}

export function Rating({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  max = 5,
  className
}: RatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  const handleClick = (starValue: number) => {
    if (!disabled && !readOnly && onChange) {
      onChange(starValue);
    }
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={disabled || readOnly}
          className={cn(
            "text-2xl transition-colors",
            disabled || readOnly ? "cursor-default" : "cursor-pointer",
            star <= value ? "text-yellow-400" : "text-neutral-300",
            !disabled && !readOnly && "hover:text-yellow-400"
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
} 