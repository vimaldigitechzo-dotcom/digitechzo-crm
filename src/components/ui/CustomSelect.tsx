import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (CustomSelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  id,
  name,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fallbackId = useId();
  const selectId = id || fallbackId;

  // Normalize options into CustomSelectOption format
  const normalizedOptions: CustomSelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Toggle dropdown and detect viewport space
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 210px below and more room above, open upwards
      setOpenUpward(spaceBelow < 210 && rect.top > spaceBelow);
    }
    setIsOpen((prev) => !prev);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Scroll active item into view on open
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative w-full min-w-0', className)}>
      {/* Hidden input for HTML5 form validation */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          name={name}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary flex items-center justify-between gap-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors text-left min-w-0 shadow-subtle',
          disabled && 'opacity-60 cursor-not-allowed bg-slate-50',
          isOpen && 'border-primary ring-1 ring-primary',
          buttonClassName
        )}
      >
        <span
          className={cn(
            'truncate flex-1 text-left min-w-0',
            !selectedOption ? 'text-txt-muted' : 'text-txt-primary'
          )}
          title={selectedOption ? selectedOption.label : placeholder}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-txt-muted shrink-0 transition-transform duration-200 pointer-events-none',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>

      {/* Dropdown Menu - bounded 100% to input width, never overflows screen */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          role="listbox"
          tabIndex={-1}
          className={cn(
            'absolute left-0 right-0 z-[100] w-full max-h-56 overflow-y-auto rounded-input border border-border bg-white p-1 shadow-lg text-xs animate-in fade-in-50 duration-100',
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1',
            dropdownClassName
          )}
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-2.5 py-2 text-center text-txt-muted italic">No options available</div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected ? 'true' : 'false'}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  title={opt.label}
                  className={cn(
                    'w-full px-2.5 py-1.5 text-left text-xs rounded-sm transition-colors flex items-center justify-between gap-2 cursor-pointer min-w-0',
                    isSelected
                      ? 'bg-[#F0FDF4] text-[#57B71B] font-semibold'
                      : 'text-txt-primary hover:bg-slate-50'
                  )}
                >
                  <span className="truncate flex-1 min-w-0">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-[#57B71B] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
