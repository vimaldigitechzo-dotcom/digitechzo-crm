import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterPills, FilterOption } from '@/components/common/FilterPills';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authApi, crmApi } from '@/lib/api';
import {
  Sliders,
  Building2,
  Tags,
  Cpu,
  ShieldAlert,
  Globe2,
  Layers,
  Database,
  Phone,
  MessageSquare,
  HardDrive,
  RotateCcw,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Palette,
} from 'lucide-react';
import { NavbarColorSettings } from '@/components/settings/NavbarColorSettings';
import { InvoiceColorSettings } from '@/components/settings/InvoiceColorSettings';

const SETTINGS_TABS: FilterOption[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Navbar & Appearance' },
  { id: 'invoice-theme', label: 'In-Voice Theme & Colors' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'taxonomies', label: 'Taxonomies' },
  { id: 'adapters', label: 'Adapters' },
];

const LEAD_SOURCES = [
  { code: 'META_ADS', label: 'Meta Ads (Facebook / Instagram)', channelType: 'Digital Inbound' },
  { code: 'GOOGLE_ADS', label: 'Google Search & Display Ads', channelType: 'Digital Inbound' },
  { code: 'WEBSITE_FORM', label: 'Inbound Website Contact Form', channelType: 'Organic Direct' },
  { code: 'WHATSAPP', label: 'Inbound WhatsApp Inquiries', channelType: 'Messaging' },
  { code: 'MANUAL', label: 'Direct BDE Manual Entry', channelType: 'Outbound' },
  { code: 'IMPORT', label: 'CSV / Bulk Excel Import', channelType: 'Batch Upload' },
  { code: 'PHONE_INBOUND', label: 'Direct Inbound Telephony Calls', channelType: 'Voice Inbound' },
];

const SERVICE_LINES = [
  { name: 'Custom Web Application Development', domain: 'Full-Stack Software' },
  { name: 'Digital Marketing & Performance Ads', domain: 'Growth & Acquisition' },
  { name: 'Mobile App Development (iOS / Android)', domain: 'Native Mobile Engineering' },
  { name: 'SEO & Organic Growth', domain: 'Search Marketing' },
  { name: 'Cloud Infrastructure & DevOps Migration', domain: 'Cloud & Infrastructure' },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('general');

  // Queries for live data
  const authQuery = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authApi.getMe(),
  });

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: () => crmApi.getHealth(),
    refetchInterval: 30000,
  });

  const stagesQuery = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => crmApi.getPipelineStages(),
  });

  const dealsQuery = useQuery({
    queryKey: ['deals'],
    queryFn: () => crmApi.getDeals({ limit: 100 }),
  });

  const lostReasonsQuery = useQuery({
    queryKey: ['lost-reasons'],
    queryFn: () => crmApi.getLostReasons(),
  });

  const handleRefreshAll = () => {
    authQuery.refetch();
    healthQuery.refetch();
    stagesQuery.refetch();
    dealsQuery.refetch();
    lostReasonsQuery.refetch();
  };

  const isDbConnected = healthQuery.data?.database?.status === 'connected';
  const orgData = authQuery.data?.organization;
  const stages = stagesQuery.data || [];
  const deals = dealsQuery.data?.data || [];
  const lostReasons = lostReasonsQuery.data || [];

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <PageHeader
        title="Settings"
        badge="Admin Config"
        actions={
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <span className="hidden sm:inline-flex text-[11px] font-medium text-txt-muted items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-badge border border-border">
              <ShieldCheck className="h-3.5 w-3.5 text-[#57B71B]" />
              Live System Configuration (Read-Only)
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshAll}
              className="h-8 px-2.5 text-xs font-medium cursor-pointer shrink-0 ml-auto sm:ml-0"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* 2. Compact Category Navigation Tabs */}
      <div className="border-b border-border pb-2.5">
        <FilterPills
          options={SETTINGS_TABS}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* 3. Tab Contents */}

      {/* Tab 1: General Profile */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Card className="border-border shadow-card bg-white">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-bold text-txt-primary flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#57B71B]" /> Organization Parameters
                </span>
                {authQuery.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-txt-muted" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {authQuery.isError ? (
                <div className="flex items-center gap-2 text-danger-dark font-medium py-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to load organization parameters</span>
                  <Button variant="ghost" size="sm" onClick={() => authQuery.refetch()} className="h-6 px-2 text-xs">
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-txt-muted">Organization Name</span>
                    <span className="font-semibold text-txt-primary">
                      {orgData?.name || 'DigiTechzo Media & Technologies Pvt Ltd'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-txt-muted">Organization Slug</span>
                    <span className="font-mono text-txt-secondary text-[11px]">
                      {orgData?.slug || 'digitechzo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-txt-muted">Base Currency</span>
                    <span className="font-semibold text-txt-primary tabular-nums">INR (₹)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-txt-muted">System Timezone</span>
                    <span className="font-medium text-txt-primary">Asia/Kolkata (IST, UTC+5:30)</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-txt-muted">Tenant Mode</span>
                    <Badge variant="neutral">
                      Single-Tenant Dedicated
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-card bg-white">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-bold text-txt-primary flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-primary" /> Application Runtime State
                </span>
                {healthQuery.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-txt-muted" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {healthQuery.isError ? (
                <div className="flex items-center gap-2 text-danger-dark font-medium py-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to evaluate system health</span>
                  <Button variant="ghost" size="sm" onClick={() => healthQuery.refetch()} className="h-6 px-2 text-xs">
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-txt-muted">Execution Mode</span>
                    <Badge variant="success">Phase 3 Live PostgreSQL</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-txt-muted">Database Connectivity</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={isDbConnected ? 'success' : 'danger'}>
                        {isDbConnected ? 'Connected (Port 5432)' : 'Disconnected'}
                      </Badge>
                      {healthQuery.data?.database?.latencyMs !== undefined && (
                        <span className="text-[10px] text-txt-muted tabular-nums">
                          ({healthQuery.data.database.latencyMs}ms)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-txt-muted">Environment</span>
                    <span className="font-mono text-txt-secondary text-[11px] uppercase">
                      {healthQuery.data?.environment || 'development'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-txt-muted">Design System</span>
                    <span className="font-medium text-txt-primary">DigiTechzo Tokenized (Manrope)</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-txt-muted">Active Role Scopes</span>
                    <span className="font-semibold text-txt-primary">Admin, Manager, BDE, Marketing, Delivery</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick link card on General tab */}
          <Card className="border-border shadow-card bg-white md:col-span-2">
            <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-txt-primary flex items-center gap-2">
                <Palette className="h-4 w-4 text-[#57B71B]" />
                Sidebar & Navbar Color Customization
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('appearance')}
                className="h-7 px-2.5 text-xs font-semibold cursor-pointer"
              >
                Customize Theme &rarr;
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-txt-primary font-medium">
                  Personalize the left navigation sidebar background and menu item text/icon colors to match your brand.
                </p>
                <p className="text-txt-muted text-[11px] mt-0.5">
                  Includes live preview, color pickers, HEX inputs, WCAG contrast verification, and localStorage persistence.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('appearance')}
                className="h-8 px-3.5 text-xs font-semibold bg-[#57B71B] hover:bg-[#469815] text-white shrink-0 cursor-pointer"
              >
                Open Navbar Settings
              </Button>
            </CardContent>
          </Card>

          {/* In-Voice Colors Quick link card on General tab */}
          <Card className="border-border shadow-card bg-white md:col-span-2">
            <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-txt-primary flex items-center gap-2">
                <Palette className="h-4 w-4 text-indigo-600" />
                In-Voice Brand & Accent Colors
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('invoice-theme')}
                className="h-7 px-2.5 text-xs font-semibold cursor-pointer"
              >
                Customize In-Voice &rarr;
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-txt-primary font-medium">
                  Set default brand colors for all client invoices: header divider gradient line, TAX INVOICE title, and summary boxes.
                </p>
                <p className="text-txt-muted text-[11px] mt-0.5">
                  Choose from signature presets or configure custom hex colors. Synchronizes automatically with the In-Voice Studio.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('invoice-theme')}
                className="h-8 px-3.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 cursor-pointer"
              >
                Open In-Voice Colors
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Appearance & Navbar Customization */}
      {activeTab === 'appearance' && (
        <NavbarColorSettings />
      )}

      {/* Tab: In-Voice Colors & Theme Customization */}
      {activeTab === 'invoice-theme' && (
        <InvoiceColorSettings />
      )}

      {/* Tab 2: Pipeline Stages */}
      {activeTab === 'pipeline' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-txt-primary flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-[#57B71B]" />
              Pipeline Stages & Forecast Benchmarks
            </div>
            <div className="text-[11px] text-txt-muted">
              {stagesQuery.isLoading ? 'Loading stages...' : `${stages.length} configured stages`}
            </div>
          </div>

          {stagesQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2 bg-white rounded-card border border-border">
              <Loader2 className="h-6 w-6 animate-spin text-[#57B71B]" />
              <p className="text-xs text-txt-muted">Loading pipeline stages from PostgreSQL...</p>
            </div>
          ) : stagesQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white rounded-card border border-border">
              <div className="flex items-center gap-2 text-danger-dark text-xs font-medium">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load pipeline stages from backend</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => stagesQuery.refetch()} className="h-7 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table View (≥768px) */}
              <div className="hidden md:block rounded-card border border-border bg-white shadow-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Sequence</TableHead>
                      <TableHead className="w-[200px]">Stage Name</TableHead>
                      <TableHead className="w-[120px]">Stage Type</TableHead>
                      <TableHead className="w-[150px] text-right">Target Deals</TableHead>
                      <TableHead className="w-[160px] text-right">Target Value</TableHead>
                      <TableHead className="w-[120px] text-right">Active Deals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stages.map((stage) => {
                      const activeDealCount = deals.filter((d: any) => d.stageId === stage.id).length;

                      return (
                        <TableRow key={stage.id}>
                          <TableCell className="font-semibold text-xs text-txt-muted tabular-nums">
                            #{stage.order}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-txt-primary">
                            {stage.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                stage.stageType === 'WON'
                                  ? 'success'
                                  : stage.stageType === 'LOST'
                                  ? 'danger'
                                  : 'neutral'
                              }
                            >
                              {stage.stageType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs text-txt-secondary tabular-nums">
                            {stage.dealCountBenchmark !== undefined ? `${stage.dealCountBenchmark} deals` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs text-txt-primary tabular-nums">
                            {stage.totalValueBenchmark !== undefined
                              ? `₹${Number(stage.totalValueBenchmark).toLocaleString('en-IN')}`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs text-txt-primary tabular-nums">
                            {activeDealCount} {activeDealCount === 1 ? 'deal' : 'deals'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (<768px) */}
              <div className="md:hidden space-y-2.5">
                {stages.map((stage) => {
                  const activeDealCount = deals.filter((d: any) => d.stageId === stage.id).length;
                  return (
                    <div key={stage.id} className="rounded-card border border-border bg-white p-3.5 shadow-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-txt-muted tabular-nums">#{stage.order}</span>
                          <span className="font-bold text-xs text-txt-primary">{stage.name}</span>
                        </div>
                        <Badge
                          variant={
                            stage.stageType === 'WON'
                              ? 'success'
                              : stage.stageType === 'LOST'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {stage.stageType}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-border/50 text-center text-xs">
                        <div className="bg-slate-50 p-1.5 rounded-btn">
                          <span className="text-[10px] text-txt-muted block">Target</span>
                          <span className="font-semibold font-tabular text-txt-secondary">
                            {stage.dealCountBenchmark !== undefined ? `${stage.dealCountBenchmark}` : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-btn">
                          <span className="text-[10px] text-txt-muted block">Benchmark</span>
                          <span className="font-semibold font-tabular text-txt-primary truncate block">
                            {stage.totalValueBenchmark !== undefined
                              ? `₹${Number(stage.totalValueBenchmark).toLocaleString('en-IN')}`
                              : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-btn">
                          <span className="text-[10px] text-txt-muted block">Active</span>
                          <span className="font-bold font-tabular text-[#57B71B]">
                            {activeDealCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Taxonomies & Loss Governance */}
      {activeTab === 'taxonomies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Column A: Lost Reason Codes */}
            <Card className="border-border shadow-card bg-white">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="text-xs font-bold text-txt-primary flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-[#D97706]" /> Standardized Lost Reasons
                  </span>
                  <Badge variant="neutral" className="text-[10px]">
                    Rule BR-PIPE-02
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {lostReasonsQuery.isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <Loader2 className="h-5 w-5 animate-spin text-[#57B71B]" />
                    <p className="text-xs text-txt-muted">Loading lost reasons...</p>
                  </div>
                ) : lostReasonsQuery.isError ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-2">
                    <span className="text-xs text-danger-dark">Failed to load lost reasons</span>
                    <Button variant="ghost" size="sm" onClick={() => lostReasonsQuery.refetch()} className="h-6 text-xs">
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border text-xs">
                    {lostReasons.map((reason) => (
                      <div key={reason.id || reason.code} className="p-3 flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-txt-primary">{reason.label}</div>
                          <div className="font-mono text-[10px] text-txt-muted">{reason.code}</div>
                        </div>
                        <Badge variant={reason.isActive ? 'success' : 'neutral'} className="text-[10px] shrink-0">
                          {reason.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column B: Lead Sources & Service Lines */}
            <div className="space-y-3.5">
              <Card className="border-border shadow-card bg-white">
                <CardHeader className="py-3 px-4 border-b border-border">
                  <CardTitle className="text-xs font-bold text-txt-primary flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#57B71B]" /> Lead Capture Sources (Canonical Taxonomy)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border text-xs">
                    {LEAD_SOURCES.map((source) => (
                      <div key={source.code} className="p-2.5 px-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-txt-primary">{source.label}</span>
                          <span className="font-mono text-[10px] text-txt-muted ml-2">({source.code})</span>
                        </div>
                        <span className="text-[11px] text-txt-secondary">{source.channelType}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-card bg-white">
                <CardHeader className="py-3 px-4 border-b border-border">
                  <CardTitle className="text-xs font-bold text-txt-primary flex items-center gap-2">
                    <Tags className="h-4 w-4 text-primary" /> Active Service Offerings (Domain Reference)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border text-xs">
                    {SERVICE_LINES.map((service) => (
                      <div key={service.name} className="p-2.5 px-3 flex items-center justify-between">
                        <span className="font-medium text-txt-primary">{service.name}</span>
                        <span className="text-[11px] text-txt-muted">{service.domain}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Integration Adapters Status */}
      {activeTab === 'adapters' && (
        <Card className="border-border shadow-card bg-white">
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-xs font-bold text-txt-primary flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#57B71B]" /> Integration Adapters Architecture Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border text-xs">
              {/* Live Database Adapter */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-card border border-border bg-slate-50 flex items-center justify-center shrink-0">
                    <Database className="h-4 w-4 text-[#57B71B]" />
                  </div>
                  <div>
                    <div className="font-semibold text-txt-primary">Database & Persistence Layer (PostgreSQL)</div>
                    <div className="text-[11px] text-txt-muted">Phase 3 Live Production Backend</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant={isDbConnected ? 'success' : 'danger'}>
                    {isDbConnected ? 'PostgreSQL Active / Port 5432' : 'Degraded / Disconnected'}
                  </Badge>
                </div>
              </div>

              {/* Storage Adapter */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-card border border-border bg-slate-50 flex items-center justify-center shrink-0">
                    <HardDrive className="h-4 w-4 text-txt-muted" />
                  </div>
                  <div>
                    <div className="font-semibold text-txt-primary">StorageAdapter (Document Storage)</div>
                    <div className="text-[11px] text-txt-muted">Phase 3 Foundation (Local/Memory)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant="neutral">Local File Storage</Badge>
                </div>
              </div>

              {/* WhatsApp Adapter */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-card border border-border bg-slate-50 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4 text-txt-muted" />
                  </div>
                  <div>
                    <div className="font-semibold text-txt-primary">WhatsApp MessagingAdapter</div>
                    <div className="text-[11px] text-txt-muted">Planned (Phase 7)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant="warning">Planned (Phase 7) / Not Connected</Badge>
                </div>
              </div>

              {/* Telephony Adapter */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-card border border-border bg-slate-50 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-txt-muted" />
                  </div>
                  <div>
                    <div className="font-semibold text-txt-primary">TelephonyAdapter (Cloud Voice)</div>
                    <div className="text-[11px] text-txt-muted">Planned (Phase 8)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant="warning">Planned (Phase 8) / Not Connected</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
