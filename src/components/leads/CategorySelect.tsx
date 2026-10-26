import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Check,
  Tag,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_LEAD_CATEGORIES,
  getAllCategories,
  addCustomCategory,
  removeCustomCategory,
  CATEGORIES_UPDATED_EVENT,
} from '@/lib/categories';

export const LEAD_CATEGORIES = DEFAULT_LEAD_CATEGORIES;
export type LeadCategory = string;

interface CategorySelectProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  id?: string;
  extraCategories?: string[];
  className?: string;
  allowAddNew?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value = '',
  onChange,
  disabled = false,
  required = false,
  placeholder = 'Type category or choose from list...',
  id,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [customListVersion, setCustomListVersion] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Listen for storage / cross-component category updates
  useEffect(() => {
    const handleUpdate = () => {
      setCustomListVersion((v) => v + 1);
    };
    window.addEventListener(CATEGORIES_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(CATEGORIES_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Clean slate: strictly track categories explicitly confirmed and saved by admin
  const allCategories = useMemo(() => {
    return getAllCategories([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customListVersion]);

  // Filter categories dynamically: ONLY show when user has started typing
  const filteredCategories = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    // When input is blank, do NOT show any dropdown list
    if (!q) return [];
    return allCategories.filter((cat) => cat.toLowerCase().includes(q));
  }, [allCategories, value]);

  // Does the typed text exactly match an existing category?
  const hasExactMatch = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return false;
    return allCategories.some((cat) => cat.toLowerCase() === q);
  }, [allCategories, value]);

  // Click outside listener to close downlist
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDeleteCategory = (e: React.MouseEvent, category: string) => {
    e.stopPropagation();
    removeCustomCategory(category);
    if (value.trim().toLowerCase() === category.trim().toLowerCase()) {
      onChange('');
    }
  };

  const handleSelect = (category: string) => {
    const clean = category.trim();
    onChange(clean);
    addCustomCategory(clean);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(true);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
      setHighlightedIndex((prev) =>
        prev < filteredCategories.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredCategories.length) {
        e.preventDefault();
        handleSelect(filteredCategories[highlightedIndex]);
      } else if (value && value.trim()) {
        addCustomCategory(value.trim());
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Direct Editable Text Input */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          required={required}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full h-8 rounded-input border border-border bg-white pl-2.5 pr-14 text-xs text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle hover:border-slate-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        />

        {/* Action Buttons inside Input */}
        <div className="absolute right-1.5 flex items-center gap-1">
          {/* Add/Save Category Check Icon when user typed a category */}
          {value.trim().length >= 2 && !disabled && (
            <button
              type="button"
              onClick={() => handleSelect(value)}
              className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors"
              title="Save category to list"
              tabIndex={-1}
            >
              <Check className="h-3.5 w-3.5 font-bold" />
            </button>
          )}

          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              title="Clear category"
              tabIndex={-1}
            >
              <X className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer transition-transform"
            tabIndex={-1}
            title="Toggle category list"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Downlist Dropdown: ONLY show when user has started typing or there are matching categories */}
      {isOpen && !disabled && (value.trim().length > 0 || filteredCategories.length > 0) && (
        <div
          ref={listRef}
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg text-xs max-h-56 overflow-y-auto py-1 animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* If user typed a custom category not yet in list, offer to use it directly */}
          {value.trim() && !hasExactMatch && (
            <button
              type="button"
              onClick={() => handleSelect(value)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 font-medium transition-colors border-b border-emerald-100 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Use &quot;<strong className="text-emerald-900">{value.trim()}</strong>&quot;</span>
              <span className="ml-auto text-[10px] text-emerald-600 font-normal uppercase tracking-wider shrink-0">New</span>
            </button>
          )}

          {/* List of matching categories */}
          {filteredCategories.length > 0 && (
            <div className="py-0.5">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-txt-muted uppercase tracking-wider flex items-center justify-between">
                <span>Matching Categories ({filteredCategories.length})</span>
                <span className="text-[9px] font-normal lowercase">click to select</span>
              </div>

              {filteredCategories.map((cat, idx) => {
                const isSelected = value.trim().toLowerCase() === cat.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={cat}
                    onClick={() => handleSelect(cat)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`group w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : isHighlighted
                        ? 'bg-slate-100 text-txt-primary'
                        : 'text-txt-primary hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Tag className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{cat}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      <span
                        role="button"
                        onClick={(e) => handleDeleteCategory(e, cat)}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                        title="Remove category"
                      >
                        <Trash2 className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
