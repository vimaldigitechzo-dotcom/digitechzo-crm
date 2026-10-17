import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface InvoiceColorTheme {
  id: string;
  name: string;
  primaryColor: string;       // Accent for "TAX INVOICE", Invoice #, Total due box, badges, section titles
  gradientFrom: string;       // Start color of the horizontal accent divider line
  gradientVia?: string;       // Middle transition color
  gradientTo: string;         // End color of the horizontal accent divider line
  dividerStyle?: 'gradient' | 'solid'; // Whether the accent divider line is a gradient or solid color
  description?: string;
}

export const DEFAULT_INVOICE_THEME: InvoiceColorTheme = {
  id: 'digitechzo_signature',
  name: 'DigiTechzo Signature',
  primaryColor: '#4F46E5', // Indigo
  gradientFrom: '#57B71B', // DigiTechzo Green
  gradientVia: '#34D399',  // Emerald
  gradientTo: '#4F46E5',   // Indigo
  dividerStyle: 'gradient',
  description: 'Signature DigiTechzo green-to-indigo gradient with modern indigo headings',
};

export const INVOICE_THEME_STORAGE_KEY = 'digitechzo_invoice_theme';

export function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

export function hexToRgba(hex: string, alpha: number = 1): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
  if (clean.length !== 6) return `rgba(79, 70, 229, ${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(79, 70, 229, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const INVOICE_THEME_PRESETS: InvoiceColorTheme[] = [
  DEFAULT_INVOICE_THEME,
  {
    id: 'digitechzo_green',
    name: 'DigiTechzo Green & Emerald',
    primaryColor: '#57B71B',
    gradientFrom: '#57B71B',
    gradientVia: '#10B981',
    gradientTo: '#059669',
    dividerStyle: 'gradient',
    description: 'Fresh DigiTechzo brand green accent line and headings',
  },
  {
    id: 'royal_sapphire',
    name: 'Royal Sapphire & Cobalt',
    primaryColor: '#2563EB',
    gradientFrom: '#3B82F6',
    gradientVia: '#60A5FA',
    gradientTo: '#1D4ED8',
    dividerStyle: 'gradient',
    description: 'Corporate royal blue gradient and high-contrast sapphire accents',
  },
  {
    id: 'modern_violet',
    name: 'Luxury Violet & Purple',
    primaryColor: '#7C3AED',
    gradientFrom: '#8B5CF6',
    gradientVia: '#A78BFA',
    gradientTo: '#6D28D9',
    dividerStyle: 'gradient',
    description: 'Refined violet gradient for modern tech agencies',
  },
  {
    id: 'executive_slate',
    name: 'Executive Slate & Charcoal',
    primaryColor: '#0F172A',
    gradientFrom: '#1E293B',
    gradientVia: '#475569',
    gradientTo: '#0F172A',
    dividerStyle: 'gradient',
    description: 'Formal, minimalist dark graphite accent',
  },
  {
    id: 'sunset_crimson',
    name: 'Sunset Crimson & Rose',
    primaryColor: '#E11D48',
    gradientFrom: '#F43F5E',
    gradientVia: '#FB7185',
    gradientTo: '#BE123C',
    dividerStyle: 'gradient',
    description: 'Bold ruby crimson gradient with high visual impact',
  },
  {
    id: 'warm_amber',
    name: 'Warm Amber & Gold',
    primaryColor: '#D97706',
    gradientFrom: '#F59E0B',
    gradientVia: '#FBBF24',
    gradientTo: '#D97706',
    dividerStyle: 'gradient',
    description: 'Warm gold and amber gradient for enterprise billing',
  },
  {
    id: 'ocean_teal',
    name: 'Oceanic Teal & Mint',
    primaryColor: '#0D9488',
    gradientFrom: '#14B8A6',
    gradientVia: '#2DD4BF',
    gradientTo: '#0F766E',
    dividerStyle: 'gradient',
    description: 'Vibrant turquoise-teal gradient line',
  },
];

interface InvoiceThemeContextType {
  appliedTheme: InvoiceColorTheme;
  previewTheme: InvoiceColorTheme;
  setPreviewPrimaryColor: (color: string) => void;
  setPreviewGradientFrom: (color: string) => void;
  setPreviewGradientVia: (color: string) => void;
  setPreviewGradientTo: (color: string) => void;
  setPreviewDividerStyle: (style: 'gradient' | 'solid') => void;
  selectPreset: (theme: InvoiceColorTheme) => void;
  applyTheme: () => void;
  resetTheme: () => void;
  hasUnappliedChanges: boolean;
  saveCustomTheme: (theme: InvoiceColorTheme) => void;
}

const InvoiceThemeContext = createContext<InvoiceThemeContextType | undefined>(undefined);

export const InvoiceThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appliedTheme, setAppliedTheme] = useState<InvoiceColorTheme>(() => {
    try {
      const stored = localStorage.getItem(INVOICE_THEME_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isValidHex(parsed.primaryColor) && isValidHex(parsed.gradientFrom) && isValidHex(parsed.gradientTo)) {
          return {
            ...DEFAULT_INVOICE_THEME,
            ...parsed,
          };
        }
      }
    } catch {
      // Fallback on parse failure
    }
    return DEFAULT_INVOICE_THEME;
  });

  const [previewTheme, setPreviewTheme] = useState<InvoiceColorTheme>(appliedTheme);

  // Sync preview theme if appliedTheme changes from outside
  useEffect(() => {
    setPreviewTheme(appliedTheme);
  }, [appliedTheme]);

  const setPreviewPrimaryColor = (color: string) => {
    setPreviewTheme((prev) => ({
      ...prev,
      primaryColor: color,
      id: 'custom',
      name: 'Custom Palette',
    }));
  };

  const setPreviewGradientFrom = (color: string) => {
    setPreviewTheme((prev) => ({
      ...prev,
      gradientFrom: color,
      id: 'custom',
      name: 'Custom Palette',
    }));
  };

  const setPreviewGradientVia = (color: string) => {
    setPreviewTheme((prev) => ({
      ...prev,
      gradientVia: color,
      id: 'custom',
      name: 'Custom Palette',
    }));
  };

  const setPreviewGradientTo = (color: string) => {
    setPreviewTheme((prev) => ({
      ...prev,
      gradientTo: color,
      id: 'custom',
      name: 'Custom Palette',
    }));
  };

  const setPreviewDividerStyle = (style: 'gradient' | 'solid') => {
    setPreviewTheme((prev) => ({
      ...prev,
      dividerStyle: style,
    }));
  };

  const selectPreset = (preset: InvoiceColorTheme) => {
    setPreviewTheme(preset);
  };

  const applyTheme = () => {
    setAppliedTheme(previewTheme);
    try {
      localStorage.setItem(INVOICE_THEME_STORAGE_KEY, JSON.stringify(previewTheme));
    } catch (e) {
      console.error('Failed to save invoice theme to localStorage:', e);
    }
  };

  const saveCustomTheme = (theme: InvoiceColorTheme) => {
    setAppliedTheme(theme);
    setPreviewTheme(theme);
    try {
      localStorage.setItem(INVOICE_THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch (e) {
      console.error('Failed to save invoice theme to localStorage:', e);
    }
  };

  const resetTheme = () => {
    setPreviewTheme(DEFAULT_INVOICE_THEME);
    setAppliedTheme(DEFAULT_INVOICE_THEME);
    try {
      localStorage.removeItem(INVOICE_THEME_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove invoice theme from localStorage:', e);
    }
  };

  const hasUnappliedChanges =
    previewTheme.primaryColor !== appliedTheme.primaryColor ||
    previewTheme.gradientFrom !== appliedTheme.gradientFrom ||
    previewTheme.gradientTo !== appliedTheme.gradientTo ||
    previewTheme.gradientVia !== appliedTheme.gradientVia ||
    previewTheme.dividerStyle !== appliedTheme.dividerStyle;

  return (
    <InvoiceThemeContext.Provider
      value={{
        appliedTheme,
        previewTheme,
        setPreviewPrimaryColor,
        setPreviewGradientFrom,
        setPreviewGradientVia,
        setPreviewGradientTo,
        setPreviewDividerStyle,
        selectPreset,
        applyTheme,
        resetTheme,
        hasUnappliedChanges,
        saveCustomTheme,
      }}
    >
      {children}
    </InvoiceThemeContext.Provider>
  );
};

export const useInvoiceTheme = (): InvoiceThemeContextType => {
  const context = useContext(InvoiceThemeContext);
  if (!context) {
    throw new Error('useInvoiceTheme must be used within an InvoiceThemeProvider');
  }
  return context;
};
