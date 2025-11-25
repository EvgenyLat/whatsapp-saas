/**
 * DateRangePicker Component
 * Custom date range selector for analytics
 */

'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: Array<{
    label: string;
    getValue: () => DateRange;
  }>;
  className?: string;
}

const defaultPresets = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date();
      return { startDate: today, endDate: today };
    },
  },
  {
    label: 'Last 7 days',
    getValue: () => {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      return { startDate: lastWeek, endDate: today };
    },
  },
  {
    label: 'Last 30 days',
    getValue: () => {
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setDate(today.getDate() - 30);
      return { startDate: lastMonth, endDate: today };
    },
  },
  {
    label: 'Last 90 days',
    getValue: () => {
      const today = new Date();
      const last90Days = new Date(today);
      last90Days.setDate(today.getDate() - 90);
      return { startDate: last90Days, endDate: today };
    },
  },
  {
    label: 'This month',
    getValue: () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: firstDay, endDate: today };
    },
  },
  {
    label: 'Last month',
    getValue: () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: firstDay, endDate: lastDay };
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  presets = defaultPresets,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDateRange = (range: DateRange) => {
    return `${format(range.startDate, 'MMM d, yyyy')} - ${format(range.endDate, 'MMM d, yyyy')}`;
  };

  const handlePresetClick = (preset: typeof defaultPresets[0]) => {
    onChange(preset.getValue());
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start gap-2 sm:w-auto"
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm">{formatDateRange(value)}</span>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
            <div className="space-y-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
