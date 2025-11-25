/**
 * FormField Component
 * WhatsApp SaaS Platform
 *
 * Generic form field wrapper for React Hook Form
 */

'use client';

import React, { memo } from 'react';
import { useFormContext, FieldValues, Path } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';

export interface FormFieldProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'date' | 'time' | 'datetime-local' | 'textarea';
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  rows?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const FormField = memo(function FormField<T extends FieldValues = FieldValues>({
  name,
  label,
  type = 'text',
  placeholder,
  hint,
  disabled = false,
  className,
  inputClassName,
  rows = 3,
  leftIcon,
  rightIcon,
}: FormFieldProps<T>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();

  const error = errors[name]?.message as string | undefined;

  const fieldProps = {
    ...register(name),
    disabled,
    placeholder,
    hint: error ? undefined : hint,
    error,
    className: inputClassName,
    leftIcon,
    rightIcon,
  };

  return (
    <div className={cn('w-full', className)}>
      {type === 'textarea' ? (
        <Textarea
          {...fieldProps}
          label={label}
          rows={rows}
        />
      ) : (
        <Input
          {...fieldProps}
          label={label}
          type={type}
        />
      )}
    </div>
  );
});

FormField.displayName = 'FormField';
