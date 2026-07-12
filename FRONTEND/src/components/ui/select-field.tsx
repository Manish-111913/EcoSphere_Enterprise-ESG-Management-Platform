import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

export interface SelectFieldOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  id?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

const EMPTY_VALUE = '__empty__';

export default function SelectField({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  allowEmpty = false,
  disabled = false,
  id,
  triggerClassName,
  contentClassName,
}: SelectFieldProps) {
  const resolvedValue = allowEmpty && !value ? EMPTY_VALUE : value;

  return (
    <Select
      value={resolvedValue}
      onValueChange={(nextValue) => onValueChange(nextValue === EMPTY_VALUE ? '' : nextValue)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {allowEmpty && <SelectItem value={EMPTY_VALUE}>{placeholder}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
