import React, { useState } from 'react';
import {
  useInvoiceTheme,
  INVOICE_THEME_PRESETS,
  isValidHex,
} from '@/context/InvoiceThemeContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Eye,
  CheckCircle2,
  FileText,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const InvoiceColorSettings: React.FC = () => {
  const {
    appliedTheme,
    previewTheme,
    setPreviewPrimaryColor,
    setPreviewGradientFrom,
    setPreviewGradientTo,
    setPreviewDividerStyle,
    selectPreset,
    applyTheme,
    resetTheme,
    hasUnappliedChanges,
  } = useInvoiceTheme();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApply = () => {
    applyTheme();
    showToast('Invoice theme saved successfully! All invoices will now use these colors.');
  };

  const handleReset = () => {
    resetTheme();
    showToast('Reset invoice colors to DigiTechzo signature default.');
  };

  const dividerBackground =
    previewTheme.dividerStyle === 'solid'
      ? previewTheme.primaryColor
      : `linear-gradient(to right, ${previewTheme.gradientFrom}, ${previewTheme.gradientVia || previewTheme.gradientFrom}, ${previewTheme.gradientTo})`;

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#16181B] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl border border-emerald-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4 text-[#57B71B]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Overview Card */}
      <Card className="border-border shadow-card bg-white">
        <CardHeader className="py-3.5 px-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <CardTitle className="text-sm font-bold text-txt-primary flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#57B71B]" />
              In-Voice Brand & Accent Theme Studio
            </CardTitle>
            <p className="text-xs text-txt-muted mt-0.5">
              Customize the default brand colors for all generated invoices, including the header divider line, TAX INVOICE title, and summary boxes.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/invoices">
              <Button size="sm" variant="outline" className="h-7 text-xs font-semibold gap-1.5 cursor-pointer">
                <FileText className="h-3.5 w-3.5 text-[#57B71B]" />
                Open In-Voice Studio
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div
                className="h-7 w-7 rounded-md border border-slate-300 shadow-2xs shrink-0"
                style={{ backgroundColor: appliedTheme.primaryColor }}
              />
              <div>
                <span className="text-xs font-bold text-txt-primary block">
                  Active Invoice Theme: {appliedTheme.name}
                </span>
                <span className="text-[11px] text-txt-muted">
                  Primary: <code className="font-mono text-slate-700">{appliedTheme.primaryColor}</code> • Divider:{' '}
                  <code className="font-mono text-slate-700">{appliedTheme.gradientFrom} &rarr; {appliedTheme.gradientTo}</code>
                </span>
              </div>
            </div>
            {hasUnappliedChanges && (
              <Badge variant="warning" className="animate-pulse">
                Unsaved Theme Changes
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main 2-Column Grid: Left Controls, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Preset Palettes & Custom Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Preset Palettes Card */}
          <Card className="border-border shadow-card bg-white">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-bold text-txt-primary flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#57B71B]" />
                  Curated Invoice Color Presets
                </span>
                <span className="text-[10px] text-txt-muted font-normal">Click to apply instantly</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {INVOICE_THEME_PRESETS.map((preset) => {
                  const isSelected = previewTheme.id === preset.id;
                  const presetDividerBg = `linear-gradient(to right, ${preset.gradientFrom}, ${preset.gradientVia || preset.gradientFrom}, ${preset.gradientTo})`;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPreset(preset)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#57B71B] bg-emerald-50/40 ring-1 ring-[#57B71B] shadow-xs'
                          : 'border-border bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2 w-full">
                        <div>
                          <div className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                            {preset.name}
                            {isSelected && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#57B71B] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-txt-muted leading-tight mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                      </div>

                      {/* Visual Swatch: Accent Box + Horizontal Gradient Line */}
                      <div className="w-full space-y-1.5 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>TAX INVOICE Accent:</span>
                          <span
                            className="font-bold font-mono"
                            style={{ color: preset.primaryColor }}
                          >
                            {preset.primaryColor}
                          </span>
                        </div>
                        {/* The Horizontal Accent Divider Line Preview */}
                        <div
                          className="h-2 rounded-full w-full shadow-2xs"
                          style={{ background: presetDividerBg }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Custom Theme Color Inputs Card */}
          <Card className="border-border shadow-card bg-white">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-bold text-txt-primary flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-[#57B71B]" />
                Fine-Tune Custom Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* 1. Primary Accent Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-txt-primary flex items-center justify-between">
                  <span>1. Primary Accent Color (TAX INVOICE Title & Highlights)</span>
                  <span className="text-[11px] text-txt-muted font-normal">Controls title, numbers & totals</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={isValidHex(previewTheme.primaryColor) ? previewTheme.primaryColor : '#4F46E5'}
                    onChange={(e) => setPreviewPrimaryColor(e.target.value)}
                    className="h-8 w-10 p-0.5 rounded border border-border cursor-pointer bg-white"
                  />
                  <Input
                    type="text"
                    value={previewTheme.primaryColor}
                    onChange={(e) => setPreviewPrimaryColor(e.target.value)}
                    placeholder="#4F46E5"
                    className="h-8 text-xs font-mono w-32"
                  />
                  <span className="text-xs text-txt-muted font-medium truncate">
                    Hex format (e.g. #4F46E5, #57B71B, #2563EB)
                  </span>
                </div>
              </div>

              {/* 2. Accent Divider Line Style & Colors (Zoomed In Feature from user screenshot!) */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-txt-primary block">
                      2. Horizontal Accent Divider Line (Under Header)
                    </label>
                    <span className="text-[11px] text-txt-muted">
                      Controls the colored bar between the company header and client details
                    </span>
                  </div>
                  {/* Style Toggle: Gradient vs Solid */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreviewDividerStyle('gradient')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        previewTheme.dividerStyle !== 'solid'
                          ? 'bg-white text-txt-primary shadow-xs font-bold'
                          : 'text-txt-muted hover:text-txt-primary'
                      }`}
                    >
                      Gradient Line
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDividerStyle('solid')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        previewTheme.dividerStyle === 'solid'
                          ? 'bg-white text-txt-primary shadow-xs font-bold'
                          : 'text-txt-muted hover:text-txt-primary'
                      }`}
                    >
                      Solid Color
                    </button>
                  </div>
                </div>

                {previewTheme.dividerStyle === 'solid' ? (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-full rounded-full shadow-2xs"
                        style={{ backgroundColor: previewTheme.primaryColor }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Using the Primary Accent color for a clean, minimalist solid divider line.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    {/* Live preview of the gradient line */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>Divider Bar Preview:</span>
                        <span>Full Width Gradient</span>
                      </div>
                      <div
                        className="h-3 w-full rounded-full shadow-2xs border border-black/5"
                        style={{ background: dividerBackground }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Gradient Start Color */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Start Color (Left side)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={isValidHex(previewTheme.gradientFrom) ? previewTheme.gradientFrom : '#57B71B'}
                            onChange={(e) => setPreviewGradientFrom(e.target.value)}
                            className="h-7 w-8 p-0.5 rounded border border-border cursor-pointer bg-white"
                          />
                          <Input
                            type="text"
                            value={previewTheme.gradientFrom}
                            onChange={(e) => setPreviewGradientFrom(e.target.value)}
                            className="h-7 text-xs font-mono w-28"
                          />
                        </div>
                      </div>

                      {/* Gradient End Color */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          End Color (Right side)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={isValidHex(previewTheme.gradientTo) ? previewTheme.gradientTo : '#4F46E5'}
                            onChange={(e) => setPreviewGradientTo(e.target.value)}
                            className="h-7 w-8 p-0.5 rounded border border-border cursor-pointer bg-white"
                          />
                          <Input
                            type="text"
                            value={previewTheme.gradientTo}
                            onChange={(e) => setPreviewGradientTo(e.target.value)}
                            className="h-7 text-xs font-mono w-28"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="py-3 px-4 border-t border-border flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                Reset to Default
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                  className="h-8 text-xs font-semibold bg-[#57B71B] hover:bg-[#469815] text-white gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save as Default Invoice Theme
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Live Interactive Invoice Paper Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border shadow-card bg-white sticky top-4">
            <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-txt-primary flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-[#57B71B]" />
                Live Invoice Paper Preview
              </CardTitle>
              <Badge variant="neutral" className="text-[10px]">
                A4 Document Sample
              </Badge>
            </CardHeader>
            <CardContent className="p-4 bg-slate-100/70">
              {/* Miniature A4 Invoice Paper */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3 text-xs font-sans">
                {/* Header: Company Profile + TAX INVOICE */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/assets/images/logo.png"
                      alt="Digitechzo"
                      className="h-8 max-w-[80px] object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Digitechzo</h4>
                      <p className="text-[10px] text-slate-500">Suite 200, IT Park, Chennai</p>
                      <p className="text-[10px] text-slate-500 font-mono">GST: 33DIGI1234F1Z9</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <h3
                      className="text-base sm:text-lg font-black uppercase tracking-tight"
                      style={{ color: previewTheme.primaryColor }}
                    >
                      TAX INVOICE
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-rose-300 text-rose-600 bg-rose-50 text-[9px] font-extrabold uppercase mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      UNPAID
                    </span>
                  </div>
                </div>

                {/* THE ACCENT DIVIDER LINE (Exact element from user screenshot!) */}
                <div
                  className="h-[3px] rounded-full my-2.5 shadow-2xs transition-all duration-300"
                  style={{ background: dividerBackground }}
                />

                {/* Client & Invoice Meta Sample */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 bg-slate-50/70 rounded-lg border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      BILLED TO
                    </span>
                    <strong className="text-slate-800 text-xs block truncate">
                      Vortex Global Tech Solutions
                    </strong>
                    <span className="text-[10px] text-slate-500">Attn: Rajesh Kumar</span>
                  </div>

                  <div className="p-2 bg-slate-50/70 rounded-lg border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400">INVOICE #</span>
                      <strong
                        className="font-extrabold text-xs font-mono"
                        style={{ color: previewTheme.primaryColor }}
                      >
                        DIGI-2026-001
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400">DATE:</span>
                      <span className="text-slate-700 text-[10px]">17 Oct 2026</span>
                    </div>
                  </div>
                </div>

                {/* Sample Items Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden text-[10px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="py-1.5 px-2">Description</th>
                        <th className="py-1.5 px-2 text-center">Qty</th>
                        <th className="py-1.5 px-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-1.5 px-2 font-medium">Enterprise Web Application</td>
                        <td className="py-1.5 px-2 text-center">1</td>
                        <td className="py-1.5 px-2 text-right font-semibold">₹45,000</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2 font-medium">UI/UX Design System</td>
                        <td className="py-1.5 px-2 text-center">1</td>
                        <td className="py-1.5 px-2 text-right font-semibold">₹25,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Total Due Highlight Card */}
                <div
                  className="p-2.5 rounded-xl border flex items-center justify-between transition-colors"
                  style={{
                    backgroundColor: `${previewTheme.primaryColor}0D`,
                    borderColor: `${previewTheme.primaryColor}26`,
                  }}
                >
                  <div>
                    <span
                      className="font-extrabold text-[11px] uppercase tracking-tight block"
                      style={{ color: previewTheme.primaryColor }}
                    >
                      Total Amount Due
                    </span>
                    <span className="text-[9px] text-slate-500">Net Balance</span>
                  </div>
                  <span
                    className="font-black text-base font-tabular"
                    style={{ color: previewTheme.primaryColor }}
                  >
                    ₹70,000
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
