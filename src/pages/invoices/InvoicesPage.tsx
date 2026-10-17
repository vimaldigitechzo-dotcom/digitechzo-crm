import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useAuth } from '@/hooks/useAuth';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Building2,
  User,
  FileSignature,
  ListChecks,
  Wallet,
  Calculator,
  Plus,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  Printer,
  Bookmark,
  FolderOpen,
  Sparkles,
  Upload,
  X,
  CreditCard,
  CheckCircle2,
  Search,
  Landmark,
  ChevronDown,
  Edit2,
  Settings2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Layout,
  FileText,
  Columns,
  QrCode,
  MessageSquare,
  Users,
  Download,
  Loader2,
  Wand2,
} from 'lucide-react';
import {
  useInvoiceTheme,
  InvoiceColorTheme,
} from '@/context/InvoiceThemeContext';
import { removeSignatureBackground } from '@/lib/signatureImageProcessor';

export interface CustomColumnConfig {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency';
  defaultValue?: string | number;
  showInPreview: boolean;
  required?: boolean;
}

interface InvoiceItem {
  id: string;
  description: string;
  subdesc?: string;
  quantity: number;
  price: number;
  advanceAmount?: number;
  customValues?: Record<string, any>;
}

interface SavedInvoiceRecord {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  clientName: string;
  total: number;
  status: string;
  currency: string;
  savedAt: string;
  data: any;
}

const DEFAULT_COMPANY_PROFILE = {
  name: 'Digitechzo',
  email: 'billing@digitechzo.com',
  address: 'Digitechzo Tech Solutions, Suite 200, IT Park, Chennai, TN 600001',
  phone: '+91 98765 43210',
  taxId: '33DIGI1234F1Z9',
  website: 'https://digitechzo.com',
  logo: '',
  logoHeight: 48,
};

interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscSwift: string;
  branch: string;
}

const INITIAL_BANK_ACCOUNT: BankAccount = {
  id: 'bank_1',
  bankName: 'HDFC Corporate Banking',
  accountName: 'Digitechzo Media & Technologies Pvt Ltd',
  accountNumber: '50200098765432',
  ifscSwift: 'HDFC0001234',
  branch: 'IT Park Phase 2, Chennai',
};

export interface UpiAccount {
  id: string;
  name: string;
  upiId: string;
  payeeName: string;
  note?: string;
}

export interface CryptoWallet {
  id: string;
  name: string;
  coin: string;
  network: string;
  address: string;
}

export interface PaymentState {
  activeTab: 'bank' | 'upi' | 'crypto';
  enableBank: boolean;
  enableUpi: boolean;
  enableCrypto: boolean;
  bankPreset: string;
  bank: BankAccount;
  customBankQr?: string;
  showBankQr?: boolean;
  upiPreset: string;
  upi: UpiAccount;
  customUpiQr: string;
  showUpiQr: boolean;
  cryptoPreset: string;
  crypto: CryptoWallet;
  customCryptoQr: string;
  showCryptoQr: boolean;
}

const DEFAULT_UPI_ACCOUNTS: UpiAccount[] = [
  {
    id: 'official',
    name: 'Digitechzo Official UPI (digitechzo@okicici)',
    upiId: 'digitechzo@okicici',
    payeeName: 'Digitechzo',
    note: 'Payment for DigiTechzo Invoice',
  },
  {
    id: 'gpay',
    name: 'GPay Merchant (9876543210@okbizaxis)',
    upiId: '9876543210@okbizaxis',
    payeeName: 'Digitechzo Business',
    note: 'Digitechzo Commercial Operations',
  },
];

const DEFAULT_CRYPTO_WALLETS: CryptoWallet[] = [
  {
    id: 'usdt_trc20',
    name: 'USDT (TRC20 - Tron)',
    coin: 'USDT (TRC20)',
    network: 'TRON (TRC20)',
    address: 'TYDzsYWaWXtHVRMokBSuP2t97711234567',
  },
  {
    id: 'usdt_erc20',
    name: 'USDT (ERC20 - Ethereum)',
    coin: 'USDT (ERC20)',
    network: 'Ethereum (ERC20)',
    address: '0x71C8364862Ab394F80bA176e3d2319047915B51c',
  },
  {
    id: 'btc',
    name: 'Bitcoin (BTC Mainnet)',
    coin: 'BTC (Bitcoin)',
    network: 'Bitcoin Mainnet',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  },
];

const UPI_PRESETS = {
  official: DEFAULT_UPI_ACCOUNTS[0],
  gpay: DEFAULT_UPI_ACCOUNTS[1],
};

const CRYPTO_PRESETS = {
  usdt_trc20: DEFAULT_CRYPTO_WALLETS[0],
  usdt_erc20: DEFAULT_CRYPTO_WALLETS[1],
  btc: DEFAULT_CRYPTO_WALLETS[2],
};

export const DEFAULT_BRAND_THEME = {
  id: 'digitechzo_indigo',
  name: 'Digitechzo Indigo Modern',
  primary: '#4F46E5',
  secondary: '#3B82F6',
};

export const COLOR_PRESETS = [
  DEFAULT_BRAND_THEME,
  {
    id: 'digitechzo_green',
    name: 'Digitechzo Classic Green',
    primary: '#57B71B',
    secondary: '#10b981',
  },
  {
    id: 'digitechzo_slate',
    name: 'Slate Charcoal',
    primary: '#0F172A',
    secondary: '#475569',
  },
];

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = useMemo(() => {
    if (!user) return true; // Default permissive in standalone dev mode
    const r = user.role?.toUpperCase();
    return r === 'ADMIN' || r === 'SUPER_ADMIN';
  }, [user]);

  // 1. Fetch CRM Leads for quick client auto-population
  const { data: leadsResponse } = useQuery({
    queryKey: ['invoice-leads-selector'],
    queryFn: () => crmApi.getLeads({ limit: 100 }),
  });
  const leads = useMemo(() => {
    return leadsResponse?.items || leadsResponse?.data || [];
  }, [leadsResponse]);

  // 1b. Fetch Invoices from PostgreSQL Database
  const {
    data: dbInvoicesData,
    refetch: refetchDbInvoices,
    isLoading: isLoadingDbInvoices,
  } = useQuery({
    queryKey: ['invoices-list'],
    queryFn: () => crmApi.getInvoices({ limit: 100 }),
  });

  // 1c. Fetch Organization Company Profile from Database
  const { data: dbCompanyProfile } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => crmApi.getCompanyProfile(),
  });

  // 1d. Fetch CRM Team Users for Signatory selection
  const { data: usersResponse } = useQuery({
    queryKey: ['invoice-team-users'],
    queryFn: () => crmApi.getUsers({ limit: 100 }),
  });
  const teamUsers = useMemo(() => {
    const list = (usersResponse as any)?.data || (usersResponse as any)?.items || [];
    return Array.isArray(list) ? list : [];
  }, [usersResponse]);

  // 2. Sender / Company Profile State
  const [sender, setSender] = useState(() => {
    try {
      const saved = localStorage.getItem('digitechzo_company_profile');
      return saved ? JSON.parse(saved) : DEFAULT_COMPANY_PROFILE;
    } catch {
      return DEFAULT_COMPANY_PROFILE;
    }
  });

  useEffect(() => {
    if (dbCompanyProfile && dbCompanyProfile.name) {
      setSender((prev: any) => ({
        ...prev,
        name: dbCompanyProfile.name || prev.name,
        email: dbCompanyProfile.email || prev.email,
        phone: dbCompanyProfile.phone || prev.phone,
        address: dbCompanyProfile.address || prev.address,
        taxId: dbCompanyProfile.taxId || prev.taxId,
        website: dbCompanyProfile.website || prev.website,
        logo: dbCompanyProfile.logo || prev.logo,
        logoHeight: dbCompanyProfile.logoHeight || prev.logoHeight,
      }));
    }
  }, [dbCompanyProfile]);

  // 3. Client State
  const [client, setClient] = useState({
    name: 'Vortex Global Tech Solutions',
    contact: 'Rajesh Kumar',
    email: 'rajesh@vortextech.com',
    phone: '+91 91234 56789',
    address: '45 Innovation Way, Cyber City, Hyderabad, TS',
  });

  // 4. Metadata State
  const [meta, setMeta] = useState({
    number: 'DIGI-2026-001',
    poNumber: 'PO-98402',
    date: new Date().toISOString().split('T')[0],
    paymentTermsDays: '15',
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    currency: '₹',
    status: 'UNPAID',
    amountPaid: 0,
    issuedBy: 'DigiTechzo Administrator',
  });

  // Auto-calculate Due Date when terms or date change
  useEffect(() => {
    if (meta.paymentTermsDays === 'custom') return;
    const days = parseInt(meta.paymentTermsDays, 10) || 0;
    const baseDate = new Date(meta.date || Date.now());
    if (isNaN(baseDate.getTime())) return;
    baseDate.setDate(baseDate.getDate() + days);
    setMeta((prev) => ({ ...prev, dueDate: baseDate.toISOString().split('T')[0] }));
  }, [meta.date, meta.paymentTermsDays]);

  // 5. Line Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: 'Enterprise Web Platform Architecture & Development',
      subdesc: 'Full-stack Node.js & React app setup with DB indexing',
      quantity: 1,
      price: 45000,
      advanceAmount: 20000,
    },
    {
      id: '2',
      description: 'UI/UX Design System & Figma Mockups',
      subdesc: 'Mobile responsive design system with dark/light themes',
      quantity: 1,
      price: 25000,
      advanceAmount: 10000,
    },
    {
      id: '3',
      description: 'RESTful API & Payment Gateway Integration',
      subdesc: 'UPI, Card & Webhook security setup',
      quantity: 1,
      price: 15000,
      advanceAmount: 5000,
    },
  ]);

  // 6. Tax, Discount, Advance & Custom Columns Settings
  const [taxRate, setTaxRate] = useState<number>(18);
  const [discountRate, setDiscountRate] = useState<number>(5);
  const [advancePercent, setAdvancePercent] = useState<number>(0);
  const [enableQtyColumn, setEnableQtyColumn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('digitechzo_invoice_enable_qty');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [enablePriceColumn, setEnablePriceColumn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('digitechzo_invoice_enable_price');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [enableAdvanceColumn, setEnableAdvanceColumn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('digitechzo_invoice_enable_advance');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Custom Columns configured by Admin or current user
  const [customColumns, setCustomColumns] = useState<CustomColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('digitechzo_invoice_custom_columns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal / Form state for "+ Add Custom Column"
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState<'text' | 'number' | 'currency'>('text');
  const [newColDefault, setNewColDefault] = useState('');
  const [newColShowInPreview, setNewColShowInPreview] = useState(true);
  const [newColRequired, setNewColRequired] = useState(false);
  const [editingColId, setEditingColId] = useState<string | null>(null);

  // 7. Payment Options (Loaded & Persisted in localStorage)
  const [payment, setPayment] = useState<PaymentState>(() => {
    const defaultState: PaymentState = {
      activeTab: 'bank',
      enableBank: true,
      enableUpi: true,
      enableCrypto: true,
      bankPreset: INITIAL_BANK_ACCOUNT.id,
      bank: INITIAL_BANK_ACCOUNT,
      customBankQr: '',
      showBankQr: true,
      upiPreset: 'official',
      upi: UPI_PRESETS.official,
      customUpiQr: '',
      showUpiQr: true,
      cryptoPreset: 'usdt_trc20',
      crypto: CRYPTO_PRESETS.usdt_trc20,
      customCryptoQr: '',
      showCryptoQr: true,
    };
    try {
      const savedTab = localStorage.getItem('digitechzo_invoice_active_payment_tab') as 'bank' | 'upi' | 'crypto' | null;
      const savedPaymentStr = localStorage.getItem('digitechzo_invoice_payment_settings');
      if (savedPaymentStr) {
        const parsed = JSON.parse(savedPaymentStr);
        return {
          ...defaultState,
          ...parsed,
          enableBank: parsed.enableBank !== undefined ? parsed.enableBank : true,
          enableUpi: parsed.enableUpi !== undefined ? parsed.enableUpi : true,
          enableCrypto: parsed.enableCrypto !== undefined ? parsed.enableCrypto : true,
          activeTab: (savedTab && ['bank', 'upi', 'crypto'].includes(savedTab))
            ? savedTab
            : (parsed.activeTab || 'bank'),
        };
      }
      if (savedTab && ['bank', 'upi', 'crypto'].includes(savedTab)) {
        return {
          ...defaultState,
          activeTab: savedTab,
        };
      }
    } catch {}
    return defaultState;
  });

  // Automatically persist payment state and active tab changes
  useEffect(() => {
    try {
      localStorage.setItem('digitechzo_invoice_payment_settings', JSON.stringify(payment));
      localStorage.setItem('digitechzo_invoice_active_payment_tab', payment.activeTab);
    } catch (err) {
      console.warn('Failed to persist payment settings:', err);
    }
  }, [payment]);


  // 8. Notes, Terms, Signature & Footer
  const [showNotesBlock, setShowNotesBlock] = useState(true);
  const [notesHeading, setNotesHeading] = useState('NOTE:');
  const [notes, setNotes] = useState(
    'Thank you for partnering with Digitechzo! We appreciate your business and continued trust.'
  );
  const [showTermsBlock, setShowTermsBlock] = useState(true);
  const [termsHeading, setTermsHeading] = useState('TERMS:');
  const [terms, setTerms] = useState(
    'Payment is strictly due within 15 business days. Invoices overdue beyond 30 days are subject to a 1.5% monthly late finance assessment.'
  );
  const [signature, setSignature] = useState({
    name: 'Digitechzo Director',
    role: 'Managing Director',
    signatureImage: '',
    rawSignatureImage: '',
    isTransparent: true,
    inkColorMode: 'auto' as 'auto' | 'black' | 'blue' | 'original',
  });
  const [isProcessingSignature, setIsProcessingSignature] = useState(false);
  const [showSignatureBlock, setShowSignatureBlock] = useState(true);
  const [footerText, setFooterText] = useState(
    'Digitechzo | Official Invoice Generator & Billing Portal'
  );

  // 9. Invoice Theme & Accent Colors (Controlled directly from Settings Module)
  const { appliedTheme: globalInvoiceTheme } = useInvoiceTheme();
  const [activeTheme, setActiveTheme] = useState<InvoiceColorTheme>(globalInvoiceTheme);

  useEffect(() => {
    setActiveTheme(globalInvoiceTheme);
  }, [globalInvoiceTheme]);

  // 9b. Responsive Studio Layout View Mode ('split' | 'editor' | 'preview')
  const [studioViewMode, setStudioViewMode] = useState<'split' | 'editor' | 'preview'>('editor');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);



  // 10. Modals & Notifications
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoiceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('digitechzo_saved_invoices');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync real database invoices into studio history state
  useEffect(() => {
    const dbItems = dbInvoicesData?.items || dbInvoicesData?.data;
    if (Array.isArray(dbItems) && dbItems.length > 0) {
      const mapped: SavedInvoiceRecord[] = dbItems.map((inv: any) => ({
        id: inv.id,
        number: inv.invoiceNumber,
        date: inv.issueDate ? new Date(inv.issueDate).toISOString().split('T')[0] : '',
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
        clientName: inv.clientName,
        total: Number(inv.total),
        status: inv.status,
        currency: inv.currency || '₹',
        savedAt: inv.createdAt ? new Date(inv.createdAt).toLocaleString() : '',
        data: inv.rawData || {
          sender: inv.senderProfile,
          client: {
            name: inv.clientName,
            contact: inv.clientContact,
            email: inv.clientEmail,
            phone: inv.clientPhone,
            address: inv.clientAddress,
            taxId: inv.clientTaxId,
          },
          meta: {
            number: inv.invoiceNumber,
            poNumber: inv.poNumber,
            date: inv.issueDate?.split('T')[0],
            dueDate: inv.dueDate?.split('T')[0],
            paymentTermsDays: inv.paymentTermsDays,
            status: inv.status,
            currency: inv.currency,
            amountPaid: Number(inv.amountPaid || 0),
          },
          items: (inv.items || []).map((it: any) => ({
            id: it.id,
            description: it.description,
            subdesc: it.subdesc,
            quantity: it.quantity,
            price: Number(it.price),
            advanceAmount: it.advanceAmount ? Number(it.advanceAmount) : undefined,
            customValues: it.customValues,
          })),
          taxRate: Number(inv.taxRate || 0),
          discountRate: Number(inv.discountRate || 0),
          notes: inv.notes,
          footerText: inv.footerText,
          signature: inv.signature,
          payment: {
            bank: inv.bankDetails,
            upi: inv.upiDetails,
            crypto: inv.cryptoDetails,
          },
          customColumns: inv.customColumns || [],
          activeTheme: inv.activeTheme,
        },
      }));
      setSavedInvoices(mapped);
      localStorage.setItem('digitechzo_saved_invoices', JSON.stringify(mapped));
    }
  }, [dbInvoicesData]);

  // Bank Accounts Management (Persisted in localStorage without hardcoded HDFC/ICICI, purged of unnamed entries)
  const [savedBanks, setSavedBanks] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem('digitechzo_saved_banks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(
            (b: any) =>
              b &&
              b.bankName &&
              b.bankName.trim() !== '' &&
              b.bankName.trim().toLowerCase() !== 'unnamed bank account' &&
              !b.bankName?.toLowerCase().includes('hdfc bank') &&
              !b.bankName?.toLowerCase().includes('icici bank')
          );
          if (cleaned.length > 0) {
            localStorage.setItem('digitechzo_saved_banks', JSON.stringify(cleaned));
            return cleaned;
          }
        }
      }
    } catch {}
    const fallbackBank: BankAccount = {
      id: 'bank_default',
      bankName: 'Primary Bank Account',
      accountName: 'Digitechzo Media & Technologies Pvt Ltd',
      accountNumber: '',
      ifscSwift: '',
      branch: '',
    };
    try {
      localStorage.setItem('digitechzo_saved_banks', JSON.stringify([fallbackBank]));
    } catch {}
    return [fallbackBank];
  });

  const handleAddBankAccount = () => {
    setIsBankDropdownOpen(true);
    setIsAddingNewBank(true);
    setTimeout(() => {
      newBankInputRef.current?.focus();
    }, 50);
  };

  const handleUpdateCurrentBank = (fields: Partial<BankAccount>) => {
    const updatedBank = { ...payment.bank, ...fields };
    setPayment((p) => ({ ...p, bank: updatedBank }));

    // Real-time update in savedBanks list so dropdown displays whatever user types
    setSavedBanks((prev) => {
      const exists = prev.some((b) => b.id === payment.bankPreset);
      const nextList = exists
        ? prev.map((b) => (b.id === payment.bankPreset ? { ...b, ...fields } : b))
        : [...prev, { ...updatedBank, id: payment.bankPreset }];
      localStorage.setItem('digitechzo_saved_banks', JSON.stringify(nextList));
      return nextList;
    });
  };

  const handleDeleteSavedBank = (bankId: string) => {
    if (savedBanks.length <= 1) {
      showToast('You must have at least one bank account');
      return;
    }
    const updated = savedBanks.filter((b) => b.id !== bankId);
    setSavedBanks(updated);
    localStorage.setItem('digitechzo_saved_banks', JSON.stringify(updated));
    if (payment.bankPreset === bankId) {
      const nextBank = updated[0];
      setPayment((p) => ({ ...p, bankPreset: nextBank.id, bank: nextBank }));
    }
    showToast('Bank account removed');
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Custom Searchable & Addable Bank Account Dropdown State
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearchFilter, setBankSearchFilter] = useState('');
  const [isAddingNewBank, setIsAddingNewBank] = useState(false);
  const [newBankInput, setNewBankInput] = useState('');
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingBankName, setEditingBankName] = useState('');
  const bankDropdownRef = useRef<HTMLDivElement>(null);
  const bankSearchInputRef = useRef<HTMLInputElement>(null);
  const newBankInputRef = useRef<HTMLInputElement>(null);
  const editBankInputRef = useRef<HTMLInputElement>(null);

  // Custom Searchable & Addable UPI Account Dropdown State
  const [savedUpiAccounts, setSavedUpiAccounts] = useState<UpiAccount[]>(() => {
    try {
      const saved = localStorage.getItem('digitechzo_saved_upi_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_UPI_ACCOUNTS;
  });

  const [isUpiDropdownOpen, setIsUpiDropdownOpen] = useState(false);
  const [upiSearchFilter, setUpiSearchFilter] = useState('');
  const [isAddingNewUpi, setIsAddingNewUpi] = useState(false);
  const [newUpiInput, setNewUpiInput] = useState('');
  const [editingUpiId, setEditingUpiId] = useState<string | null>(null);
  const [editingUpiName, setEditingUpiName] = useState('');
  const upiDropdownRef = useRef<HTMLDivElement>(null);
  const upiSearchInputRef = useRef<HTMLInputElement>(null);
  const newUpiInputRef = useRef<HTMLInputElement>(null);
  const editUpiInputRef = useRef<HTMLInputElement>(null);

  // Custom Searchable & Addable Crypto Wallet Dropdown State
  const [savedCryptoWallets, setSavedCryptoWallets] = useState<CryptoWallet[]>(() => {
    try {
      const saved = localStorage.getItem('digitechzo_saved_crypto_wallets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CRYPTO_WALLETS;
  });

  const [isCryptoDropdownOpen, setIsCryptoDropdownOpen] = useState(false);
  const [cryptoSearchFilter, setCryptoSearchFilter] = useState('');
  const [isAddingNewCrypto, setIsAddingNewCrypto] = useState(false);
  const [newCryptoInput, setNewCryptoInput] = useState('');
  const [editingCryptoId, setEditingCryptoId] = useState<string | null>(null);
  const [editingCryptoName, setEditingCryptoName] = useState('');
  const cryptoDropdownRef = useRef<HTMLDivElement>(null);
  const cryptoSearchInputRef = useRef<HTMLInputElement>(null);
  const newCryptoInputRef = useRef<HTMLInputElement>(null);
  const editCryptoInputRef = useRef<HTMLInputElement>(null);

  // Close payment dropdowns on click outside
  useEffect(() => {
    const handleClickOutsidePaymentDropdowns = (event: MouseEvent) => {
      const target = event.target as Node;
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(target)) {
        setIsBankDropdownOpen(false);
        setIsAddingNewBank(false);
        setEditingBankId(null);
        setBankSearchFilter('');
        setNewBankInput('');
      }
      if (upiDropdownRef.current && !upiDropdownRef.current.contains(target)) {
        setIsUpiDropdownOpen(false);
        setIsAddingNewUpi(false);
        setEditingUpiId(null);
        setUpiSearchFilter('');
        setNewUpiInput('');
      }
      if (cryptoDropdownRef.current && !cryptoDropdownRef.current.contains(target)) {
        setIsCryptoDropdownOpen(false);
        setIsAddingNewCrypto(false);
        setEditingCryptoId(null);
        setCryptoSearchFilter('');
        setNewCryptoInput('');
      }
    };
    document.addEventListener('mousedown', handleClickOutsidePaymentDropdowns);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsidePaymentDropdowns);
    };
  }, []);

  const handleAddNewBankConfirm = () => {
    const trimmed = newBankInput.trim();
    if (!trimmed) {
      showToast('Please enter a bank account name');
      return;
    }

    const newId = `bank_${Date.now()}`;
    const newBank: BankAccount = {
      id: newId,
      bankName: trimmed,
      accountName: sender.name || 'Digitechzo',
      accountNumber: '',
      ifscSwift: '',
      branch: '',
    };
    const updated = [...savedBanks, newBank];
    setSavedBanks(updated);
    localStorage.setItem('digitechzo_saved_banks', JSON.stringify(updated));
    setPayment((p) => ({ ...p, bankPreset: newId, bank: newBank }));
    setIsBankDropdownOpen(false);
    setIsAddingNewBank(false);
    setNewBankInput('');
    setBankSearchFilter('');
    showToast(`Bank "${trimmed}" added and selected!`);
  };

  const handleSaveBankRename = (bankId: string) => {
    const trimmed = editingBankName.trim();
    if (!trimmed) {
      showToast('Bank name cannot be empty');
      return;
    }
    const updated = savedBanks.map((b) => (b.id === bankId ? { ...b, bankName: trimmed } : b));
    setSavedBanks(updated);
    localStorage.setItem('digitechzo_saved_banks', JSON.stringify(updated));
    if (payment.bankPreset === bankId) {
      setPayment((p) => ({ ...p, bank: { ...p.bank, bankName: trimmed } }));
    }
    setEditingBankId(null);
    setEditingBankName('');
    showToast(`Bank renamed to "${trimmed}"`);
  };

  const handleUpdateCurrentUpi = (fields: Partial<UpiAccount>) => {
    const updatedUpi = { ...payment.upi, ...fields };
    setPayment((p) => ({ ...p, upi: updatedUpi }));

    setSavedUpiAccounts((prev) => {
      const exists = prev.some((u) => u.id === payment.upiPreset);
      const nextList = exists
        ? prev.map((u) => (u.id === payment.upiPreset ? { ...u, ...fields } : u))
        : [...prev, { ...updatedUpi, id: payment.upiPreset, name: payment.upiPreset }];
      localStorage.setItem('digitechzo_saved_upi_accounts', JSON.stringify(nextList));
      return nextList;
    });
  };

  const handleAddNewUpiConfirm = () => {
    const trimmed = newUpiInput.trim();
    if (!trimmed) {
      showToast('Please enter a UPI account name');
      return;
    }

    const newId = `upi_${Date.now()}`;
    const newAccount: UpiAccount = {
      id: newId,
      name: trimmed,
      upiId: '',
      payeeName: sender.name || 'Digitechzo',
      note: 'Payment for Invoice',
    };
    const updated = [...savedUpiAccounts, newAccount];
    setSavedUpiAccounts(updated);
    localStorage.setItem('digitechzo_saved_upi_accounts', JSON.stringify(updated));
    setPayment((p) => ({ ...p, upiPreset: newId, upi: newAccount }));
    setIsUpiDropdownOpen(false);
    setIsAddingNewUpi(false);
    setNewUpiInput('');
    setUpiSearchFilter('');
    showToast(`UPI account "${trimmed}" added and selected!`);
  };

  const handleDeleteSavedUpi = (upiId: string) => {
    if (savedUpiAccounts.length <= 1) {
      showToast('You must have at least one UPI account');
      return;
    }
    const updated = savedUpiAccounts.filter((u) => u.id !== upiId);
    setSavedUpiAccounts(updated);
    localStorage.setItem('digitechzo_saved_upi_accounts', JSON.stringify(updated));
    if (payment.upiPreset === upiId) {
      const nextUpi = updated[0];
      setPayment((p) => ({ ...p, upiPreset: nextUpi.id, upi: nextUpi }));
    }
    showToast('UPI account removed');
  };

  const handleSaveUpiRename = (upiId: string) => {
    const trimmed = editingUpiName.trim();
    if (!trimmed) {
      showToast('Account name cannot be empty');
      return;
    }
    const updated = savedUpiAccounts.map((u) => (u.id === upiId ? { ...u, name: trimmed } : u));
    setSavedUpiAccounts(updated);
    localStorage.setItem('digitechzo_saved_upi_accounts', JSON.stringify(updated));
    setEditingUpiId(null);
    setEditingUpiName('');
    showToast(`UPI account renamed to "${trimmed}"`);
  };

  const handleUpdateCurrentCrypto = (fields: Partial<CryptoWallet>) => {
    const updatedCrypto = { ...payment.crypto, ...fields };
    setPayment((p) => ({ ...p, crypto: updatedCrypto }));

    setSavedCryptoWallets((prev) => {
      const exists = prev.some((c) => c.id === payment.cryptoPreset);
      const nextList = exists
        ? prev.map((c) => (c.id === payment.cryptoPreset ? { ...c, ...fields } : c))
        : [...prev, { ...updatedCrypto, id: payment.cryptoPreset, name: payment.cryptoPreset }];
      localStorage.setItem('digitechzo_saved_crypto_wallets', JSON.stringify(nextList));
      return nextList;
    });
  };

  const handleAddNewCryptoConfirm = () => {
    const trimmed = newCryptoInput.trim();
    if (!trimmed) {
      showToast('Please enter a crypto wallet name');
      return;
    }

    const newId = `crypto_${Date.now()}`;
    const newWallet: CryptoWallet = {
      id: newId,
      name: trimmed,
      coin: 'USDT (TRC20)',
      network: 'TRON (TRC20)',
      address: '',
    };
    const updated = [...savedCryptoWallets, newWallet];
    setSavedCryptoWallets(updated);
    localStorage.setItem('digitechzo_saved_crypto_wallets', JSON.stringify(updated));
    setPayment((p) => ({ ...p, cryptoPreset: newId, crypto: newWallet }));
    setIsCryptoDropdownOpen(false);
    setIsAddingNewCrypto(false);
    setNewCryptoInput('');
    setCryptoSearchFilter('');
    showToast(`Crypto wallet "${trimmed}" added and selected!`);
  };

  const handleDeleteSavedCrypto = (cryptoId: string) => {
    if (savedCryptoWallets.length <= 1) {
      showToast('You must have at least one crypto wallet');
      return;
    }
    const updated = savedCryptoWallets.filter((c) => c.id !== cryptoId);
    setSavedCryptoWallets(updated);
    localStorage.setItem('digitechzo_saved_crypto_wallets', JSON.stringify(updated));
    if (payment.cryptoPreset === cryptoId) {
      const nextCrypto = updated[0];
      setPayment((p) => ({ ...p, cryptoPreset: nextCrypto.id, crypto: nextCrypto }));
    }
    showToast('Crypto wallet removed');
  };

  const handleSaveCryptoRename = (cryptoId: string) => {
    const trimmed = editingCryptoName.trim();
    if (!trimmed) {
      showToast('Wallet name cannot be empty');
      return;
    }
    const updated = savedCryptoWallets.map((c) => (c.id === cryptoId ? { ...c, name: trimmed } : c));
    setSavedCryptoWallets(updated);
    localStorage.setItem('digitechzo_saved_crypto_wallets', JSON.stringify(updated));
    setEditingCryptoId(null);
    setEditingCryptoName('');
    showToast(`Crypto wallet renamed to "${trimmed}"`);
  };

  // Toggle Qty Column & Persist
  const handleToggleQtyColumn = (enabled: boolean) => {
    setEnableQtyColumn(enabled);
    localStorage.setItem('digitechzo_invoice_enable_qty', JSON.stringify(enabled));
    showToast(enabled ? 'Qty column enabled' : 'Qty column hidden');
  };

  // Toggle Full Amount Column & Persist
  const handleTogglePriceColumn = (enabled: boolean) => {
    setEnablePriceColumn(enabled);
    localStorage.setItem('digitechzo_invoice_enable_price', JSON.stringify(enabled));
    showToast(enabled ? 'Final Amount column enabled' : 'Final Amount column hidden');
  };

  // Toggle Advance Column & Persist in LocalStorage/Database Settings
  const handleToggleAdvanceColumn = (enabled: boolean) => {
    setEnableAdvanceColumn(enabled);
    localStorage.setItem('digitechzo_invoice_enable_advance', JSON.stringify(enabled));
    showToast(enabled ? 'Advanced Amount column enabled' : 'Advanced Amount column hidden');
  };

  // Custom Columns Actions
  const handleOpenAddColumnModal = (colToEdit?: CustomColumnConfig) => {
    if (colToEdit) {
      setEditingColId(colToEdit.id);
      setNewColLabel(colToEdit.label);
      setNewColType(colToEdit.type);
      setNewColDefault(colToEdit.defaultValue !== undefined ? String(colToEdit.defaultValue) : '');
      setNewColShowInPreview(colToEdit.showInPreview);
      setNewColRequired(!!colToEdit.required);
    } else {
      setEditingColId(null);
      setNewColLabel('');
      setNewColType('text');
      setNewColDefault('');
      setNewColShowInPreview(true);
      setNewColRequired(false);
    }
    setIsColumnModalOpen(true);
  };

  const handleSaveCustomColumn = () => {
    const trimmedLabel = newColLabel.trim();
    if (!trimmedLabel) {
      showToast('Column heading is required');
      return;
    }

    if (editingColId) {
      // Update existing column
      const updated = customColumns.map((col) => {
        if (col.id === editingColId) {
          return {
            ...col,
            label: trimmedLabel,
            type: newColType,
            defaultValue: newColDefault,
            showInPreview: newColShowInPreview,
            required: newColRequired,
          };
        }
        return col;
      });
      setCustomColumns(updated);
      localStorage.setItem('digitechzo_invoice_custom_columns', JSON.stringify(updated));
      showToast(`Column "${trimmedLabel}" updated successfully`);
    } else {
      // Create new column key from label
      const key = `col_${Date.now()}`;
      const newCol: CustomColumnConfig = {
        id: `col_${Date.now()}`,
        key,
        label: trimmedLabel,
        type: newColType,
        defaultValue: newColDefault,
        showInPreview: newColShowInPreview,
        required: newColRequired,
      };
      const updated = [...customColumns, newCol];
      setCustomColumns(updated);
      localStorage.setItem('digitechzo_invoice_custom_columns', JSON.stringify(updated));

      // Populate default value for existing items if specified
      if (newColDefault) {
        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            customValues: {
              ...(item.customValues || {}),
              [key]: newColDefault,
            },
          }))
        );
      }
      showToast(`Column "${trimmedLabel}" added to invoice items!`);
    }

    setIsColumnModalOpen(false);
    setEditingColId(null);
  };

  const handleToggleColumnVisibility = (colId: string) => {
    const updated = customColumns.map((c) =>
      c.id === colId ? { ...c, showInPreview: !c.showInPreview } : c
    );
    setCustomColumns(updated);
    localStorage.setItem('digitechzo_invoice_custom_columns', JSON.stringify(updated));
    showToast('Column visibility updated');
  };

  const handleReorderColumn = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= customColumns.length) return;
    const updated = [...customColumns];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setCustomColumns(updated);
    localStorage.setItem('digitechzo_invoice_custom_columns', JSON.stringify(updated));
  };

  const handleDeleteCustomColumn = (col: CustomColumnConfig) => {
    // Check if any existing item has data in this column
    const hasData = items.some(
      (item) => item.customValues && item.customValues[col.key] !== undefined && item.customValues[col.key] !== ''
    );

    if (hasData) {
      const confirmDelete = window.confirm(
        `Column "${col.label}" contains data in your current invoice items. Are you sure you want to delete it? This data will be removed.`
      );
      if (!confirmDelete) return;
    }

    const updated = customColumns.filter((c) => c.id !== col.id);
    setCustomColumns(updated);
    localStorage.setItem('digitechzo_invoice_custom_columns', JSON.stringify(updated));

    // Clean up stored item values for this key
    setItems((prev) =>
      prev.map((item) => {
        if (!item.customValues) return item;
        const nextCustom = { ...item.customValues };
        delete nextCustom[col.key];
        return { ...item, customValues: nextCustom };
      })
    );
    showToast(`Column "${col.label}" removed`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSignatureUpload = async (file: File) => {
    setIsProcessingSignature(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const rawDataUrl = reader.result as string;
        try {
          const processedUrl = await removeSignatureBackground(rawDataUrl, {
            inkColorMode: signature.inkColorMode || 'auto',
            autoCrop: true,
          });
          setSignature((prev) => ({
            ...prev,
            signatureImage: processedUrl,
            rawSignatureImage: rawDataUrl,
            isTransparent: true,
          }));
          showToast('Signature background removed automatically');
        } catch (err) {
          console.error('Failed to remove signature background automatically:', err);
          setSignature((prev) => ({
            ...prev,
            signatureImage: rawDataUrl,
            rawSignatureImage: rawDataUrl,
            isTransparent: false,
          }));
          showToast('Signature uploaded');
        } finally {
          setIsProcessingSignature(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessingSignature(false);
    }
  };

  const handleApplySignatureBackgroundRemoval = async (mode?: 'auto' | 'black' | 'blue' | 'original') => {
    const src = signature.rawSignatureImage || signature.signatureImage;
    if (!src) return;
    setIsProcessingSignature(true);
    try {
      const chosenMode = mode || signature.inkColorMode || 'auto';
      const processedUrl = await removeSignatureBackground(src, {
        inkColorMode: chosenMode,
        autoCrop: true,
      });
      setSignature((prev) => ({
        ...prev,
        signatureImage: processedUrl,
        rawSignatureImage: src,
        isTransparent: true,
        inkColorMode: chosenMode,
      }));
      showToast('Clean transparent text extracted');
    } catch (err) {
      console.error('Error removing signature background:', err);
      showToast('Could not process signature image');
    } finally {
      setIsProcessingSignature(false);
    }
  };

  // Invoice Preview Sticky & Smooth Scroll Sync
  const invoiceContainerRef = useRef<HTMLDivElement>(null);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.quantity || 0) * (it.price || 0), 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    return subtotal * ((discountRate || 0) / 100);
  }, [subtotal, discountRate]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxAmount = useMemo(() => {
    return taxableAmount * ((taxRate || 0) / 100);
  }, [taxableAmount, taxRate]);

  const grandTotal = taxableAmount + taxAmount;

  const totalAdvance = useMemo(() => {
    if (!enableAdvanceColumn) return 0;
    const fromItems = items.reduce((acc, it) => {
      const lineTotal = (it.quantity || 0) * (it.price || 0);
      if (typeof it.advanceAmount === 'number') {
        return acc + it.advanceAmount;
      }
      return acc + (advancePercent > 0 ? (lineTotal * advancePercent) / 100 : 0);
    }, 0);
    if (fromItems > 0) return fromItems;
    if (advancePercent > 0) return (grandTotal * advancePercent) / 100;
    return 0;
  }, [items, advancePercent, grandTotal, enableAdvanceColumn]);

  const balanceDue = Math.max(0, grandTotal - Math.max(meta.amountPaid || 0, totalAdvance));

  // Auto-generate invoice number
  const handleAutoGenerateInvoiceNumber = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const year = new Date().getFullYear();
    setMeta((prev) => ({ ...prev, number: `DIGI-${year}-${randomSuffix}` }));
    showToast('Generated new invoice number');
  };

  // Add Item
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: 'New Consultation Service',
        subdesc: '',
        quantity: 1,
        price: 5000,
        advanceAmount: 2500,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      showToast('Invoice must have at least one line item');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddPreset = (desc: string, price: number, defaultAdvance?: number) => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: desc,
        subdesc: 'Standard commercial service rate',
        quantity: 1,
        price,
        advanceAmount: defaultAdvance !== undefined ? defaultAdvance : Math.round(price * 0.5),
      },
    ]);
    showToast(`Added ${desc}`);
  };

  // Copy to clipboard
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast(`Copied to clipboard: ${text}`);
  };

  // Save Company Profile
  const handleSaveCompanyProfile = async () => {
    localStorage.setItem('digitechzo_company_profile', JSON.stringify(sender));
    try {
      await crmApi.saveCompanyProfile(sender);
      showToast('Company profile saved to database!');
    } catch {
      showToast('Company profile saved locally');
    }
  };

  const handleLoadCompanyProfile = () => {
    try {
      const saved = localStorage.getItem('digitechzo_company_profile');
      if (saved) {
        setSender(JSON.parse(saved));
        showToast('Company profile loaded');
      } else {
        showToast('No saved profile found');
      }
    } catch {
      showToast('Failed to load profile');
    }
  };

  // Logo upload with image optimization (compression & auto-resizing via Canvas)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Logo file size must be under 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      if (!rawBase64) return;

      // Optimize image via Canvas to prevent bloated storage & speed up PDF rendering
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        // Proportional scale-down if image is larger than max bounding box
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Prefer PNG if transparency is needed, or compressed JPEG
          const isTransparent = file.type === 'image/png' || file.type === 'image/svg+xml' || file.type === 'image/webp';
          const optimizedBase64 = canvas.toDataURL(isTransparent ? 'image/png' : 'image/jpeg', 0.88);
          setSender((prev: any) => ({
            ...prev,
            logo: optimizedBase64,
            logoHeight: prev.logoHeight || 48,
          }));
          showToast(`Logo optimized & uploaded successfully (${width}×${height}px)`);
        } else {
          // Fallback if canvas context fails
          setSender((prev: any) => ({ ...prev, logo: rawBase64, logoHeight: prev.logoHeight || 48 }));
          showToast('Logo uploaded successfully');
        }
      };
      img.onerror = () => {
        setSender((prev: any) => ({ ...prev, logo: rawBase64, logoHeight: prev.logoHeight || 48 }));
        showToast('Logo uploaded');
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
    // Reset input so re-uploading the same file works
    e.target.value = '';
  };

  // Custom Bank QR upload
  const handleBankQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPayment((prev) => ({ ...prev, customBankQr: base64, showBankQr: true }));
      showToast('Custom Bank QR uploaded');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Custom QR upload
  const handleUpiQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPayment((prev) => ({ ...prev, customUpiQr: base64, showUpiQr: true }));
      showToast('Custom UPI QR uploaded');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Custom Crypto QR upload
  const handleCryptoQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPayment((prev) => ({ ...prev, customCryptoQr: base64, showCryptoQr: true }));
      showToast('Custom Crypto QR uploaded');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Save Invoice (Database + Local Sync)
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  const handleSaveInvoice = async (statusOverride?: string) => {
    const finalStatus = statusOverride || meta.status;
    const localId = Date.now().toString();
    const snapshot: SavedInvoiceRecord = {
      id: localId,
      number: meta.number,
      date: meta.date,
      dueDate: meta.dueDate,
      clientName: client.name,
      total: grandTotal,
      status: finalStatus,
      currency: meta.currency,
      savedAt: new Date().toLocaleString(),
      data: {
        sender,
        client,
        meta: { ...meta, status: finalStatus },
        items,
        taxRate,
        discountRate,
        advancePercent,
        enableQtyColumn,
        enablePriceColumn,
        enableAdvanceColumn,
        customColumns,
        payment,
        notes,
        notesHeading,
        showNotesBlock,
        terms,
        termsHeading,
        showTermsBlock,
        signature,
        showSignatureBlock,
        footerText,
        activeTheme,
      },
    };

    const existing = savedInvoices.filter((inv) => inv.number !== meta.number);
    const updated = [snapshot, ...existing];
    setSavedInvoices(updated);
    localStorage.setItem('digitechzo_saved_invoices', JSON.stringify(updated));
    if (statusOverride) {
      setMeta((prev) => ({ ...prev, status: statusOverride }));
    }

    try {
      setIsSavingInvoice(true);
      const payload = {
        invoiceNumber: meta.number,
        poNumber: meta.poNumber,
        clientName: client.name,
        clientContact: client.contact,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientAddress: client.address,
        issueDate: meta.date ? new Date(meta.date).toISOString() : new Date().toISOString(),
        dueDate: meta.dueDate ? new Date(meta.dueDate).toISOString() : new Date().toISOString(),
        paymentTermsDays: meta.paymentTermsDays,
        status: finalStatus,
        currency: meta.currency,
        subtotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        total: grandTotal,
        advanceAmount: totalAdvance,
        amountPaid: meta.amountPaid || 0,
        balanceDue,
        notes,
        notesHeading,
        showNotesBlock,
        footerText,
        senderProfile: sender,
        bankDetails: payment.bank,
        upiDetails: payment.upi,
        cryptoDetails: payment.crypto,
        signature,
        customColumns,
        columnConfig: {
          enableQtyColumn,
          enablePriceColumn,
          enableAdvanceColumn,
        },
        activeTheme,
        rawData: snapshot.data,
        items: items.map((it, idx) => ({
          description: it.description,
          subdesc: it.subdesc,
          quantity: it.quantity || 1,
          price: it.price || 0,
          advanceAmount: it.advanceAmount,
          customValues: it.customValues,
          order: idx,
        })),
      };

      await crmApi.createInvoice(payload);
      await refetchDbInvoices();
      showToast(`Invoice ${meta.number} saved to PostgreSQL database!`);
    } catch (err: any) {
      console.warn('Backend invoice save note:', err);
      showToast(`Invoice ${meta.number} saved!`);
    } finally {
      setIsSavingInvoice(false);
    }
  };

  // Load Invoice
  const handleLoadInvoice = (rec: SavedInvoiceRecord) => {
    const d = rec.data;
    if (!d) return;
    if (d.sender) setSender(d.sender);
    if (d.client) setClient(d.client);
    if (d.meta) setMeta(d.meta);
    if (d.items) setItems(d.items);
    if (d.taxRate !== undefined) setTaxRate(d.taxRate);
    if (d.discountRate !== undefined) setDiscountRate(d.discountRate);
    if (d.advancePercent !== undefined) setAdvancePercent(d.advancePercent);
    if (d.enableQtyColumn !== undefined) setEnableQtyColumn(d.enableQtyColumn);
    if (d.enablePriceColumn !== undefined) setEnablePriceColumn(d.enablePriceColumn);
    if (d.enableAdvanceColumn !== undefined) setEnableAdvanceColumn(d.enableAdvanceColumn);
    if (d.customColumns) setCustomColumns(d.customColumns);
    if (d.payment) {
      setPayment({
        ...d.payment,
        showBankQr: d.payment.showBankQr ?? true,
        customBankQr: d.payment.customBankQr || '',
        showUpiQr: d.payment.showUpiQr ?? true,
        showCryptoQr: d.payment.showCryptoQr ?? true,
      });
    }
    if (d.notes !== undefined) setNotes(d.notes);
    if (d.notesHeading !== undefined) setNotesHeading(d.notesHeading);
    if (d.showNotesBlock !== undefined) setShowNotesBlock(d.showNotesBlock);
    if (d.terms !== undefined) setTerms(d.terms);
    if (d.termsHeading !== undefined) setTermsHeading(d.termsHeading);
    if (d.showTermsBlock !== undefined) setShowTermsBlock(d.showTermsBlock);
    if (d.signature) setSignature(d.signature);
    if (d.showSignatureBlock !== undefined) setShowSignatureBlock(d.showSignatureBlock);
    if (d.footerText !== undefined) setFooterText(d.footerText);
    if (d.activeTheme) setActiveTheme(d.activeTheme);
    setIsHistoryModalOpen(false);
    showToast(`Loaded invoice ${rec.number}`);
  };

  // Delete Invoice from History & Database
  const handleDeleteInvoice = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved invoice?')) return;
    const updated = savedInvoices.filter((i) => i.id !== id);
    setSavedInvoices(updated);
    localStorage.setItem('digitechzo_saved_invoices', JSON.stringify(updated));

    try {
      if (id.includes('-') && id.length > 20) {
        await crmApi.deleteInvoice(id);
        await refetchDbInvoices();
        showToast('Invoice deleted from database');
      } else {
        showToast('Invoice deleted from history');
      }
    } catch {
      showToast('Invoice deleted');
    }
  };

  // Reset Form
  const handleResetForm = () => {
    if (!window.confirm('Reset invoice editor to default values?')) return;
    handleAutoGenerateInvoiceNumber();
    setClient({
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: '',
    });
    setItems([
      {
        id: '1',
        description: 'Commercial Service',
        subdesc: '',
        quantity: 1,
        price: 10000,
      },
    ]);
    setMeta((prev) => ({
      ...prev,
      poNumber: '',
      status: 'UNPAID',
      amountPaid: 0,
    }));
    setShowNotesBlock(true);
    setShowSignatureBlock(true);
    setActiveTheme(globalInvoiceTheme);
    showToast('Invoice form reset');
  };

  // Print Invoice
  const handlePrint = () => {
    window.print();
  };

  // High-Resolution PDF Download using html2canvas & jsPDF
  const handleDownloadPdf = async () => {
    const element = document.getElementById('invoiceDocument');
    if (!element) {
      showToast('Invoice preview document not found');
      return;
    }

    if (isExportingPdf) return;
    setIsExportingPdf(true);
    showToast('Generating high-resolution PDF...');

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('invoiceDocument');
          if (clonedEl) {
            clonedEl.style.width = '800px';
            clonedEl.style.maxWidth = '800px';
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.borderRadius = '0';
            clonedEl.style.border = 'none';

            // Hide screen-only controls and buttons in the exported PDF
            clonedEl.querySelectorAll('.no-print').forEach((el) => {
              (el as HTMLElement).style.display = 'none';
            });
            clonedEl.querySelectorAll('button').forEach((btn) => {
              btn.style.display = 'none';
            });

            // Prevent text cutoff and clipped font descenders
            clonedEl.querySelectorAll('h1, h2, h3, h4, p, span, strong, td, th').forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.overflow = 'visible';
            });
          }
        },
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfPageHeight;

      // Additional pages if content is long
      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfPageHeight;
      }

      const safeNum = (meta.number || 'INVOICE').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeClient = (client.name || 'Digitechzo').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${safeNum}_${safeClient}.pdf`;

      pdf.save(fileName);
      showToast(`Downloaded ${fileName}`);
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('Export failed. Opening browser print dialog as fallback...');
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // High-Resolution Image Download (.PNG)
  const handleDownloadImage = async () => {
    const element = document.getElementById('invoiceDocument');
    if (!element) {
      showToast('Invoice preview document not found');
      return;
    }

    if (isExportingImage) return;
    setIsExportingImage(true);
    showToast('Generating invoice image...');

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('invoiceDocument');
          if (clonedEl) {
            clonedEl.style.width = '800px';
            clonedEl.style.maxWidth = '800px';
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.borderRadius = '0';
            clonedEl.style.border = 'none';

            // Hide screen-only controls and buttons in the exported image
            clonedEl.querySelectorAll('.no-print').forEach((el) => {
              (el as HTMLElement).style.display = 'none';
            });
            clonedEl.querySelectorAll('button').forEach((btn) => {
              btn.style.display = 'none';
            });

            // Prevent text cutoff and clipped font descenders
            clonedEl.querySelectorAll('h1, h2, h3, h4, p, span, strong, td, th').forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.overflow = 'visible';
            });
          }
        },
      });

      const safeNum = (meta.number || 'INVOICE').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeClient = (client.name || 'Digitechzo').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${safeNum}_${safeClient}.png`;

      const link = document.createElement('a');
      link.download = fileName;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Downloaded ${fileName}`);
    } catch (err) {
      console.error('Image export failed:', err);
      showToast('Failed to generate invoice image');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Handle Switching Active Payment Method Tab (used both in Settings and on Live Invoice Paper)
  const handlePaymentTabChange = (tab: 'bank' | 'upi' | 'crypto') => {
    setPayment((p) => ({
      ...p,
      activeTab: tab,
      enableBank: tab === 'bank' ? true : p.enableBank,
      enableUpi: tab === 'upi' ? true : p.enableUpi,
      enableCrypto: tab === 'crypto' ? true : p.enableCrypto,
    }));
    try {
      localStorage.setItem('digitechzo_invoice_active_payment_tab', tab);
    } catch {}
  };

  // Currently active payment method directly controlled by user selection
  const activePaymentMethod: 'bank' | 'upi' | 'crypto' = payment.activeTab || 'bank';


  // Currently selected UPI Account
  const currentUpiAccount = useMemo(() => {
    return (
      savedUpiAccounts.find((u) => u.id === payment.upiPreset) || {
        id: payment.upiPreset,
        name: payment.upi.payeeName ? `${payment.upi.payeeName} UPI` : 'UPI Account',
        upiId: payment.upi.upiId,
        payeeName: payment.upi.payeeName,
        note: payment.upi.note,
      }
    );
  }, [savedUpiAccounts, payment.upiPreset, payment.upi]);

  // Currently selected Crypto Wallet
  const currentCryptoWallet = useMemo(() => {
    return (
      savedCryptoWallets.find((c) => c.id === payment.cryptoPreset) || {
        id: payment.cryptoPreset,
        name: payment.crypto.coin ? `${payment.crypto.coin} Wallet` : 'Crypto Wallet',
        coin: payment.crypto.coin,
        network: payment.crypto.network,
        address: payment.crypto.address,
      }
    );
  }, [savedCryptoWallets, payment.cryptoPreset, payment.crypto]);



  // Active Payment QR Code URL matching selected payment method
  const activePaymentQrUrl = useMemo(() => {
    const payableAmount = balanceDue > 0 ? balanceDue : grandTotal;
    if (activePaymentMethod === 'upi') {
      if (payment.showUpiQr === false) return '';
      if (payment.customUpiQr) return payment.customUpiQr;
      if (!payment.upi.upiId) return '';
      const upiUrl = `upi://pay?pa=${encodeURIComponent(payment.upi.upiId)}&pn=${encodeURIComponent(
        payment.upi.payeeName || sender.name || 'Digitechzo'
      )}&am=${payableAmount.toFixed(2)}&tn=${encodeURIComponent(
        payment.upi.note || `Invoice ${meta.number}`
      )}&cu=INR`;
      return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
    }

    if (activePaymentMethod === 'crypto') {
      if (payment.showCryptoQr === false) return '';
      if (payment.customCryptoQr) return payment.customCryptoQr;
      if (!payment.crypto.address) return '';
      return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
        payment.crypto.address
      )}`;
    }

    if (activePaymentMethod === 'bank') {
      if (payment.showBankQr === false) return '';
      if (payment.customBankQr) return payment.customBankQr;
      // Bank Transfer QR: generates instant scan & pay to bank account via UPI / IMPS or bank wire details
      if (payment.customUpiQr) return payment.customUpiQr;
      if (payment.upi.upiId) {
        const upiUrl = `upi://pay?pa=${encodeURIComponent(payment.upi.upiId)}&pn=${encodeURIComponent(
          payment.bank.accountName || sender.name || 'Digitechzo'
        )}&am=${payableAmount.toFixed(2)}&tn=${encodeURIComponent(
          `Invoice ${meta.number || 'DIGI-2026-001'} Bank Transfer`
        )}&cu=INR`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
      }
      if (payment.bank.accountNumber && payment.bank.ifscSwift) {
        const cleanIfsc = payment.bank.ifscSwift.split('/')[0].trim().replace(/[^A-Za-z0-9]/g, '');
        const bankUpi = `upi://pay?pa=${encodeURIComponent(payment.bank.accountNumber)}@${encodeURIComponent(
          cleanIfsc
        )}.ifsc.npci&pn=${encodeURIComponent(
          payment.bank.accountName || sender.name || 'Digitechzo'
        )}&am=${payableAmount.toFixed(2)}&cu=INR`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(bankUpi)}`;
      }
      const bankDetailsText = `Bank: ${payment.bank.bankName || 'HDFC Bank Ltd'}\nA/C: ${payment.bank.accountNumber || '50200098765432'}\nIFSC: ${payment.bank.ifscSwift || 'HDFC0001234'}\nHolder: ${payment.bank.accountName || sender.name || 'Digitechzo'}`;
      return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(bankDetailsText)}`;
    }

    return '';
  }, [
    activePaymentMethod,
    payment.showBankQr,
    payment.customBankQr,
    payment.showUpiQr,
    payment.customUpiQr,
    payment.upi,
    payment.showCryptoQr,
    payment.customCryptoQr,
    payment.crypto.address,
    payment.bank,
    sender.name,
    balanceDue,
    grandTotal,
    meta.number,
  ]);

  // Filtered saved invoices
  const filteredInvoices = useMemo(() => {
    if (!historySearch.trim()) return savedInvoices;
    const q = historySearch.toLowerCase();
    return savedInvoices.filter(
      (inv) =>
        inv.number.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        inv.date.toLowerCase().includes(q)
    );
  }, [savedInvoices, historySearch]);

  return (
    <div className="space-y-4 select-none pb-20 lg:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="h-4 w-4 text-[#57B71B]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Quick Actions Bar */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#57B71B] to-emerald-400 text-white shadow-md shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-lg font-extrabold text-white tracking-tight leading-tight">
                Digitechzo <span className="text-[#57B71B]">Invoice Studio</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[9.5px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PRO BILLING ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate sm:whitespace-normal">
              Design, customize & dispatch modern tax-compliant invoices
            </p>
          </div>
        </div>

        {/* View Mode & Actions Container */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Mobile Segmented Switcher (< 1024px) */}
          <div className="lg:hidden w-full flex bg-slate-800 p-0.5 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => setStudioViewMode('editor')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                studioViewMode !== 'preview'
                  ? 'bg-[#57B71B] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layout className="h-3.5 w-3.5" />
              <span>Editor Only</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioViewMode('preview')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                studioViewMode === 'preview'
                  ? 'bg-[#57B71B] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Full Preview</span>
            </button>
          </div>

          {/* Desktop View Mode Switcher (>= 1024px) */}
          <div className="hidden lg:flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 mr-1 shadow-inner">
            <button
              type="button"
              onClick={() => setStudioViewMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                studioViewMode === 'editor'
                  ? 'bg-[#57B71B] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Full Width Spacious Editor"
            >
              <Layout className="h-3.5 w-3.5" />
              <span>Editor Only</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                studioViewMode === 'split'
                  ? 'bg-[#57B71B] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Side-by-Side Split View"
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                studioViewMode === 'preview'
                  ? 'bg-[#57B71B] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Full Width Live Invoice Paper Preview"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Full Preview</span>
            </button>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex-initial flex items-center justify-center gap-1.5 h-8.5 px-3.5 rounded-xl text-xs font-bold bg-[#57B71B] hover:bg-[#49a016] text-white transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
              title="Download high-resolution PDF document"
            >
              {isExportingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
            </button>

            {/* Download PNG Button */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="flex-initial flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
              title="Download invoice as PNG image"
            >
              {isExportingImage ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isExportingImage ? 'Exporting...' : 'PNG'}</span>
            </button>

            {/* Save Invoice */}
            <button
              type="button"
              onClick={() => handleSaveInvoice()}
              disabled={isSavingInvoice}
              className="flex-initial flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              title="Save Invoice to Database & History"
            >
              <Bookmark className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isSavingInvoice ? 'Saving...' : 'Save'}</span>
            </button>

            {/* Draft */}
            <button
              type="button"
              onClick={() => handleSaveInvoice('DRAFT')}
              disabled={isSavingInvoice}
              className="flex-initial flex items-center justify-center gap-1 h-8.5 px-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Save as Draft"
            >
              Draft
            </button>

            {/* History */}
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex-initial flex items-center justify-center gap-1 h-8.5 px-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="View Saved Invoices History"
            >
              <FolderOpen className="h-3.5 w-3.5 text-blue-400" />
              <span>History</span>
              {savedInvoices.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[9.5px] font-bold rounded-full bg-blue-500 text-white">
                  {savedInvoices.length}
                </span>
              )}
            </button>

            {/* Print / Browser PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex-initial flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Print or Save as PDF via browser"
            >
              <Printer className="h-3.5 w-3.5 text-slate-700" />
              <span>Print</span>
            </button>

            {/* Reset Form */}
            <button
              type="button"
              onClick={handleResetForm}
              className="flex items-center justify-center h-8.5 w-8.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer shrink-0"
              title="Reset Form to Defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Layout: Responsive Modes (Full Editor / Side-by-Side Split / Full Preview) */}
      <div
        className={
          studioViewMode === 'split'
            ? 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-start'
            : 'max-w-5xl mx-auto w-full'
        }
      >
        {/* ========================================================= */}
        {/* LEFT COLUMN: Admin Editor Form Cards                      */}
        {/* ========================================================= */}
        <div
          className={`no-print space-y-4 ${
            studioViewMode === 'preview'
              ? 'hidden'
              : studioViewMode === 'split'
              ? 'lg:col-span-5'
              : 'w-full'
          }`}
        >
          {/* Card 1: Sender (Your Business) & Logo */}
          <details open className="group rounded-card border border-border bg-white shadow-xs overflow-hidden">
            <summary className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-border font-bold text-xs text-txt-primary cursor-pointer hover:bg-slate-100 transition-colors list-none">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#57B71B]" />
                <span>Sender (Your Business Profile)</span>
              </div>
              <span className="text-[10px] text-txt-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-3.5 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCompanyProfile}
                  className="flex-1 h-7 rounded-btn border border-border bg-white hover:bg-slate-50 text-[11px] font-semibold text-txt-secondary flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Bookmark className="h-3 w-3 text-[#57B71B]" /> Save Profile
                </button>
                <button
                  type="button"
                  onClick={handleLoadCompanyProfile}
                  className="flex-1 h-7 rounded-btn border border-border bg-white hover:bg-slate-50 text-[11px] font-semibold text-txt-secondary flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FolderOpen className="h-3 w-3 text-blue-500" /> Load Profile
                </button>
              </div>

              {/* Logo Upload Dropzone & Size Controls */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-txt-secondary">Company Logo</label>
                  {sender.logo && (
                    <span className="text-[10px] text-txt-muted font-medium">
                      Height: <strong className="text-[#57B71B] font-bold">{sender.logoHeight || 48}px</strong>
                    </span>
                  )}
                </div>

                <div className="border border-dashed border-slate-300 rounded-btn p-3 bg-slate-50 text-center flex flex-col items-center justify-center relative hover:border-[#57B71B] transition-colors">
                  {sender.logo ? (
                    <div className="w-full space-y-2.5">
                      <div className="relative group w-full flex items-center justify-between bg-white p-2 rounded-md border border-slate-200">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img
                            src={sender.logo}
                            alt="Company Logo"
                            style={{ height: `${Math.min(sender.logoHeight || 48, 56)}px` }}
                            className="max-w-[140px] object-contain rounded"
                          />
                          <span className="text-[10px] text-txt-muted truncate">Custom Logo</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <label
                            className="h-6 px-2 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-semibold flex items-center cursor-pointer transition-colors"
                            title="Replace Logo"
                          >
                            Replace
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>
                          <button
                            type="button"
                            onClick={() => setSender((p: any) => ({ ...p, logo: '' }))}
                            className="h-6 w-6 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer transition-colors"
                            title="Remove Logo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Logo Height Controller */}
                      <div className="bg-white p-2.5 rounded-md border border-slate-200 text-left space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1">
                            <span>Logo Display Height</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="24"
                              max="160"
                              value={sender.logoHeight || 48}
                              onChange={(e) => {
                                const val = Math.max(20, Math.min(200, parseInt(e.target.value, 10) || 48));
                                setSender((p: any) => ({ ...p, logoHeight: val }));
                              }}
                              className="w-14 h-6 text-center text-xs font-bold border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-[#57B71B] outline-none"
                            />
                            <span className="text-[10px] text-slate-500 font-semibold">px</span>
                          </div>
                        </div>

                        {/* Slider */}
                        <input
                          type="range"
                          min="24"
                          max="140"
                          step="2"
                          value={sender.logoHeight || 48}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setSender((p: any) => ({ ...p, logoHeight: val }));
                          }}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#57B71B]"
                        />

                        {/* Preset quick buttons */}
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          {[
                            { label: 'Small', h: 36 },
                            { label: 'Medium', h: 48 },
                            { label: 'Large', h: 64 },
                            { label: 'XL', h: 84 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setSender((p: any) => ({ ...p, logoHeight: preset.h }))}
                              className={`flex-1 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
                                (sender.logoHeight || 48) === preset.h
                                  ? 'bg-[#57B71B] text-white border-[#57B71B]'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span className="hidden sm:inline">{preset.label} </span>
                              <span>{preset.h}px</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center">
                      <Upload className="h-5 w-5 text-txt-muted mb-1" />
                      <span className="text-[11px] font-semibold text-txt-primary">Click to upload company logo</span>
                      <span className="text-[10px] text-txt-muted">PNG, JPG, SVG, WebP (Auto-optimized & resized)</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Business Name</label>
                  <input
                    type="text"
                    value={sender.name}
                    onChange={(e) => setSender({ ...sender, name: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Email Address</label>
                  <input
                    type="email"
                    value={sender.email}
                    onChange={(e) => setSender({ ...sender, email: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Street Address</label>
                <input
                  type="text"
                  value={sender.address}
                  onChange={(e) => setSender({ ...sender, address: e.target.value })}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Phone Number</label>
                  <input
                    type="text"
                    value={sender.phone}
                    onChange={(e) => setSender({ ...sender, phone: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">GST / Tax ID</label>
                  <input
                    type="text"
                    value={sender.taxId}
                    onChange={(e) => setSender({ ...sender, taxId: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Card 2: Bill To (Client Information) */}
          <details open className="group rounded-card border border-border bg-white shadow-xs overflow-hidden">
            <summary className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-border font-bold text-xs text-txt-primary cursor-pointer hover:bg-slate-100 transition-colors list-none">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                <span>Bill To (Client Information)</span>
              </div>
              <span className="text-[10px] text-txt-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-3.5 space-y-3 text-xs">
              {/* Quick Select from CRM Leads */}
              {leads.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-[#57B71B] flex items-center gap-1 mb-1">
                    <Sparkles className="h-3 w-3" /> Quick Auto-Fill from CRM Leads:
                  </label>
                  <CustomSelect
                    value=""
                    onChange={(val) => {
                      const selected = leads.find((l: any) => l.id === val);
                      if (selected) {
                        setClient({
                          name: selected.companyName || selected.fullName || '',
                          contact: selected.fullName || '',
                          email: selected.email || '',
                          phone: selected.phone || '',
                          address: `${selected.serviceInterest || 'Enterprise Client'} - Registered Prospect`,
                        });
                        showToast(`Filled client details for ${selected.fullName}`);
                      }
                    }}
                    placeholder="Select an existing CRM Lead / Company..."
                    options={leads.map((lead: any) => ({
                      value: lead.id,
                      label: lead.companyName ? `${lead.companyName} (${lead.fullName})` : lead.fullName,
                    }))}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">
                    Client Name / Business
                  </label>
                  <input
                    type="text"
                    value={client.name}
                    onChange={(e) => setClient({ ...client, name: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Contact Person</label>
                  <input
                    type="text"
                    value={client.contact}
                    onChange={(e) => setClient({ ...client, contact: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Client Email</label>
                  <input
                    type="email"
                    value={client.email}
                    onChange={(e) => setClient({ ...client, email: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Client Phone</label>
                  <input
                    type="text"
                    value={client.phone}
                    onChange={(e) => setClient({ ...client, phone: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Billing Address</label>
                <input
                  type="text"
                  value={client.address}
                  onChange={(e) => setClient({ ...client, address: e.target.value })}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                />
              </div>
            </div>
          </details>

          {/* Card 3: Invoice Number, Due Dates & Status */}
          <details open className="group rounded-card border border-border bg-white shadow-xs overflow-hidden">
            <summary className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-border font-bold text-xs text-txt-primary cursor-pointer hover:bg-slate-100 transition-colors list-none">
              <div className="flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-purple-500" />
                <span>Invoice Number, Dates & Status</span>
              </div>
              <span className="text-[10px] text-txt-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-3.5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Invoice #</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={meta.number}
                      onChange={(e) => setMeta({ ...meta, number: e.target.value })}
                      className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs font-bold text-txt-primary font-tabular"
                    />
                    <button
                      type="button"
                      onClick={handleAutoGenerateInvoiceNumber}
                      className="h-8 w-8 rounded-btn border border-border bg-slate-50 hover:bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer"
                      title="Generate new invoice number"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-txt-muted" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">P.O. / Ref Number</label>
                  <input
                    type="text"
                    value={meta.poNumber}
                    onChange={(e) => setMeta({ ...meta, poNumber: e.target.value })}
                    placeholder="PO-98402 (Optional)"
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Invoice Date</label>
                  <input
                    type="date"
                    value={meta.date}
                    onChange={(e) => setMeta({ ...meta, date: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary font-tabular"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Payment Terms</label>
                  <CustomSelect
                    value={meta.paymentTermsDays}
                    onChange={(val) => setMeta({ ...meta, paymentTermsDays: val })}
                    options={[
                      { value: '0', label: 'Due on Receipt' },
                      { value: '7', label: 'Net 7 Days' },
                      { value: '15', label: 'Net 15 Days' },
                      { value: '30', label: 'Net 30 Days' },
                      { value: '60', label: 'Net 60 Days' },
                      { value: 'custom', label: 'Custom Date' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Payment Due</label>
                  <input
                    type="date"
                    value={meta.dueDate}
                    onChange={(e) => setMeta({ ...meta, dueDate: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs font-semibold text-txt-primary font-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Currency</label>
                  <CustomSelect
                    value={meta.currency}
                    onChange={(val) => setMeta({ ...meta, currency: val })}
                    options={[
                      { value: '₹', label: 'INR (₹)' },
                      { value: '$', label: 'USD ($)' },
                      { value: '€', label: 'EUR (€)' },
                      { value: '£', label: 'GBP (£)' },
                      { value: 'AED', label: 'AED (AED)' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Invoice Status</label>
                  <CustomSelect
                    value={meta.status}
                    onChange={(val) => setMeta({ ...meta, status: val })}
                    options={[
                      { value: 'DRAFT', label: '⚪ DRAFT' },
                      { value: 'UNPAID', label: '🔴 UNPAID' },
                      { value: 'PARTIALLY_PAID', label: '🟡 PARTIALLY PAID' },
                      { value: 'PAID', label: '🟢 PAID' },
                      { value: 'CANCELLED', label: '🟣 CANCELLED' },
                    ]}
                  />
                </div>
              </div>

              {meta.status === 'PARTIALLY_PAID' && (
                <div className="p-2.5 rounded-btn bg-amber-50 border border-amber-200">
                  <label className="text-[11px] font-semibold text-amber-900 block mb-0.5">
                    Amount Paid to Date ({meta.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={meta.amountPaid || ''}
                    onChange={(e) => setMeta({ ...meta, amountPaid: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter amount already paid..."
                    className="w-full h-8 rounded-input border border-amber-300 bg-white px-2.5 text-xs text-txt-primary font-tabular"
                  />
                </div>
              )}
            </div>
          </details>

          {/* Card 4: Items & Description */}
          <details open className="group rounded-card border border-border bg-white shadow-xs overflow-hidden">
            <summary className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-border font-bold text-xs text-txt-primary cursor-pointer hover:bg-slate-100 transition-colors list-none">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-emerald-500" />
                <span>Invoice Items & Services ({items.length})</span>
              </div>
              <span className="text-[10px] text-txt-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-3.5 space-y-3 text-xs">
              {/* Invoice Column Settings (Admin / User management) */}
              <div className="p-2.5 rounded-btn bg-slate-50 border border-slate-200/90 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-[#57B71B]" />
                    <span className="font-bold text-xs text-txt-primary">Invoice Column Settings</span>
                    {!isAdmin && (
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        Standard User
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add Custom Column Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenAddColumnModal()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#57B71B] hover:bg-[#469815] text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                      title="Add a custom column to invoice items (e.g. Milestone Amount, Service Fee, Installation Charge)"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Custom Column
                    </button>
                  </div>
                </div>

                {/* Standard Columns Visibility & Quick Toggles */}
                <div className="pt-1.5 border-t border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700">Standard Columns:</span>
                    <span className="text-[10px] text-txt-muted">Toggle or remove headings anytime</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* 1. Qty Column Toggle */}
                    <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-txt-primary">
                        <input
                          type="checkbox"
                          checked={enableQtyColumn}
                          disabled={!isAdmin}
                          onChange={(e) => handleToggleQtyColumn(e.target.checked)}
                          className="rounded accent-[#57B71B] cursor-pointer"
                        />
                        <span>Qty</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleQtyColumn(!enableQtyColumn)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        title={enableQtyColumn ? 'Hide Qty column' : 'Show Qty column'}
                      >
                        {enableQtyColumn ? <Eye className="h-3 w-3 text-[#57B71B]" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
                      </button>
                    </div>

                    {/* 2. Final Amount Column Toggle */}
                    <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-txt-primary">
                        <input
                          type="checkbox"
                          checked={enablePriceColumn}
                          disabled={!isAdmin}
                          onChange={(e) => handleTogglePriceColumn(e.target.checked)}
                          className="rounded accent-[#57B71B] cursor-pointer"
                        />
                        <span>Final Amount</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleTogglePriceColumn(!enablePriceColumn)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        title={enablePriceColumn ? 'Hide Final Amount column' : 'Show Final Amount column'}
                      >
                        {enablePriceColumn ? <Eye className="h-3 w-3 text-[#57B71B]" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
                      </button>
                    </div>

                    {/* 3. Advanced Amount Column Toggle & Remove */}
                    <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-txt-primary">
                        <input
                          type="checkbox"
                          checked={enableAdvanceColumn}
                          disabled={!isAdmin}
                          onChange={(e) => handleToggleAdvanceColumn(e.target.checked)}
                          className="rounded accent-[#57B71B] cursor-pointer"
                        />
                        <span>Advanced Amount</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleAdvanceColumn(!enableAdvanceColumn)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          title={enableAdvanceColumn ? 'Hide Advanced Amount column' : 'Show Advanced Amount column'}
                        >
                          {enableAdvanceColumn ? <Eye className="h-3 w-3 text-[#57B71B]" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
                        </button>
                        {enableAdvanceColumn && (
                          <button
                            type="button"
                            onClick={() => {
                              const hasAdvanceValues = items.some(
                                (it) => typeof it.advanceAmount === 'number' && it.advanceAmount > 0
                              );
                              if (hasAdvanceValues) {
                                const ok = window.confirm(
                                  'Delete and clear all Advanced Amounts from this invoice? This will remove advance values and hide the column.'
                                );
                                if (!ok) return;
                              }
                              setItems((prev) => prev.map((it) => ({ ...it, advanceAmount: undefined })));
                              handleToggleAdvanceColumn(false);
                              showToast('Advanced Amount column deleted and cleared');
                            }}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                            title="Delete / Remove Advanced Amount column"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Columns Chips / Reorder / Edit List */}
                {customColumns.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-200/70 space-y-1.5">
                    <span className="text-[10px] font-bold text-txt-muted uppercase tracking-wider block">
                      Custom Columns ({customColumns.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {customColumns.map((col, idx) => (
                        <div
                          key={col.id}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-medium transition-all ${
                            col.showInPreview
                              ? 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                              : 'bg-slate-100/80 border-slate-200 text-slate-400 line-through'
                          }`}
                        >
                          <span className="font-bold">{col.label}</span>
                          <span className="text-[9px] uppercase px-1 rounded bg-slate-100 text-slate-500 font-mono">
                            {col.type}
                          </span>

                          {/* Visibility Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleColumnVisibility(col.id)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                            title={col.showInPreview ? 'Hide from invoice preview & PDF' : 'Show in invoice preview & PDF'}
                          >
                            {col.showInPreview ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </button>

                          {/* Reorder Buttons */}
                          {isAdmin && idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleReorderColumn(idx, 'up')}
                              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                              title="Move left"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                          )}
                          {isAdmin && idx < customColumns.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleReorderColumn(idx, 'down')}
                              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                              title="Move right"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          )}

                          {/* Edit button */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenAddColumnModal(col)}
                              className="text-slate-400 hover:text-[#57B71B] p-0.5 cursor-pointer"
                              title="Edit column settings"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}

                          {/* Delete button */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomColumn(col)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                              title="Delete column"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Add Presets Chips */}
              <div>
                <span className="text-[10px] font-bold text-txt-muted uppercase tracking-wider block mb-1.5">
                  Quick Add Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddPreset('Web Application Development', 45000)}
                    className="px-2.5 py-1 rounded-btn bg-slate-100 hover:bg-emerald-50 hover:text-[#57B71B] border border-border text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    💻 Web Dev (₹45k)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPreset('UI/UX Mobile Design', 25000)}
                    className="px-2.5 py-1 rounded-btn bg-slate-100 hover:bg-emerald-50 hover:text-[#57B71B] border border-border text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    🎨 UI/UX (₹25k)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPreset('API Integration & Backend', 30000)}
                    className="px-2.5 py-1 rounded-btn bg-slate-100 hover:bg-emerald-50 hover:text-[#57B71B] border border-border text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    ⚡ API (₹30k)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPreset('Cloud Server Hosting Setup', 15000)}
                    className="px-2.5 py-1 rounded-btn bg-slate-100 hover:bg-emerald-50 hover:text-[#57B71B] border border-border text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    ☁️ Hosting (₹15k)
                  </button>
                </div>
              </div>

              {/* Line Items List */}
              <div className="space-y-2.5">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-2.5 rounded-btn border border-border bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-txt-muted">Item #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, description: val } : it)));
                      }}
                      placeholder="Service or product description..."
                      className="w-full h-7 rounded border border-border bg-white px-2 text-xs font-semibold text-txt-primary"
                    />

                    <input
                      type="text"
                      value={item.subdesc || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, subdesc: val } : it)));
                      }}
                      placeholder="Detailed line scope/deliverables (optional)..."
                      className="w-full h-7 rounded border border-border bg-white px-2 text-[11px] text-txt-muted"
                    />

                    {/* Standard Numeric Fields: Qty, Full Amount, Advanced Amount */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
                      {enableQtyColumn && (
                        <div className="col-span-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] text-txt-muted block">Qty</label>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Hide Qty column from invoice?')) {
                                  handleToggleQtyColumn(false);
                                }
                              }}
                              className="text-[9px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Hide / Remove Qty column"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 1 : parseFloat(e.target.value) || 1;
                              setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, quantity: val } : it)));
                            }}
                            className="w-full h-7 rounded border border-border bg-white px-2 text-xs text-txt-primary text-center font-tabular"
                          />
                        </div>
                      )}

                      {enablePriceColumn && (
                        <div className="col-span-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] text-txt-muted block truncate">
                              Final Amount ({meta.currency})
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Hide Final Amount column from invoice?')) {
                                  handleTogglePriceColumn(false);
                                }
                              }}
                              className="text-[9px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Hide / Remove Final Amount column"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={item.price === 0 ? '' : item.price}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, price: val } : it)));
                            }}
                            placeholder="0"
                            className="w-full h-7 rounded border border-border bg-white px-2 text-xs text-txt-primary font-tabular"
                          />
                        </div>
                      )}

                      {enableAdvanceColumn && (
                        <div className="col-span-1 xs:col-span-2 sm:col-span-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] text-txt-muted block truncate">
                              Advance ({meta.currency})
                            </label>
                            <div className="flex items-center gap-1">
                              {typeof item.advanceAmount === 'number' && item.advanceAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItems((prev) =>
                                      prev.map((it) => (it.id === item.id ? { ...it, advanceAmount: undefined } : it))
                                    );
                                    showToast(`Cleared advance amount for Item #${idx + 1}`);
                                  }}
                                  className="text-[9px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                                  title="Clear advance amount for this item"
                                >
                                  <X className="h-2.5 w-2.5" /> Clear
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Hide Advanced Amount column from invoice?')) {
                                    handleToggleAdvanceColumn(false);
                                  }
                                }}
                                className="text-[9px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Hide / Remove Advanced Amount column"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={item.advanceAmount === 0 || item.advanceAmount === undefined ? '' : item.advanceAmount}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseFloat(e.target.value) || 0;
                                setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, advanceAmount: val } : it)));
                              }}
                              placeholder="0"
                              className="w-full h-7 rounded border border-emerald-300 bg-emerald-50/40 px-2 pr-6 text-xs font-semibold text-emerald-800 font-tabular"
                            />
                            {typeof item.advanceAmount === 'number' && item.advanceAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setItems((prev) =>
                                    prev.map((it) => (it.id === item.id ? { ...it, advanceAmount: undefined } : it))
                                  );
                                }}
                                className="absolute right-1 text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                title="Delete advance amount"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Custom Column Inputs for this Item */}
                    {customColumns.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {customColumns.map((col) => {
                          const val = item.customValues?.[col.key] ?? col.defaultValue ?? '';
                          return (
                            <div key={col.key}>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[10px] text-txt-muted block truncate font-medium">
                                  {col.label} {col.type === 'currency' ? `(${meta.currency})` : ''}
                                  {col.required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomColumn(col)}
                                  className="text-[9px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title={`Remove / Delete column "${col.label}"`}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                              <input
                                type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                                value={val}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const rawVal = e.target.value;
                                  setItems((prev) =>
                                    prev.map((it) =>
                                      it.id === item.id
                                        ? {
                                            ...it,
                                            customValues: {
                                              ...(it.customValues || {}),
                                              [col.key]: rawVal,
                                            },
                                          }
                                        : it
                                    )
                                  );
                                }}
                                placeholder={col.defaultValue !== undefined ? String(col.defaultValue) : `Enter ${col.label.toLowerCase()}...`}
                                className="w-full h-7 rounded border border-border bg-white px-2 text-xs text-txt-primary"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex-1 w-full h-8 rounded-btn border border-dashed border-[#57B71B] text-[#57B71B] hover:bg-emerald-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add New Item / Service
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddColumnModal()}
                  className="w-full sm:w-auto h-8 px-3 rounded-btn border border-dashed border-slate-300 hover:border-[#57B71B] text-slate-600 hover:text-[#57B71B] hover:bg-emerald-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Add more headings / custom columns to invoice items"
                >
                  <Plus className="h-3.5 w-3.5" /> + Add Heading / Column
                </button>
              </div>
            </div>
          </details>

          {/* Card 5: Payment Options (Bank, UPI & Crypto) */}
          <details open className="group rounded-card border border-border bg-white shadow-xs overflow-hidden">
            <summary className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-border font-bold text-xs text-txt-primary cursor-pointer hover:bg-slate-100 transition-colors list-none">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-500" />
                <span>Payment Methods (Bank, UPI & Crypto)</span>
              </div>
              <span className="text-[10px] text-txt-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-3.5 space-y-3 text-xs">
              {/* Payment Tab Selector to Edit Details & Switch Active View */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Select Tab to Configure & Set Active:
                </label>
                <div className="flex rounded-btn bg-slate-100 p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => handlePaymentTabChange('bank')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      payment.activeTab === 'bank' ? 'bg-white text-txt-primary shadow-xs font-bold' : 'text-txt-muted'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Bank Transfer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTabChange('upi')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      payment.activeTab === 'upi' ? 'bg-white text-txt-primary shadow-xs font-bold' : 'text-txt-muted'
                    }`}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>UPI Pay / QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTabChange('crypto')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      payment.activeTab === 'crypto' ? 'bg-white text-txt-primary shadow-xs font-bold' : 'text-txt-muted'
                    }`}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>Crypto Wallet</span>
                  </button>
                </div>
              </div>

              {/* Tab Content: Bank Transfer */}
              {payment.activeTab === 'bank' && (
                <div className="space-y-3 pt-1">

                  <div>
                    <label className="text-[11px] font-semibold text-[#57B71B] block mb-1">
                      Bank Account / Payment Destination:
                    </label>

                    {/* Custom Searchable & Addable Bank Dropdown */}
                    <div ref={bankDropdownRef} className="relative w-full">
                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !isBankDropdownOpen;
                          setIsBankDropdownOpen(next);
                          setBankSearchFilter('');
                          setIsAddingNewBank(false);
                          if (next) {
                            setTimeout(() => {
                              bankSearchInputRef.current?.focus();
                            }, 50);
                          }
                        }}
                        className="w-full h-9 rounded-input border border-border bg-white px-2.5 text-xs text-left flex items-center justify-between gap-2 shadow-subtle hover:border-[#57B71B] focus:outline-none focus:ring-1 focus:ring-[#57B71B] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Landmark className="h-4 w-4 text-[#57B71B] shrink-0" />
                          <span className="text-txt-primary font-bold truncate">
                            {payment.bank.bankName?.trim() ? payment.bank.bankName.trim() : 'Select or Add Bank Account'}
                          </span>
                          {payment.bank.accountNumber && (
                            <span className="text-[10px] text-txt-muted font-mono shrink-0">
                              (•••{payment.bank.accountNumber.slice(-4)})
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-txt-muted shrink-0 transition-transform duration-200 ${
                            isBankDropdownOpen ? 'rotate-180 text-[#57B71B]' : ''
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {isBankDropdownOpen && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-card shadow-xl py-1 text-xs max-h-80 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100">
                          {/* Search Header */}
                          <div className="p-1.5 border-b border-border/60 bg-slate-50/50">
                            <div className="relative flex items-center">
                              <Search className="absolute left-2.5 h-3.5 w-3.5 text-txt-muted pointer-events-none" />
                              <input
                                ref={bankSearchInputRef}
                                type="text"
                                value={bankSearchFilter}
                                onChange={(e) => setBankSearchFilter(e.target.value)}
                                placeholder="Search bank accounts or type to filter..."
                                className="w-full h-7 rounded-input border border-border bg-white pl-8 pr-2 text-xs text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-1 focus:ring-[#57B71B]"
                              />
                            </div>
                          </div>

                          {/* Bank Accounts List */}
                          <div className="overflow-y-auto flex-1 py-1 max-h-48 divide-y divide-slate-100/60">
                            <div className="px-2.5 py-1 text-[10px] font-semibold text-txt-muted uppercase tracking-wider flex items-center justify-between">
                              <span>Saved Bank Accounts ({savedBanks.length})</span>
                              <span className="text-[9px] font-normal lowercase">click to select</span>
                            </div>

                            {savedBanks
                              .filter((b) => {
                                if (!b.bankName || b.bankName.trim() === '' || b.bankName.trim().toLowerCase() === 'unnamed bank account') {
                                  return false;
                                }
                                const q = bankSearchFilter.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  (b.bankName || '').toLowerCase().includes(q) ||
                                  (b.accountNumber || '').toLowerCase().includes(q) ||
                                  (b.accountName || '').toLowerCase().includes(q)
                                );
                              })
                              .map((b) => {
                                const isSelected = payment.bankPreset === b.id;
                                const isEditingThis = editingBankId === b.id;

                                if (isEditingThis) {
                                  return (
                                    <div key={b.id} className="p-1.5 bg-emerald-50/50 flex items-center gap-1.5">
                                      <input
                                        ref={editBankInputRef}
                                        type="text"
                                        value={editingBankName}
                                        onChange={(e) => setEditingBankName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSaveBankRename(b.id);
                                          }
                                          if (e.key === 'Escape') {
                                            setEditingBankId(null);
                                          }
                                        }}
                                        className="flex-1 h-7 rounded border border-[#57B71B] bg-white px-2 text-xs font-bold text-txt-primary focus:outline-none"
                                        placeholder="Enter bank name..."
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveBankRename(b.id)}
                                        className="h-7 px-2 rounded bg-[#57B71B] hover:bg-[#469815] text-white text-[11px] font-bold cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingBankId(null)}
                                        className="h-7 px-2 text-[11px] text-txt-muted hover:text-txt-primary cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={b.id}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 hover:bg-slate-50 transition-colors group ${
                                      isSelected ? 'bg-emerald-50/60 font-bold' : ''
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPayment((p) => ({
                                          ...p,
                                          bankPreset: b.id,
                                          bank: b,
                                        }));
                                        setIsBankDropdownOpen(false);
                                        setBankSearchFilter('');
                                        setIsAddingNewBank(false);
                                      }}
                                      className="flex-1 flex items-center gap-2 text-left truncate cursor-pointer mr-2"
                                    >
                                      <Landmark className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-[#57B71B]' : 'text-slate-400'}`} />
                                      <span className={`truncate text-xs ${isSelected ? 'text-[#57B71B]' : 'text-txt-primary'}`}>
                                        {b.bankName.trim()}
                                      </span>
                                      {b.accountNumber && (
                                        <span className="text-[10px] text-txt-muted font-mono shrink-0">
                                          (•••{b.accountNumber.slice(-4)})
                                        </span>
                                      )}
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                        Custom
                                      </span>
                                    </button>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {isSelected && <Check className="h-4 w-4 text-[#57B71B] shrink-0 mr-1" />}
                                      {/* Edit Bank Name Button */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingBankId(b.id);
                                          setEditingBankName(b.bankName);
                                          setTimeout(() => editBankInputRef.current?.focus(), 50);
                                        }}
                                        className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                        title="Edit / Rename bank name"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      {/* Delete Bank Option */}
                                      {savedBanks.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSavedBank(b.id);
                                          }}
                                          className="p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                                          title="Remove this bank account"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Other / Add New Bank Account Section */}
                          <div className="border-t border-border/70 p-1.5 bg-slate-50/80">
                            {isAddingNewBank ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    ref={newBankInputRef}
                                    type="text"
                                    value={newBankInput}
                                    onChange={(e) => setNewBankInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddNewBankConfirm();
                                      }
                                      if (e.key === 'Escape') {
                                        setIsAddingNewBank(false);
                                      }
                                    }}
                                    placeholder="Enter new bank account name..."
                                    className="flex-1 h-7 rounded-input border border-border bg-white px-2 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-[#57B71B]"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddNewBankConfirm}
                                    disabled={!newBankInput.trim()}
                                    className="h-7 px-2.5 rounded-btn bg-[#57B71B] hover:bg-[#469815] text-white text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                  >
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAddingNewBank(false);
                                      setNewBankInput('');
                                    }}
                                    className="h-7 px-2 text-xs text-txt-muted hover:text-txt-primary cursor-pointer shrink-0"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <span className="text-[10px] text-txt-muted block px-0.5">
                                  Press Enter to save and select immediately for invoice bank transfer.
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingNewBank(true);
                                  if (bankSearchFilter.trim()) {
                                    setNewBankInput(bankSearchFilter.trim());
                                  }
                                  setTimeout(() => {
                                    newBankInputRef.current?.focus();
                                  }, 50);
                                }}
                                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer text-xs"
                              >
                                <div className="flex items-center gap-1.5 font-bold text-[#2563EB]">
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Other / Add New Bank Account</span>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 text-txt-muted font-medium">
                                  Custom
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">
                        Rename / Bank Account Name <span className="text-[#57B71B] font-bold">(Updates in Dropdown)</span>
                      </label>
                      <input
                        type="text"
                        value={payment.bank.bankName}
                        onChange={(e) => handleUpdateCurrentBank({ bankName: e.target.value })}
                        placeholder="Type Bank Name to rename (e.g. State Bank of India, Axis Bank)..."
                        className="w-full h-8 rounded-input border border-[#57B71B]/50 focus:border-[#57B71B] bg-white px-2 text-xs font-bold text-txt-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">Account Holder Name</label>
                      <input
                        type="text"
                        value={payment.bank.accountName}
                        onChange={(e) => handleUpdateCurrentBank({ accountName: e.target.value })}
                        placeholder="e.g. Digitechzo Media & Technologies Pvt Ltd"
                        className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">Account Number</label>
                      <input
                        type="text"
                        value={payment.bank.accountNumber}
                        onChange={(e) => handleUpdateCurrentBank({ accountNumber: e.target.value })}
                        placeholder="e.g. 50200098765432"
                        className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">IFSC / SWIFT / IBAN</label>
                      <input
                        type="text"
                        value={payment.bank.ifscSwift}
                        onChange={(e) => handleUpdateCurrentBank({ ifscSwift: e.target.value })}
                        placeholder="e.g. SBIN0001234 / SWIFT code"
                        className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-txt-muted block mb-0.5">Branch & City</label>
                    <input
                      type="text"
                      value={payment.bank.branch}
                      onChange={(e) => handleUpdateCurrentBank({ branch: e.target.value })}
                      placeholder="e.g. Anna Salai Branch, Chennai"
                      className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs"
                    />
                  </div>

                  {/* Add Bank Account and Delete Actions */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleAddBankAccount}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[#57B71B] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Another Bank Account
                    </button>
                    {savedBanks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedBank(payment.bankPreset)}
                        className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-semibold"
                        title="Delete this bank account from list"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete this Bank
                      </button>
                    )}
                  </div>

                  {/* Bank QR Code Option: Upload Custom QR Image or Auto-generated */}
                  <div className="border border-slate-200 rounded-btn p-2.5 bg-slate-50 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-txt-primary block">Bank QR Code Image:</span>
                      {payment.showBankQr === false ? (
                        <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          QR Code Removed
                        </span>
                      ) : payment.customBankQr ? (
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Custom Image Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Dynamic Auto-Generated</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs text-txt-secondary cursor-pointer">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-white hover:bg-slate-50 text-[11px] font-semibold text-txt-primary shadow-2xs">
                          <Upload className="h-3 w-3" /> Upload Bank QR Image
                        </span>
                        <input type="file" accept="image/*" onChange={handleBankQrUpload} className="hidden" />
                      </label>

                      {/* Remove/Delete Icon Button */}
                      {payment.showBankQr !== false ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPayment((p) => ({ ...p, showBankQr: false, customBankQr: '' }));
                            showToast('Bank QR code removed from invoice');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-200 bg-white hover:bg-rose-50 text-[11px] font-semibold text-rose-600 shadow-2xs transition-colors cursor-pointer"
                          title="Remove QR code from invoice"
                        >
                          <Trash2 className="h-3 w-3 text-rose-500" /> Remove QR
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPayment((p) => ({ ...p, showBankQr: true }));
                            showToast('Bank QR code restored');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#57B71B]/30 bg-[#57B71B]/10 hover:bg-[#57B71B]/20 text-[11px] font-semibold text-[#57B71B] shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Restore Dynamic QR
                        </button>
                      )}

                      {payment.customBankQr && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayment((p) => ({ ...p, customBankQr: '' }));
                            showToast('Reverted to dynamic Bank QR');
                          }}
                          className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                        >
                          Use Auto-Generated
                        </button>
                      )}
                    </div>

                    {/* Thumbnail preview if custom QR is uploaded */}
                    {payment.customBankQr && (
                      <div className="flex items-center gap-2 pt-1">
                        <img
                          src={payment.customBankQr}
                          alt="Custom Bank QR Preview"
                          className="h-12 w-12 object-contain rounded border border-slate-200 bg-white p-0.5"
                        />
                        <span className="text-[10px] text-emerald-700 font-semibold">Custom QR active and displayed on invoice</span>
                      </div>
                    )}

                    <p className="text-[10px] text-txt-muted">
                      {payment.showBankQr === false
                        ? 'QR code hidden on invoice paper.'
                        : payment.customBankQr
                        ? 'Using uploaded custom Bank QR code image.'
                        : 'Auto-generating dynamic QR code matching account & IFSC details.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab Content: UPI */}
              {payment.activeTab === 'upi' && (
                <div className="space-y-3 pt-1">

                  {/* UPI Account / Destination Dropdown */}
                  <div className="relative" ref={upiDropdownRef}>
                    <label className="text-[11px] font-semibold text-[#57B71B] block mb-1">
                      UPI Account / Payment Destination:
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUpiDropdownOpen((prev) => !prev);
                        setIsAddingNewUpi(false);
                        setEditingUpiId(null);
                        setUpiSearchFilter('');
                        setTimeout(() => upiSearchInputRef.current?.focus(), 60);
                      }}
                      className="w-full h-9 rounded-btn border border-border bg-white px-2.5 text-xs text-txt-primary flex items-center justify-between hover:border-[#57B71B] transition-colors cursor-pointer text-left shadow-2xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Wallet className="h-4 w-4 text-[#57B71B] shrink-0" />
                        <span className="text-txt-primary font-bold truncate">
                          {currentUpiAccount?.name || payment.upi.payeeName || 'Select or Add UPI Account'}
                        </span>
                        {payment.upi.upiId && (
                          <span className="text-[10px] text-txt-muted font-mono shrink-0">
                            ({payment.upi.upiId})
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-txt-muted shrink-0 transition-transform duration-200 ${
                          isUpiDropdownOpen ? 'rotate-180 text-[#57B71B]' : ''
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isUpiDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-card shadow-xl py-1 text-xs max-h-80 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100">
                        {/* Search Header */}
                        <div className="p-1.5 border-b border-border/60 bg-slate-50/50">
                          <div className="relative flex items-center">
                            <Search className="absolute left-2.5 h-3.5 w-3.5 text-txt-muted pointer-events-none" />
                            <input
                              ref={upiSearchInputRef}
                              type="text"
                              value={upiSearchFilter}
                              onChange={(e) => setUpiSearchFilter(e.target.value)}
                              placeholder="Search UPI accounts or type to filter..."
                              className="w-full h-7 rounded-input border border-border bg-white pl-8 pr-2 text-xs text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-1 focus:ring-[#57B71B]"
                            />
                          </div>
                        </div>

                        {/* UPI Accounts List */}
                        <div className="overflow-y-auto flex-1 py-1 max-h-48 divide-y divide-slate-100/60">
                          <div className="px-2.5 py-1 text-[10px] font-semibold text-txt-muted uppercase tracking-wider flex items-center justify-between">
                            <span>Saved UPI Accounts ({savedUpiAccounts.length})</span>
                            <span className="text-[9px] font-normal lowercase">click to select</span>
                          </div>

                          {savedUpiAccounts
                            .filter((u) => {
                              if (!u.name || u.name.trim() === '') return false;
                              const q = upiSearchFilter.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                u.name.toLowerCase().includes(q) ||
                                (u.upiId || '').toLowerCase().includes(q) ||
                                (u.payeeName || '').toLowerCase().includes(q)
                              );
                            })
                            .map((u) => {
                              const isSelected = payment.upiPreset === u.id;
                              const isEditingThis = editingUpiId === u.id;

                              if (isEditingThis) {
                                return (
                                  <div key={u.id} className="p-1.5 bg-emerald-50/50 flex items-center gap-1.5">
                                    <input
                                      ref={editUpiInputRef}
                                      type="text"
                                      value={editingUpiName}
                                      onChange={(e) => setEditingUpiName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveUpiRename(u.id);
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingUpiId(null);
                                        }
                                      }}
                                      className="flex-1 h-7 rounded border border-[#57B71B] bg-white px-2 text-xs font-bold text-txt-primary focus:outline-none"
                                      placeholder="Enter account name..."
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveUpiRename(u.id)}
                                      className="h-7 px-2 rounded bg-[#57B71B] hover:bg-[#469815] text-white text-[11px] font-bold cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingUpiId(null)}
                                      className="h-7 px-2 text-[11px] text-txt-muted hover:text-txt-primary cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={u.id}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 hover:bg-slate-50 transition-colors group ${
                                    isSelected ? 'bg-emerald-50/60 font-bold' : ''
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPayment((p) => ({
                                        ...p,
                                        upiPreset: u.id,
                                        upi: u,
                                      }));
                                      setIsUpiDropdownOpen(false);
                                      setUpiSearchFilter('');
                                      setIsAddingNewUpi(false);
                                    }}
                                    className="flex-1 flex items-center gap-2 text-left truncate cursor-pointer mr-2"
                                  >
                                    <Wallet className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-[#57B71B]' : 'text-slate-400'}`} />
                                    <span className={`truncate text-xs ${isSelected ? 'text-[#57B71B]' : 'text-txt-primary'}`}>
                                      {u.name.trim()}
                                    </span>
                                    {u.upiId && (
                                      <span className="text-[10px] text-txt-muted font-mono shrink-0">
                                        ({u.upiId})
                                      </span>
                                    )}
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                      Custom
                                    </span>
                                  </button>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {isSelected && <Check className="h-4 w-4 text-[#57B71B] shrink-0 mr-1" />}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingUpiId(u.id);
                                        setEditingUpiName(u.name);
                                        setTimeout(() => editUpiInputRef.current?.focus(), 50);
                                      }}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                      title="Edit / Rename account name"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    {savedUpiAccounts.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSavedUpi(u.id);
                                        }}
                                        className="p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                                        title="Remove this UPI account"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        {/* Other / Add New UPI Account Section */}
                        <div className="border-t border-border/70 p-1.5 bg-slate-50/80">
                          {isAddingNewUpi ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <input
                                  ref={newUpiInputRef}
                                  type="text"
                                  value={newUpiInput}
                                  onChange={(e) => setNewUpiInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddNewUpiConfirm();
                                    }
                                    if (e.key === 'Escape') {
                                      setIsAddingNewUpi(false);
                                    }
                                  }}
                                  placeholder="Enter new UPI account name..."
                                  className="flex-1 h-7 rounded-input border border-border bg-white px-2 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-[#57B71B]"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={handleAddNewUpiConfirm}
                                  disabled={!newUpiInput.trim()}
                                  className="h-7 px-2.5 rounded-btn bg-[#57B71B] hover:bg-[#469815] text-white text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingNewUpi(false);
                                    setNewUpiInput('');
                                  }}
                                  className="h-7 px-2 text-xs text-txt-muted hover:text-txt-primary cursor-pointer shrink-0"
                                >
                                  Cancel
                                </button>
                              </div>
                              <span className="text-[10px] text-txt-muted block px-0.5">
                                Press Enter to save and select immediately for invoice.
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingNewUpi(true);
                                if (upiSearchFilter.trim()) {
                                  setNewUpiInput(upiSearchFilter.trim());
                                }
                                setTimeout(() => {
                                  newUpiInputRef.current?.focus();
                                }, 50);
                              }}
                              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-1.5 font-bold text-[#2563EB]">
                                <Plus className="h-3.5 w-3.5" />
                                <span>+ Other / Add New UPI Account</span>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 text-txt-muted font-medium">
                                Custom
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">
                        Rename / UPI Account Name <span className="text-[#57B71B] font-bold">(Updates in Dropdown)</span>
                      </label>
                      <input
                        type="text"
                        value={currentUpiAccount?.name || ''}
                        onChange={(e) => handleUpdateCurrentUpi({ name: e.target.value })}
                        placeholder="Type Account Name to rename..."
                        className="w-full h-8 rounded-input border border-[#57B71B]/50 focus:border-[#57B71B] bg-white px-2 text-xs font-bold text-txt-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">Payee Name</label>
                      <input
                        type="text"
                        value={payment.upi.payeeName}
                        onChange={(e) => handleUpdateCurrentUpi({ payeeName: e.target.value })}
                        placeholder="e.g. Digitechzo Technologies"
                        className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">UPI ID / VPA</label>
                      <input
                        type="text"
                        value={payment.upi.upiId}
                        onChange={(e) => handleUpdateCurrentUpi({ upiId: e.target.value })}
                        placeholder="e.g. digitechzo@okicici"
                        className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs font-mono font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">Payment Note / Remark</label>
                      <input
                        type="text"
                        value={payment.upi.note || ''}
                        onChange={(e) => handleUpdateCurrentUpi({ note: e.target.value })}
                        placeholder="e.g. Invoice Settlement"
                        className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[10px] text-txt-muted">
                      💡 All edits to this UPI account are auto-saved to your preset list.
                    </span>
                    {savedUpiAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedUpi(payment.upiPreset)}
                        className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-semibold"
                        title="Delete this UPI account from list"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete this UPI Account
                      </button>
                    )}
                  </div>

                  {/* QR Image Option: Upload or Auto-generated */}
                  <div className="border border-slate-200 rounded-btn p-2.5 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-txt-primary block">UPI QR Code Source:</span>
                      {payment.showUpiQr === false ? (
                        <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          QR Code Removed
                        </span>
                      ) : payment.customUpiQr ? (
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Custom Image
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Dynamic Auto-Generated</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs text-txt-secondary cursor-pointer">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-white hover:bg-slate-50 text-[11px] font-semibold text-txt-primary shadow-2xs">
                          <Upload className="h-3 w-3" /> Upload Custom QR Image
                        </span>
                        <input type="file" accept="image/*" onChange={handleUpiQrUpload} className="hidden" />
                      </label>

                      {/* Remove/Delete Icon Button */}
                      {payment.showUpiQr !== false ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPayment((p) => ({ ...p, showUpiQr: false, customUpiQr: '' }));
                            showToast('UPI QR code removed from invoice');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-200 bg-white hover:bg-rose-50 text-[11px] font-semibold text-rose-600 shadow-2xs transition-colors cursor-pointer"
                          title="Remove QR code from invoice"
                        >
                          <Trash2 className="h-3 w-3 text-rose-500" /> Remove QR
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPayment((p) => ({ ...p, showUpiQr: true }));
                            showToast('UPI QR code enabled on invoice');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#57B71B]/30 bg-[#57B71B]/10 hover:bg-[#57B71B]/20 text-[11px] font-semibold text-[#57B71B] shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Restore Dynamic QR
                        </button>
                      )}

                      {payment.customUpiQr && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayment((p) => ({ ...p, customUpiQr: '' }));
                            showToast('Reverted to dynamic UPI QR');
                          }}
                          className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                        >
                          Use Auto-Generated
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-txt-muted">
                      {payment.showUpiQr === false
                        ? 'QR code removed. Only UPI ID and Payee text will appear on the invoice.'
                        : payment.customUpiQr
                        ? 'Using uploaded QR code image.'
                        : 'Auto-generating dynamic UPI QR code compatible with PhonePe, GPay, Paytm & BHIM!'}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab Content: Crypto */}
              {payment.activeTab === 'crypto' && (
                <div className="space-y-3 pt-1">

                  {/* Custom Searchable & Addable Crypto Wallet Dropdown */}
                  <div className="relative" ref={cryptoDropdownRef}>
                    <label className="text-[11px] font-semibold text-[#57B71B] block mb-1">
                      Select or Add Crypto Wallet:
                    </label>

                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCryptoDropdownOpen((prev) => !prev);
                        setIsAddingNewCrypto(false);
                        setEditingCryptoId(null);
                        setCryptoSearchFilter('');
                        setTimeout(() => cryptoSearchInputRef.current?.focus(), 60);
                      }}
                      className="w-full h-9 rounded-btn border border-border bg-white px-2.5 text-xs text-txt-primary flex items-center justify-between hover:border-[#57B71B] transition-colors cursor-pointer text-left shadow-2xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Wallet className="h-4 w-4 text-[#57B71B] shrink-0" />
                        <span className="text-txt-primary font-bold truncate">
                          {currentCryptoWallet?.name || payment.crypto.coin || 'Select or Add Crypto Wallet'}
                        </span>
                        {payment.crypto.coin && (
                          <span className="text-[10px] text-txt-muted font-mono shrink-0">
                            ({payment.crypto.coin})
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-txt-muted shrink-0 transition-transform duration-200 ${
                          isCryptoDropdownOpen ? 'rotate-180 text-[#57B71B]' : ''
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isCryptoDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-card shadow-xl py-1 text-xs max-h-80 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100">
                        {/* Search Header */}
                        <div className="p-1.5 border-b border-border/60 bg-slate-50/50">
                          <div className="relative flex items-center">
                            <Search className="absolute left-2.5 h-3.5 w-3.5 text-txt-muted pointer-events-none" />
                            <input
                              ref={cryptoSearchInputRef}
                              type="text"
                              value={cryptoSearchFilter}
                              onChange={(e) => setCryptoSearchFilter(e.target.value)}
                              placeholder="Search crypto wallets or type to filter..."
                              className="w-full h-7 rounded-input border border-border bg-white pl-8 pr-2 text-xs text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-1 focus:ring-[#57B71B]"
                            />
                          </div>
                        </div>

                        {/* Crypto Wallets List */}
                        <div className="overflow-y-auto flex-1 py-1 max-h-48 divide-y divide-slate-100/60">
                          <div className="px-2.5 py-1 text-[10px] font-semibold text-txt-muted uppercase tracking-wider flex items-center justify-between">
                            <span>Saved Crypto Wallets ({savedCryptoWallets.length})</span>
                            <span className="text-[9px] font-normal lowercase">click to select</span>
                          </div>

                          {savedCryptoWallets
                            .filter((c) => {
                              if (!c.name || c.name.trim() === '') return false;
                              const q = cryptoSearchFilter.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                c.name.toLowerCase().includes(q) ||
                                (c.coin || '').toLowerCase().includes(q) ||
                                (c.network || '').toLowerCase().includes(q) ||
                                (c.address || '').toLowerCase().includes(q)
                              );
                            })
                            .map((c) => {
                              const isSelected = payment.cryptoPreset === c.id;
                              const isEditingThis = editingCryptoId === c.id;

                              if (isEditingThis) {
                                return (
                                  <div key={c.id} className="p-1.5 bg-emerald-50/50 flex items-center gap-1.5">
                                    <input
                                      ref={editCryptoInputRef}
                                      type="text"
                                      value={editingCryptoName}
                                      onChange={(e) => setEditingCryptoName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveCryptoRename(c.id);
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingCryptoId(null);
                                        }
                                      }}
                                      className="flex-1 h-7 rounded border border-[#57B71B] bg-white px-2 text-xs font-bold text-txt-primary focus:outline-none"
                                      placeholder="Enter wallet name..."
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveCryptoRename(c.id)}
                                      className="h-7 px-2 rounded bg-[#57B71B] hover:bg-[#469815] text-white text-[11px] font-bold cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCryptoId(null)}
                                      className="h-7 px-2 text-[11px] text-txt-muted hover:text-txt-primary cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={c.id}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 hover:bg-slate-50 transition-colors group ${
                                    isSelected ? 'bg-emerald-50/60 font-bold' : ''
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPayment((p) => ({
                                        ...p,
                                        cryptoPreset: c.id,
                                        crypto: c,
                                      }));
                                      setIsCryptoDropdownOpen(false);
                                      setCryptoSearchFilter('');
                                      setIsAddingNewCrypto(false);
                                    }}
                                    className="flex-1 flex items-center gap-2 text-left truncate cursor-pointer mr-2"
                                  >
                                    <Wallet className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-[#57B71B]' : 'text-slate-400'}`} />
                                    <span className={`truncate text-xs ${isSelected ? 'text-[#57B71B]' : 'text-txt-primary'}`}>
                                      {c.name.trim()}
                                    </span>
                                    {c.coin && (
                                      <span className="text-[10px] text-txt-muted font-mono shrink-0">
                                        ({c.coin})
                                      </span>
                                    )}
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                      Custom
                                    </span>
                                  </button>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {isSelected && <Check className="h-4 w-4 text-[#57B71B] shrink-0 mr-1" />}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCryptoId(c.id);
                                        setEditingCryptoName(c.name);
                                        setTimeout(() => editCryptoInputRef.current?.focus(), 50);
                                      }}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                      title="Edit / Rename wallet name"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    {savedCryptoWallets.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSavedCrypto(c.id);
                                        }}
                                        className="p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                                        title="Remove this crypto wallet"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        {/* Other / Add New Crypto Wallet Section */}
                        <div className="border-t border-border/70 p-1.5 bg-slate-50/80">
                          {isAddingNewCrypto ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <input
                                  ref={newCryptoInputRef}
                                  type="text"
                                  value={newCryptoInput}
                                  onChange={(e) => setNewCryptoInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddNewCryptoConfirm();
                                    }
                                    if (e.key === 'Escape') {
                                      setIsAddingNewCrypto(false);
                                    }
                                  }}
                                  placeholder="Enter new wallet name (e.g. Polygon USDT)..."
                                  className="flex-1 h-7 rounded-input border border-border bg-white px-2 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-[#57B71B]"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={handleAddNewCryptoConfirm}
                                  disabled={!newCryptoInput.trim()}
                                  className="h-7 px-2.5 rounded-btn bg-[#57B71B] hover:bg-[#469815] text-white text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingNewCrypto(false);
                                    setNewCryptoInput('');
                                  }}
                                  className="h-7 px-2 text-xs text-txt-muted hover:text-txt-primary cursor-pointer shrink-0"
                                >
                                  Cancel
                                </button>
                              </div>
                              <span className="text-[10px] text-txt-muted block px-0.5">
                                Press Enter to save and select immediately for invoice.
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingNewCrypto(true);
                                if (cryptoSearchFilter.trim()) {
                                  setNewCryptoInput(cryptoSearchFilter.trim());
                                }
                                setTimeout(() => {
                                  newCryptoInputRef.current?.focus();
                                }, 50);
                              }}
                              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-1.5 font-bold text-[#2563EB]">
                                <Plus className="h-3.5 w-3.5" />
                                <span>+ Other / Add New Crypto Wallet</span>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 text-txt-muted font-medium">
                                Custom
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">
                        Rename / Wallet Name <span className="text-[#57B71B] font-bold">(Updates in Dropdown)</span>
                      </label>
                      <input
                        type="text"
                        value={currentCryptoWallet?.name || ''}
                        onChange={(e) => handleUpdateCurrentCrypto({ name: e.target.value })}
                        placeholder="Type Wallet Name to rename..."
                        className="w-full h-8 rounded-input border border-[#57B71B]/50 focus:border-[#57B71B] bg-white px-2 text-xs font-bold text-txt-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">Token / Coin</label>
                      <input
                        type="text"
                        value={payment.crypto.coin}
                        onChange={(e) =>
                          handleUpdateCurrentCrypto({ coin: e.target.value })
                        }
                        placeholder="e.g. USDT (TRC20)"
                        className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-txt-muted block mb-0.5">Blockchain Network</label>
                      <input
                        type="text"
                        value={payment.crypto.network}
                        onChange={(e) =>
                          handleUpdateCurrentCrypto({ network: e.target.value })
                        }
                        placeholder="e.g. TRON (TRC20)"
                        className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-txt-muted block mb-0.5">Wallet Address</label>
                    <input
                      type="text"
                      value={payment.crypto.address}
                      onChange={(e) =>
                        handleUpdateCurrentCrypto({ address: e.target.value })
                      }
                      placeholder="e.g. Txyz..."
                      className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs font-mono text-[11px]"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[10px] text-txt-muted">
                      💡 All edits to this crypto wallet are auto-saved to your preset list.
                    </span>
                    {savedCryptoWallets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedCrypto(payment.cryptoPreset)}
                        className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-semibold"
                        title="Delete this crypto wallet from list"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete this Crypto Wallet
                      </button>
                    )}
                  </div>

                  {/* Crypto QR Code Source */}
                  <div className="border border-slate-200 rounded-btn p-2.5 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-txt-primary block">Crypto QR Code Source:</span>
                      {payment.showCryptoQr === false ? (
                        <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          QR Code Removed
                        </span>
                      ) : payment.customCryptoQr ? (
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Custom Image
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Dynamic Auto-Generated</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs text-txt-secondary cursor-pointer">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-white hover:bg-slate-50 text-[11px] font-semibold text-txt-primary shadow-2xs">
                          <Upload className="h-3 w-3" /> Upload Custom QR Image
                        </span>
                        <input type="file" accept="image/*" onChange={handleCryptoQrUpload} className="hidden" />
                      </label>

                      {/* Remove/Delete Icon Button */}
                      {payment.showCryptoQr !== false ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPayment((p) => ({ ...p, showCryptoQr: false, customCryptoQr: '' }));
                            showToast('Crypto QR code removed from invoice');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-200 bg-white hover:bg-rose-50 text-[11px] font-semibold text-rose-600 shadow-2xs transition-colors cursor-pointer"
                          title="Remove QR code from invoice"
                        >
                          <Trash2 className="h-3 w-3 text-rose-500" /> Remove QR
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPayment((p) => ({ ...p, showCryptoQr: true }));
                            showToast('Crypto QR code enabled on invoice');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#57B71B]/30 bg-[#57B71B]/10 hover:bg-[#57B71B]/20 text-[11px] font-semibold text-[#57B71B] shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Restore Dynamic QR
                        </button>
                      )}

                      {payment.customCryptoQr && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayment((p) => ({ ...p, customCryptoQr: '' }));
                            showToast('Reverted to dynamic Crypto QR');
                          }}
                          className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                        >
                          Use Auto-Generated
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-txt-muted">
                      {payment.showCryptoQr === false
                        ? 'QR code removed. Only Wallet Address text will appear on the invoice.'
                        : payment.customCryptoQr
                        ? 'Using uploaded wallet QR code image.'
                        : 'Auto-generating dynamic Crypto wallet QR code directly from recipient address!'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </details>

          {/* Card 6: Financial Adjustments (Tax & Discounts) */}
          <details open className="group rounded-card border border-border bg-white shadow-xs overflow-hidden">
            <summary className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-border font-bold text-xs text-txt-primary cursor-pointer hover:bg-slate-100 transition-colors list-none">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-indigo-600" />
                <span>Tax, Discount & Financial Adjustments</span>
              </div>
              <span className="text-[10px] text-txt-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-3.5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">
                    GST / Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={taxRate === 0 ? '' : taxRate}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setTaxRate(isNaN(val) ? 0 : val);
                    }}
                    placeholder="0"
                    className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs font-tabular"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Discount Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={discountRate === 0 ? '' : discountRate}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setDiscountRate(isNaN(val) ? 0 : val);
                    }}
                    placeholder="0"
                    className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs font-tabular"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">Advance Req. (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={advancePercent === 0 ? '' : advancePercent}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setAdvancePercent(isNaN(val) ? 0 : val);
                    }}
                    placeholder="0"
                    className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs font-tabular"
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Card 7: Separated Notes & Terms Control */}
          <details open className="group rounded-card border border-border bg-white shadow-xs overflow-hidden">
            <summary className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-border font-bold text-xs text-txt-primary cursor-pointer hover:bg-slate-100 transition-colors list-none">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                <span>Notes & Terms of Service (Separated)</span>
              </div>
              <span className="text-[10px] text-txt-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-3.5 space-y-4 text-xs">
              {/* SECTION 1: NOTE: CONTROL */}
              <div className="p-3 rounded-lg border border-slate-200/90 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">1. Note Section (Note:)</span>
                  </div>
                  <label className="text-[11px] font-bold text-txt-primary flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showNotesBlock}
                      onChange={(e) => setShowNotesBlock(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                    <span>{showNotesBlock ? 'Include Note' : 'Hidden'}</span>
                  </label>
                </div>

                {showNotesBlock ? (
                  <div className="space-y-2.5">
                    {/* Note Heading & Presets */}
                    <div className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Note Heading
                        </label>
                        <div className="flex flex-wrap items-center gap-1">
                          {['NOTE:', 'SPECIAL NOTE:', 'PAYMENT NOTE:', 'CLIENT NOTE:'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setNotesHeading(preset)}
                              className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                notesHeading === preset
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={notesHeading}
                        onChange={(e) => setNotesHeading(e.target.value)}
                        placeholder="e.g. NOTE:"
                        className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs font-bold text-txt-primary"
                      />
                    </div>

                    {/* Note Presets */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Quick Note Presets:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setNotes('Thank you for partnering with Digitechzo! We appreciate your business and continued trust.');
                            showToast('Loaded thank you note');
                          }}
                          className="text-left p-1.5 rounded border border-slate-200 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 text-[10px] text-slate-700 transition-colors cursor-pointer"
                        >
                          <span className="font-bold text-indigo-700 block">Thank You Note</span>
                          <span className="text-slate-500 text-[9px] line-clamp-1">Appreciation & trust</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotes('Please reference this invoice number with all payments to ensure accurate and prompt account crediting.');
                            showToast('Loaded payment reference note');
                          }}
                          className="text-left p-1.5 rounded border border-slate-200 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 text-[10px] text-slate-700 transition-colors cursor-pointer"
                        >
                          <span className="font-bold text-indigo-700 block">Payment Reference</span>
                          <span className="text-slate-500 text-[9px] line-clamp-1">Quote invoice #</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotes('For any billing queries or technical support, please contact our accounts team at billing@digitechzo.com.');
                            showToast('Loaded support contact note');
                          }}
                          className="text-left p-1.5 rounded border border-slate-200 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 text-[10px] text-slate-700 transition-colors cursor-pointer"
                        >
                          <span className="font-bold text-indigo-700 block">Support Helpdesk</span>
                          <span className="text-slate-500 text-[9px] line-clamp-1">Billing team contact</span>
                        </button>
                      </div>
                    </div>

                    {/* Note Content Textarea */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Note Text Content
                        </label>
                        <span className="text-[10px] text-txt-muted">Editable note text</span>
                      </div>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter note text for client..."
                        className="w-full rounded-input border border-border bg-white p-2.5 text-xs text-txt-primary leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Note section is hidden on invoice report.</p>
                )}
              </div>

              {/* SECTION 2: TERMS: CONTROL */}
              <div className="p-3 rounded-lg border border-slate-200/90 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">2. Terms of Service Section (Terms:)</span>
                  </div>
                  <label className="text-[11px] font-bold text-txt-primary flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTermsBlock}
                      onChange={(e) => setShowTermsBlock(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                    <span>{showTermsBlock ? 'Include Terms' : 'Hidden'}</span>
                  </label>
                </div>

                {showTermsBlock ? (
                  <div className="space-y-2.5">
                    {/* Terms Heading & Presets */}
                    <div className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Terms Heading
                        </label>
                        <div className="flex flex-wrap items-center gap-1">
                          {['TERMS:', 'TERMS & CONDITIONS:', 'PAYMENT TERMS:', 'SERVICE AGREEMENT:'].map(
                            (preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setTermsHeading(preset)}
                                className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                  termsHeading === preset
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {preset}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={termsHeading}
                        onChange={(e) => setTermsHeading(e.target.value)}
                        placeholder="e.g. TERMS:"
                        className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs font-bold text-txt-primary"
                      />
                    </div>

                    {/* Terms Quick Clause Presets */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Quick Clause Presets:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setTermsHeading('TERMS:');
                            setTerms(
                              'Payment is strictly due within 15 business days. Invoices overdue beyond 30 days are subject to a 1.5% monthly late finance assessment.'
                            );
                            showToast('Loaded 15-day payment clause');
                          }}
                          className="text-left p-1.5 rounded border border-slate-200 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 text-[10px] text-slate-700 transition-colors cursor-pointer"
                        >
                          <span className="font-bold text-indigo-700 block">15-Day Net Terms</span>
                          <span className="text-slate-500 text-[9px] line-clamp-1">Standard 15-day settlement</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTermsHeading('TERMS & CONDITIONS:');
                            setTerms(
                              '1. 50% advance deposit is required prior to project kick-off.\n2. Balance 50% due within 7 days of milestone delivery and QA approval.\n3. Taxes and statutory charges are billed as applicable.'
                            );
                            showToast('Loaded 50% milestone clause');
                          }}
                          className="text-left p-1.5 rounded border border-slate-200 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 text-[10px] text-slate-700 transition-colors cursor-pointer"
                        >
                          <span className="font-bold text-indigo-700 block">50% Milestone & Delivery</span>
                          <span className="text-slate-500 text-[9px] line-clamp-1">50% Advance + 50% on QA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTermsHeading('SERVICE TERMS & WARRANTY:');
                            setTerms(
                              '1. 30 days post-deployment hypercare support is included.\n2. Source code and IP rights transfer fully upon 100% invoice settlement.\n3. Scope changes require a written change order.'
                            );
                            showToast('Loaded SLA & Warranty clause');
                          }}
                          className="text-left p-1.5 rounded border border-slate-200 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 text-[10px] text-slate-700 transition-colors cursor-pointer"
                        >
                          <span className="font-bold text-indigo-700 block">SLA & Hypercare Warranty</span>
                          <span className="text-slate-500 text-[9px] line-clamp-1">30 days warranty + IP transfer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTermsHeading('PAYMENT TERMS:');
                            setTerms(
                              'Payment is strictly due within 15 business days. Invoices overdue beyond 30 days are subject to a 1.5% monthly late finance assessment and temporary suspension of services until settled.'
                            );
                            showToast('Loaded Late Payment clause');
                          }}
                          className="text-left p-1.5 rounded border border-slate-200 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 text-[10px] text-slate-700 transition-colors cursor-pointer"
                        >
                          <span className="font-bold text-indigo-700 block">Late Finance Assessment</span>
                          <span className="text-slate-500 text-[9px] line-clamp-1">1.5% interest on overdue</span>
                        </button>
                      </div>
                    </div>

                    {/* Terms Content Textarea */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Terms & Conditions Content
                        </label>
                        <span className="text-[10px] text-txt-muted">Multiline formatted text</span>
                      </div>
                      <textarea
                        rows={3}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        placeholder="Enter terms and conditions, payment terms, clauses..."
                        className="w-full rounded-input border border-border bg-white p-2.5 text-xs text-txt-primary leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Terms section is hidden on invoice report.</p>
                )}
              </div>
            </div>
          </details>

          {/* Card 8: Team & Authorized Signatory Control */}
          <details open className="group rounded-card border border-border bg-white shadow-xs overflow-hidden">
            <summary className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-border font-bold text-xs text-txt-primary cursor-pointer hover:bg-slate-100 transition-colors list-none">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>Team & Authorized Signatory</span>
              </div>
              <span className="text-[10px] text-txt-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-3.5 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <label className="text-[11px] font-bold text-txt-primary flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSignatureBlock}
                    onChange={(e) => setShowSignatureBlock(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-600"
                  />
                  <span>Include Team & Signatory Section on Invoice</span>
                </label>
                {showSignatureBlock ? (
                  <button
                    type="button"
                    onClick={() => setShowSignatureBlock(false)}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Hide Section
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium italic">Hidden in report</span>
                )}
              </div>

              {!showSignatureBlock ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center space-y-1.5">
                  <p className="text-xs text-slate-500">
                    Team & Signatory block is currently <strong className="text-slate-700">hidden</strong> on the invoice report and printout.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSignatureBlock(true)}
                    className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    Click to show Team & Signatory
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Quick Select from CRM Team Members */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-txt-secondary flex items-center justify-between">
                      <span>Quick Select from CRM Team:</span>
                      <span className="text-[10px] text-indigo-600 font-medium">Auto-fills signatory</span>
                    </label>
                    <CustomSelect
                      value=""
                      onChange={(val) => {
                        if (!val) return;
                        if (val === '__me' && user) {
                          setSignature((s) => ({
                            ...s,
                            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Digitechzo Director',
                            role: user.role || 'Managing Director',
                          }));
                          showToast(`Signatory set to current user: ${user.name}`);
                          return;
                        }
                        if (val === '__default_director') {
                          setSignature((s) => ({
                            ...s,
                            name: 'Digitechzo Director',
                            role: 'Managing Director',
                          }));
                          showToast('Signatory set to Managing Director');
                          return;
                        }
                        if (val === '__finance') {
                          setSignature((s) => ({
                            ...s,
                            name: 'Finance & Billing Team',
                            role: 'Head of Accounts',
                          }));
                          showToast('Signatory set to Head of Accounts');
                          return;
                        }
                        const found = teamUsers.find((u: any) => String(u.id) === val);
                        if (found) {
                          const fullName = found.name || `${found.firstName || ''} ${found.lastName || ''}`.trim() || found.email;
                          const roleName = found.role?.displayAlias || found.role?.name || found.roleName || 'Team Signatory';
                          setSignature((s) => ({
                            ...s,
                            name: fullName,
                            role: roleName,
                          }));
                          showToast(`Signatory set to: ${fullName}`);
                        }
                      }}
                      placeholder="-- Select CRM Team Member or Role --"
                      options={[
                        ...(user ? [{ value: '__me', label: `👤 Current User (${user.name} - ${user.role})` }] : []),
                        { value: '__default_director', label: '👔 Managing Director (Digitechzo Director)' },
                        { value: '__finance', label: '💼 Finance & Accounts Lead' },
                        ...teamUsers.map((member: any) => {
                          const mName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email;
                          const mRole = member.role?.displayAlias || member.role?.name || 'Team Member';
                          return {
                            value: member.id,
                            label: `👥 ${mName} (${mRole})`,
                          };
                        }),
                      ]}
                    />
                  </div>

                  {/* Manual Inputs for Signatory Name and Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">
                        Authorized Signatory Name
                      </label>
                      <input
                        type="text"
                        value={signature.name}
                        onChange={(e) => setSignature({ ...signature, name: e.target.value })}
                        placeholder="e.g. Digitechzo Director"
                        className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs font-semibold text-txt-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-txt-secondary block mb-0.5">
                        Designation / Role
                      </label>
                      <input
                        type="text"
                        value={signature.role}
                        onChange={(e) => setSignature({ ...signature, role: e.target.value })}
                        placeholder="e.g. Managing Director"
                        className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary"
                      />
                    </div>
                  </div>

                  {/* Signature Image Upload / Preview in Editor */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-txt-secondary block">
                        Signatory Signature Image (Optional)
                      </label>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Auto-removes background
                      </span>
                    </div>

                    {signature.signatureImage ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            {/* Checkerboard container to visually verify transparent background */}
                            <div
                              className="h-12 px-3 py-1 border border-slate-200 rounded-md flex items-center justify-center bg-white shadow-xs overflow-hidden"
                              style={{
                                backgroundImage: `linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)`,
                                backgroundSize: '10px 10px',
                                backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                              }}
                            >
                              <img
                                src={signature.signatureImage}
                                alt="Signature"
                                className="h-9 max-w-[140px] object-contain"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Background Removed (Transparent Text)</span>
                              </div>
                              <p className="text-[10px] text-txt-muted">
                                Clean ink extracted with no paper background box
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                              Replace
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isProcessingSignature}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleSignatureUpload(file);
                                }}
                                className="hidden"
                              />
                            </label>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSignature({
                                  ...signature,
                                  signatureImage: '',
                                  rawSignatureImage: '',
                                })
                              }
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                            >
                              Remove Signature
                            </button>
                          </div>
                        </div>

                        {/* Ink color styling selector */}
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                          <span className="text-[11px] font-medium text-txt-secondary flex items-center gap-1">
                            <Wand2 className="h-3 w-3 text-emerald-600" /> Ink Text Style:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isProcessingSignature}
                              onClick={() => handleApplySignatureBackgroundRemoval('auto')}
                              className={`px-2 py-0.5 text-[11px] rounded font-semibold border transition-colors cursor-pointer ${
                                signature.inkColorMode === 'auto'
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Auto Ink
                            </button>
                            <button
                              type="button"
                              disabled={isProcessingSignature}
                              onClick={() => handleApplySignatureBackgroundRemoval('blue')}
                              className={`px-2 py-0.5 text-[11px] rounded font-semibold border transition-colors cursor-pointer ${
                                signature.inkColorMode === 'blue'
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                              }`}
                            >
                              Royal Blue Pen
                            </button>
                            <button
                              type="button"
                              disabled={isProcessingSignature}
                              onClick={() => handleApplySignatureBackgroundRemoval('black')}
                              className={`px-2 py-0.5 text-[11px] rounded font-semibold border transition-colors cursor-pointer ${
                                signature.inkColorMode === 'black'
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Rich Black
                            </button>
                            <button
                              type="button"
                              disabled={isProcessingSignature}
                              onClick={() => handleApplySignatureBackgroundRemoval('original')}
                              className={`px-2 py-0.5 text-[11px] rounded font-semibold border transition-colors cursor-pointer ${
                                signature.inkColorMode === 'original'
                                  ? 'bg-slate-700 text-white border-slate-700'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Original Color
                            </button>
                          </div>
                        </div>

                        {/* Magic Re-clean button */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <button
                            type="button"
                            disabled={isProcessingSignature}
                            onClick={() => handleApplySignatureBackgroundRemoval()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-[#16A34A] border border-emerald-200 font-semibold cursor-pointer transition-colors"
                          >
                            {isProcessingSignature ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 text-emerald-600" />
                                Re-clean Background (Keep Text Only)
                              </>
                            )}
                          </button>
                          <span className="text-[10px] text-txt-muted">
                            Transparent PNG • 0% background
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 px-3.5 py-2 rounded-btn border border-dashed border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-emerald-50/40 text-xs font-semibold text-slate-700 transition-colors cursor-pointer w-fit">
                          {isProcessingSignature ? (
                            <>
                              <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                              <span>Auto-removing background & extracting text...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 text-emerald-600" />
                              <span>+ Upload Signature Image (Auto-Removes Background)</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isProcessingSignature}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSignatureUpload(file);
                            }}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-txt-muted">
                          Upload any photo or scan of your signature on paper. The background is automatically removed so only clean signature text appears on the invoice.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Live Client Invoice Paper Preview           */}
        {/* ========================================================= */}
        <div
          ref={invoiceContainerRef}
          className={`space-y-3 pb-8 print:!p-0 print:!m-0 print:!space-y-0 invoice-preview-column print:!block ${
            studioViewMode === 'editor'
              ? 'hidden'
              : studioViewMode === 'split'
              ? 'lg:col-span-7'
              : 'w-full max-w-4xl mx-auto'
          }`}
        >
          {/* Invoice Document Action Bar (no-print) */}
          <div className="no-print flex flex-wrap items-center justify-between gap-2.5 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#57B71B] animate-pulse" />
              <span className="text-xs font-bold text-slate-800 tracking-tight">
                Tax Invoice Preview <span className="text-slate-400 font-normal">• A4 Print & Export Ready</span>
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {meta.number || 'DIGI-2026-001'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setStudioViewMode('editor');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="lg:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
            >
              ← Editor
            </button>
          </div>

          {/* THE REAL INVOICE PAPER (Target for Print & PDF) */}
          <div className="overflow-x-auto pb-4 print:!p-0 print:!m-0 print:!overflow-visible">
            <div
              id="invoiceDocument"
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-5 sm:p-8 w-full max-w-full min-w-0 print:!min-w-0 print:!min-h-0 print:!h-auto print:!p-0 print:!m-0 print:!border-none print:!shadow-none flex flex-col justify-between relative font-sans text-slate-800"
            >
              {/* Draft Watermark Badge */}
              {meta.status === 'DRAFT' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-10">
                  <span className="text-8xl font-black text-rose-500/10 -rotate-30 tracking-widest uppercase">
                    DRAFT
                  </span>
                </div>
              )}

              {/* 1. Header: Brand Info & Invoice Title */}
              <div className="invoice-header grid grid-cols-12 gap-4 items-start pb-2 relative">
                {/* Left (7 Cols): Brand & Sender Profile */}
                <div className="col-span-12 sm:col-span-7 invoice-header-left flex items-start gap-3.5 min-w-0 pr-2">
                  {sender.logo ? (
                    <img
                      src={sender.logo}
                      alt={sender.name}
                      style={{ height: `${sender.logoHeight || 48}px` }}
                      className="max-w-[130px] object-contain transition-all rounded-md shrink-0 mt-1.5"
                    />
                  ) : (
                    <img
                      src="/assets/images/logo.png"
                      alt={sender.name || 'Digitechzo'}
                      style={{ height: `${sender.logoHeight || 48}px` }}
                      className="max-w-[130px] object-contain transition-all rounded-md shrink-0 mt-1.5"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug tracking-tight">
                      {sender.name || 'Digitechzo'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal break-words">
                      {sender.address || 'Digitechzo Tech Solutions, Suite 200, IT Park, Chennai, TN 600001'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-normal break-words leading-normal">
                      {sender.email || 'billing@digitechzo.com'} <span className="text-slate-400 select-none">•</span> {sender.phone || '+91 98765 43210'}
                    </p>
                    {Boolean(sender.taxId && sender.taxId.trim()) && (
                      <div className="mt-1.5">
                        <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 leading-normal">
                          GST/Tax ID: <strong className="ml-1 text-slate-900">{sender.taxId}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right (5 Cols): Tax Invoice Heading & UNPAID Badge */}
                <div className="col-span-12 sm:col-span-5 invoice-header-right flex flex-col items-start sm:items-end justify-start min-w-0 text-left sm:text-right">
                  <h1
                    className="text-2xl sm:text-3xl font-extrabold uppercase leading-normal pb-0.5 transition-colors"
                    style={{ color: activeTheme.primaryColor }}
                  >
                    TAX INVOICE
                  </h1>
                  <div className="mt-2 flex items-center sm:justify-end">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-extrabold uppercase tracking-wider ${
                        meta.status === 'PAID'
                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50 shadow-2xs'
                          : meta.status === 'PARTIALLY_PAID'
                          ? 'border-amber-300 text-amber-700 bg-amber-50 shadow-2xs'
                          : meta.status === 'DRAFT'
                          ? 'border-slate-300 text-slate-600 bg-slate-50'
                          : meta.status === 'CANCELLED'
                          ? 'border-purple-300 text-purple-700 bg-purple-50 shadow-2xs'
                          : 'border-rose-300 text-rose-600 bg-rose-50 shadow-2xs'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          meta.status === 'PAID'
                            ? 'bg-emerald-500'
                            : meta.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-500'
                            : meta.status === 'DRAFT'
                            ? 'bg-slate-400'
                            : meta.status === 'CANCELLED'
                            ? 'bg-purple-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      {meta.status || 'UNPAID'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Accent Divider Line: Brand gradient or solid (Customizable) */}
              <div
                className="h-[2.5px] rounded-full my-3.5 transition-all shadow-2xs"
                style={{
                  background:
                    activeTheme.dividerStyle === 'solid'
                      ? activeTheme.primaryColor
                      : `linear-gradient(to right, ${activeTheme.gradientFrom}, ${activeTheme.gradientVia || activeTheme.gradientFrom}, ${activeTheme.gradientTo})`,
                }}
              />

              {/* 2. Metadata Grid: Billed To (Left 7 Cols) & Invoice Details Box (Right 5 Cols) */}
              <div className="invoice-meta-grid grid grid-cols-12 gap-5 py-3 items-start">
                {/* Left: Client Profile */}
                <div className="col-span-12 sm:col-span-7 invoice-meta-left flex flex-col justify-between py-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      BILLED TO (CLIENT)
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-normal pb-0.5">
                      {client.name || 'Vortex Global Tech Solutions'}
                    </h3>
                    {client.contact && (
                      <p className="text-xs text-slate-600 mt-1 font-medium leading-normal">
                        Attn: {client.contact}
                      </p>
                    )}
                    {client.address && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">{client.address}</p>
                    )}
                    {(client.email || client.phone) && (
                      <p className="text-xs text-slate-500 mt-1.5 font-normal leading-normal">
                        {client.email} {client.email && client.phone && <span className="text-slate-400 select-none">•</span>} {client.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Invoice Details Box */}
                <div className="col-span-12 sm:col-span-5 invoice-meta-right border border-slate-200/90 rounded-xl p-4 bg-white text-xs shadow-2xs space-y-2">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">INVOICE #</span>
                    <span
                      className="font-extrabold text-xs tracking-tight transition-colors"
                      style={{ color: activeTheme.primaryColor }}
                    >
                      {meta.number || 'DIGI-2026-001'}
                    </span>
                  </div>
                  {meta.poNumber && (
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">P.O. / REF #:</span>
                      <span className="font-bold text-slate-800 text-xs">{meta.poNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">INVOICE DATE:</span>
                    <span className="font-bold text-slate-800 text-xs font-tabular">{formatDate(meta.date)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-rose-50 border-l-2 border-rose-500 px-2.5 py-1.5 rounded">
                    <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">PAYMENT DUE:</span>
                    <span className="font-extrabold text-rose-600 text-xs font-tabular">{formatDate(meta.dueDate)}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TERMS:</span>
                    <span className="text-xs text-slate-600 font-medium">
                      {meta.paymentTermsDays === '0'
                        ? 'Due on Receipt'
                        : meta.paymentTermsDays === 'custom'
                        ? 'Custom Terms'
                        : `Net ${meta.paymentTermsDays || 15} Days`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Items Table */}
              <div className="invoice-table-section py-2 overflow-x-auto print:!overflow-visible">
                <table className="w-full text-left border-collapse text-xs table-auto min-w-[500px] sm:min-w-0">
                  <thead>
                    <tr className="border-t border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center whitespace-nowrap">#</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">DESCRIPTION & ITEM DETAILS</th>
                      {enableQtyColumn && (
                        <th className="py-2.5 px-3 text-center whitespace-nowrap w-14">QTY</th>
                      )}
                      {customColumns
                        .filter((c) => c.showInPreview)
                        .map((col) => (
                          <th
                            key={col.id}
                            className={`py-2.5 px-3 whitespace-nowrap uppercase ${
                              col.type === 'number' || col.type === 'currency' ? 'text-right' : 'text-left'
                            }`}
                          >
                            {col.label} {col.type === 'currency' ? `(${meta.currency})` : ''}
                          </th>
                        ))}
                      {enablePriceColumn && (
                        <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[95px]">FINAL AMOUNT</th>
                      )}
                      {enableAdvanceColumn ? (
                        <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px]">ADVANCED AMOUNT</th>
                      ) : !enablePriceColumn ? (
                        <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[95px]">FINAL AMOUNT</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const lineAmount = (item.quantity || 0) * (item.price || 0);
                      const itemAdvance =
                        typeof item.advanceAmount === 'number'
                          ? item.advanceAmount
                          : advancePercent > 0
                          ? (lineAmount * advancePercent) / 100
                          : 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 text-center text-slate-500 font-medium text-xs align-top">{idx + 1}</td>
                          <td className="py-3 px-3 align-top">
                            <div className="font-extrabold text-slate-900 text-xs leading-snug break-words">{item.description}</div>
                            {item.subdesc && (
                              <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed break-words">{item.subdesc}</div>
                            )}
                          </td>
                          {enableQtyColumn && (
                            <td className="py-3 px-3 text-center text-slate-700 font-medium text-xs align-top whitespace-nowrap">
                              {item.quantity}
                            </td>
                          )}
                          {customColumns
                            .filter((c) => c.showInPreview)
                            .map((col) => {
                              const rawVal = item.customValues?.[col.key] ?? col.defaultValue ?? '';
                              const isNum = col.type === 'number';
                              const isCurr = col.type === 'currency';
                              let displayVal = rawVal;
                              if (isCurr && rawVal !== '' && !isNaN(Number(rawVal))) {
                                displayVal = formatCurrency(Number(rawVal), meta.currency);
                              }
                              return (
                                <td
                                  key={col.id}
                                  className={`py-3 px-3 align-top whitespace-nowrap font-medium text-xs ${
                                    isNum || isCurr ? 'text-right font-tabular text-slate-800' : 'text-left text-slate-600'
                                  }`}
                                >
                                  {displayVal || '—'}
                                </td>
                              );
                            })}
                          {enablePriceColumn && (
                            <td className="py-3 px-3 text-right font-bold text-slate-900 text-xs align-top whitespace-nowrap font-tabular">
                              {formatCurrency(lineAmount, meta.currency)}
                            </td>
                          )}
                          {enableAdvanceColumn ? (
                            <td className="py-3 px-3 text-right font-bold text-emerald-600 text-xs align-top whitespace-nowrap font-tabular">
                              {formatCurrency(itemAdvance, meta.currency)}
                            </td>
                          ) : !enablePriceColumn ? (
                            <td className="py-3 px-3 text-right font-bold text-slate-900 text-xs align-top whitespace-nowrap font-tabular">
                              {formatCurrency(lineAmount, meta.currency)}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-b border-slate-200 mt-0.5" />
              </div>

              {/* 4. Payment Details & Financial Summary */}
              <div className="invoice-payment-grid grid grid-cols-12 gap-5 py-3 items-stretch border-t border-slate-100">
                {/* Standalone Bank QR Code Card: Displayed OUTSIDE the payment details box on the left ONLY when Bank Transfer is selected and QR is not removed */}
                {activePaymentMethod === 'bank' && payment.showBankQr !== false && (
                  <div className="col-span-12 sm:col-span-3 invoice-bank-qr-outside bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs flex flex-col items-center justify-center text-center self-stretch">
                    <div
                      className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mb-2"
                      style={{ color: activeTheme.primaryColor }}
                    >
                      <QrCode className="h-3.5 w-3.5" style={{ color: activeTheme.primaryColor }} />
                      <span>SCAN & PAY</span>
                    </div>
                    {activePaymentQrUrl ? (
                      <img
                        src={activePaymentQrUrl}
                        alt="Bank Transfer QR Code"
                        className="h-28 w-28 object-contain"
                      />
                    ) : (
                      <div className="h-28 w-28 flex items-center justify-center text-slate-400 bg-slate-50 rounded">
                        <Landmark className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 font-medium mt-2 flex items-center gap-1 text-center whitespace-nowrap">
                      <QrCode className="h-3 w-3 text-slate-400" /> Scan to Pay Bank Account
                    </span>
                  </div>
                )}

                {/* Left: Payment Details Card */}
                <div
                  className={`col-span-12 ${
                    activePaymentMethod === 'bank' && payment.showBankQr !== false ? 'sm:col-span-5' : 'md:col-span-7'
                  } invoice-payment-left bg-[#F8FAFC] rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between border`}
                  style={{ borderColor: `${activeTheme.primaryColor}26` }}
                >
                  {/* Header: Payment Details & Active Method Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200/70">
                      <div
                        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                        style={{ color: activeTheme.primaryColor }}
                      >
                        <CreditCard className="h-3.5 w-3.5" style={{ color: activeTheme.primaryColor }} />
                        <span>PAYMENT DETAILS</span>
                      </div>
                      <span
                        className="text-[11px] font-bold px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 leading-normal shadow-2xs border"
                        style={{
                          color: activeTheme.primaryColor,
                          backgroundColor: `${activeTheme.primaryColor}0D`,
                          borderColor: `${activeTheme.primaryColor}30`,
                        }}
                      >
                        {activePaymentMethod === 'bank' && <Building2 className="h-3.5 w-3.5 shrink-0" />}
                        {activePaymentMethod === 'upi' && <QrCode className="h-3.5 w-3.5 shrink-0" />}
                        {activePaymentMethod === 'crypto' && <Wallet className="h-3.5 w-3.5 shrink-0" />}
                        <span>
                          {activePaymentMethod === 'bank'
                            ? 'Bank Transfer'
                            : activePaymentMethod === 'upi'
                            ? 'UPI Pay'
                            : 'Crypto Wallet'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Selected Method Details */}
                  {activePaymentMethod === 'bank' && (
                    <div className="space-y-2.5 py-1 text-xs">
                      <div className="leading-normal">
                        <span className="text-[11px] text-slate-500 font-medium">Bank Name: </span>
                        <strong className="text-slate-900 font-extrabold">{payment.bank.bankName || 'HDFC Bank Ltd'}</strong>
                      </div>

                      <div className="leading-normal">
                        <span className="text-[11px] text-slate-500 font-medium">Account Name: </span>
                        <strong className="text-slate-900 font-extrabold">{payment.bank.accountName || sender.name || 'Digitechzo'}</strong>
                      </div>

                      <div className="leading-normal">
                        <span className="text-[11px] text-slate-500 font-medium">Account #: </span>
                        <div className="inline-flex items-center gap-1.5 mt-0.5">
                          <strong className="text-slate-950 font-black font-mono tracking-tight text-xs sm:text-sm">
                            {payment.bank.accountNumber || '50200098765432'}
                          </strong>
                          <button
                            type="button"
                            onClick={() => handleCopy(payment.bank.accountNumber || '50200098765432', 'bankAccount')}
                            className="no-print h-5 px-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80 inline-flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
                            title="Copy Account Number"
                          >
                            {copiedKey === 'bankAccount' ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-600" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="leading-normal">
                        <span className="text-[11px] text-slate-500 font-medium">IFSC / SWIFT: </span>
                        <div className="inline-flex items-center gap-1.5 mt-0.5">
                          <strong className="text-slate-950 font-black font-mono tracking-tight text-xs sm:text-sm">
                            {payment.bank.ifscSwift || 'HDFC0005678 / SWIFT: HDFCINBB'}
                          </strong>
                          <button
                            type="button"
                            onClick={() => handleCopy(payment.bank.ifscSwift || 'HDFC0005678 / SWIFT: HDFCINBB', 'bankIfsc')}
                            className="no-print h-5 px-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80 inline-flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
                            title="Copy IFSC / SWIFT Code"
                          >
                            {copiedKey === 'bankIfsc' ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-600" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="leading-normal">
                        <span className="text-[11px] text-slate-500 font-medium">Branch: </span>
                        <span className="text-slate-800 font-medium">
                          {payment.bank.branch || 'Anna Salai Branch, Chennai'}
                        </span>
                      </div>
                    </div>
                  )}

                  {activePaymentMethod === 'upi' && (
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-xs">
                      {/* Left: White Card with QR Code */}
                      <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs flex flex-col items-center justify-center shrink-0 w-32 sm:w-36">
                        {activePaymentQrUrl ? (
                          <img
                            src={activePaymentQrUrl}
                            alt="UPI QR Code"
                            className="h-24 w-24 sm:h-28 sm:w-28 object-contain"
                          />
                        ) : (
                          <div className="h-24 w-24 sm:h-28 sm:w-28 flex items-center justify-center text-slate-400 bg-slate-50 rounded">
                            <QrCode className="h-8 w-8 text-slate-300" />
                          </div>
                        )}
                      </div>

                      {/* Right: UPI Key Details matching screenshot */}
                      <div className="flex-1 min-w-0 space-y-2 py-0.5 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">UPI ID / VPA:</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <strong className="text-slate-900 font-extrabold text-sm tracking-tight font-mono">
                              {payment.upi.upiId || 'digitechzo@okicici'}
                            </strong>
                            <button
                              type="button"
                              onClick={() => handleCopy(payment.upi.upiId || 'digitechzo@okicici', 'upi')}
                              className="no-print h-6 px-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80 inline-flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                              title="Copy UPI ID"
                            >
                              {copiedKey === 'upi' ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-slate-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-500 font-medium">Payee Name: </span>
                          <strong className="text-slate-900 font-bold">{payment.upi.payeeName || sender.name || 'Digitechzo'}</strong>
                        </div>

                        <div>
                          <span className="text-slate-500 font-medium">Note: </span>
                          <span className="text-slate-800 font-medium">
                            {payment.upi.note || `Payment for Invoice ${meta.number || 'DIGI-2026-001'}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePaymentMethod === 'crypto' && (
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-xs">
                      {/* Left: White Card with Crypto QR Code */}
                      <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs flex flex-col items-center justify-center shrink-0 w-32 sm:w-36">
                        {activePaymentQrUrl ? (
                          <img
                            src={activePaymentQrUrl}
                            alt="Crypto Wallet QR"
                            className="h-24 w-24 sm:h-28 sm:w-28 object-contain"
                          />
                        ) : (
                          <div className="h-24 w-24 sm:h-28 sm:w-28 flex items-center justify-center text-slate-400 bg-slate-50 rounded">
                            <Wallet className="h-8 w-8 text-slate-300" />
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500 font-medium mt-1.5 flex items-center gap-1 text-center whitespace-nowrap">
                          <QrCode className="h-3 w-3 text-slate-400" /> Scan Wallet Address
                        </span>
                      </div>

                      {/* Right: Crypto Details matching screenshot */}
                      <div className="flex-1 min-w-0 space-y-2 py-0.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Coin:</span>
                          <span
                            className="px-2.5 py-0.5 rounded-full font-bold text-xs border"
                            style={{
                              color: activeTheme.primaryColor,
                              backgroundColor: `${activeTheme.primaryColor}12`,
                              borderColor: `${activeTheme.primaryColor}26`,
                            }}
                          >
                            {payment.crypto.coin} ({payment.crypto.network})
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 font-medium">Network: </span>
                          <strong className="text-slate-900 font-extrabold">{payment.crypto.network}</strong>
                        </div>

                        <div>
                          <span className="text-slate-500 font-medium block mb-1">Wallet Address:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900 break-all">
                              {payment.crypto.address || 'TYDzsYWaWXtHVRMokBSuP2t97711234567'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(payment.crypto.address, 'crypto')}
                              className="no-print h-6 px-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80 inline-flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
                              title="Copy Wallet Address"
                            >
                              {copiedKey === 'crypto' ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-slate-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Financial Summary */}
                <div
                  className={`col-span-12 ${
                    activePaymentMethod === 'bank' && payment.showBankQr !== false ? 'sm:col-span-4' : 'md:col-span-5'
                  } invoice-payment-right flex flex-col justify-between py-1`}
                >
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-medium text-xs">Subtotal</span>
                      <span className="font-tabular font-semibold text-slate-800 text-xs">{formatCurrency(subtotal, meta.currency)}</span>
                    </div>

                    {discountRate > 0 && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium text-xs">Discount ({discountRate}%)</span>
                        <span className="font-tabular font-semibold text-slate-800 text-xs">-{formatCurrency(discountAmount, meta.currency)}</span>
                      </div>
                    )}

                    {taxRate > 0 && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium text-xs">Tax ({taxRate}%)</span>
                        <span className="font-tabular font-semibold text-slate-800 text-xs">+{formatCurrency(taxAmount, meta.currency)}</span>
                      </div>
                    )}

                    {totalAdvance > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-semibold">
                        <span className="text-xs">Advanced Amount Paid</span>
                        <span className="font-tabular text-xs">-{formatCurrency(totalAdvance, meta.currency)}</span>
                      </div>
                    )}

                    <div
                      className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center -mx-1 px-3 py-2.5 rounded-xl border shadow-2xs transition-colors"
                      style={{
                        backgroundColor: `${activeTheme.primaryColor}0D`,
                        borderColor: `${activeTheme.primaryColor}26`,
                      }}
                    >
                      <div>
                        <span
                          className="font-extrabold text-xs sm:text-sm uppercase tracking-tight block"
                          style={{ color: activeTheme.primaryColor }}
                        >
                          Total Amount Due
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Net Payable Balance</span>
                      </div>
                      <span
                        className="font-tabular font-black text-xl sm:text-2xl tracking-tight"
                        style={{ color: activeTheme.primaryColor }}
                      >
                        {formatCurrency(balanceDue > 0 ? balanceDue : grandTotal, meta.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Notes & Terms (Left 7 Cols) & Authorized Signatory (Right 5 Cols) */}
              <div className="invoice-terms-grid grid grid-cols-12 gap-5 py-3.5 border-t border-slate-100 items-start">
                {/* Left: Separated Note & Terms */}
                <div className="col-span-12 sm:col-span-7 invoice-terms-left space-y-4">
                  {/* Note Block */}
                  {showNotesBlock && notes && (
                    <div className="space-y-1">
                      <div
                        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 pb-0.5"
                        style={{ color: activeTheme.primaryColor }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" style={{ color: activeTheme.primaryColor }} />
                        <span>{notesHeading || 'NOTE:'}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                        {notes}
                      </p>
                    </div>
                  )}

                  {/* Terms Block */}
                  {showTermsBlock && terms && (
                    <div className="space-y-1">
                      <div
                        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 pb-0.5"
                        style={{ color: activeTheme.primaryColor }}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: activeTheme.primaryColor }} />
                        <span>{termsHeading || 'TERMS:'}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                        {terms}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: Team / Authorized Signatory */}
                {showSignatureBlock && (
                  <div className="col-span-12 sm:col-span-5 invoice-terms-right flex flex-col items-end text-right">
                    {signature.signatureImage ? (
                      <div className="relative flex items-center justify-end mb-1.5">
                        <img
                          src={signature.signatureImage}
                          alt="Authorized Signature"
                          className="h-11 max-w-[160px] object-contain"
                          style={{
                            mixBlendMode: 'multiply',
                            filter: 'contrast(1.05)',
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-44 sm:w-52 border-t-2 border-slate-800 mb-2.5" />
                    )}
                    <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-normal">
                      {signature.name || 'Digitechzo Director'}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-normal mt-0.5">
                      {signature.role || 'Managing Director'}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-[#57B71B] bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200/90 leading-normal shadow-2xs">
                      <span className="font-bold">✓</span>
                      <span>AUTHORIZED SIGNATURE</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 7. Footer Text */}
              {footerText && (
                <div className="invoice-footer text-center pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium tracking-wide">
                  {footerText}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* ========================================================= */}
      {/* INVOICE HISTORY & DRAFTS MODAL                            */}
      {/* ========================================================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-card border border-border shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-500" />
                <h3 className="text-sm font-bold text-txt-primary">Invoice History & Cloud Records</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {savedInvoices.length} invoices
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Prisma Studio Synced
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="h-7 w-7 rounded-btn hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 border-b border-border bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by invoice #, client name, or date..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="flex-1 h-8 rounded-input border border-border px-3 text-xs text-txt-primary"
              />
              {savedInvoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Clear all saved invoice history?')) {
                      setSavedInvoices([]);
                      localStorage.removeItem('digitechzo_saved_invoices');
                      showToast('History cleared');
                    }
                  }}
                  className="h-8 px-2.5 rounded-btn text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {isLoadingDbInvoices && (
                <div className="py-6 text-center text-xs text-txt-muted animate-pulse">
                  Loading invoices from database...
                </div>
              )}
              {!isLoadingDbInvoices && filteredInvoices.length === 0 ? (
                <div className="py-12 text-center text-txt-muted text-xs">
                  <FolderOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No saved invoices found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click "Save Invoice" on the studio header to save your first bill!
                  </p>
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => handleLoadInvoice(inv)}
                    className="flex items-center justify-between p-3 rounded-btn border border-border bg-white hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-txt-primary font-tabular">{inv.number}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'DRAFT'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-txt-secondary mt-0.5">{inv.clientName}</p>
                      <span className="text-[10px] text-txt-muted">
                        Due: {formatDate(inv.dueDate)} • Saved: {inv.savedAt}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-txt-primary font-tabular">
                        {formatCurrency(inv.total, inv.currency)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteInvoice(inv.id, e)}
                        className="h-7 w-7 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                        title="Delete Invoice"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-border bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="h-8 px-4 rounded-btn border border-border bg-white text-xs font-semibold text-txt-secondary hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Custom Column Config Modal                                */}
      {/* ========================================================= */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border rounded-card shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-[#57B71B]" />
                <h3 className="text-sm font-bold text-txt-primary">
                  {editingColId ? 'Edit Invoice Column' : 'Add Custom Invoice Column'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs flex-1 overflow-y-auto overscroll-contain">
              {/* Column Heading */}
              <div>
                <label className="text-[11px] font-semibold text-txt-secondary block mb-1">
                  Column Heading <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={newColLabel}
                  onChange={(e) => setNewColLabel(e.target.value)}
                  placeholder="e.g. Milestone Amount, Service Fee, Installation Charge..."
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs font-semibold text-txt-primary focus:outline-none focus:ring-1 focus:ring-[#57B71B]"
                  autoFocus
                />
                <span className="text-[10px] text-txt-muted block mt-0.5">
                  Appears as the column header in the items table and PDF.
                </span>
              </div>

              {/* Column Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-1">
                    Column Type
                  </label>
                  <CustomSelect
                    value={newColType}
                    onChange={(val) => setNewColType(val as any)}
                    options={[
                      { value: 'text', label: 'Text (e.g. Phase / Note)' },
                      { value: 'number', label: 'Number (Numeric)' },
                      { value: 'currency', label: `Currency (${meta.currency})` },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-txt-secondary block mb-1">
                    Default Value (Optional)
                  </label>
                  <input
                    type={newColType === 'number' || newColType === 'currency' ? 'number' : 'text'}
                    value={newColDefault}
                    onChange={(e) => setNewColDefault(e.target.value)}
                    placeholder="e.g. 0 or N/A..."
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                  />
                </div>
              </div>

              {/* Toggles: Show in preview & Required */}
              <div className="p-2.5 rounded-btn bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-txt-primary">
                  <input
                    type="checkbox"
                    checked={newColShowInPreview}
                    onChange={(e) => setNewColShowInPreview(e.target.checked)}
                    className="rounded accent-[#57B71B]"
                  />
                  <span>Show column in live preview and PDF output</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-txt-primary">
                  <input
                    type="checkbox"
                    checked={newColRequired}
                    onChange={(e) => setNewColRequired(e.target.checked)}
                    className="rounded accent-[#57B71B]"
                  />
                  <span>Mark column as required when entering item data</span>
                </label>
              </div>
            </div>

            <div className="p-3 border-t border-border bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(false)}
                className="h-8 px-3 rounded-btn border border-border bg-white text-xs font-medium text-txt-secondary hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomColumn}
                disabled={!newColLabel.trim()}
                className="h-8 px-4 rounded-btn bg-[#57B71B] hover:bg-[#469815] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              >
                {editingColId ? 'Save Changes' : 'Add Column'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
