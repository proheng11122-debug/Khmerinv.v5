import { useState, useRef, useMemo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  QrCode,
  Save,
  Share2,
  Pencil,
  SplitSquareHorizontal,
  Eye,
  Upload,
  X,
  TrendingUp,
  Hash,
  User,
  Package,
  Wallet,
  Percent,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { IconBadge } from './IconBadge';
import { COLORS, khmerFont, INLINE, ACTION, DEFAULT_UNITS } from '../lib/theme';

type Tab = 'edit' | 'split' | 'preview';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  unit: string;
  product_id: string | null;
}

interface Product {
  id: string;
  name: string;
  unit: string;
  sell_price: number;
  quantity: number;
}

interface Payment {
  id: string;
  amount: number;
  note: string | null;
  payment_date: string;
}

interface Profile {
  id: string;
  business_name: string | null;
  username: string | null;
  phone: string | null;
  qr_code_url: string | null;
}

interface Props {
  lang: 'KH' | 'EN';
  profile: Profile;
  onBack: () => void;
  editInvoiceId?: string | null;
}

let itemIdCounter = 0;
const genItemId = () => `item-${++itemIdCounter}`;

function fmtMoney(n: number, currency: string) {
  if (currency === 'USD')
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${n.toLocaleString()} ៛`;
}

export default function InvoiceScreen({ lang, profile, onBack, editInvoiceId }: Props) {
  const [tab, setTab] = useState<Tab>(editInvoiceId ? 'preview' : 'edit');
  const [invoiceId, setInvoiceId] = useState<string | null>(editInvoiceId ?? null);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: genItemId(), description: '', quantity: '1', unit_price: '', unit: DEFAULT_UNITS[0], product_id: null },
  ]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [discount, setDiscount] = useState('0');
  const [invoiceNumber, setInvoiceNumber] = useState<number | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showQRUpload, setShowQRUpload] = useState(false);
  const [qrUploadBusy, setQrUploadBusy] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(profile.qr_code_url);
  const [shareBusy, setShareBusy] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [addingUnitFor, setAddingUnitFor] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState('');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const tr = (kh: string, en: string) => (lang === 'KH' ? kh : en);

  useEffect(() => {
    setQrCodeUrl(profile.qr_code_url);
  }, [profile.qr_code_url]);

  useEffect(() => {
    supabase
      .from('custom_units')
      .select('name')
      .order('created_at')
      .then(({ data }) => {
        if (data) setCustomUnits(data.map((u: { name: string }) => u.name));
      });
    supabase
      .from('products')
      .select('id, name, unit, sell_price, quantity')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setProducts(data as Product[]);
      });
  }, []);

  const selectProductForItem = (itemId: string, productId: string) => {
    if (!productId) {
      updateItem(itemId, 'product_id', '');
      return;
    }
    const p = products.find((pr) => pr.id === productId);
    if (!p) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, product_id: p.id, description: p.name, unit: p.unit, unit_price: String(p.sell_price) }
          : i
      )
    );
  };

  const fetchPayments = async (id: string) => {
    setPaymentsLoading(true);
    const { data } = await supabase
      .from('invoice_payments')
      .select('id, amount, note, payment_date')
      .eq('invoice_id', id)
      .order('payment_date', { ascending: false });
    setPaymentsLoading(false);
    if (data) setPayments(data || []);
  };

  useEffect(() => {
    if (invoiceId) fetchPayments(invoiceId);
  }, [invoiceId]);

  const handleAddNewUnit = async (itemId: string) => {
    const name = newUnitName.trim();
    if (!name) return;
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase
        .from('custom_units')
        .upsert({ user_id: userData.user.id, name }, { onConflict: 'user_id,name' });
    }
    setCustomUnits((prev) => (prev.includes(name) ? prev : [...prev, name]));
    updateItem(itemId, 'unit', name);
    setNewUnitName('');
    setAddingUnitFor(null);
  };

  const handleAddPayment = async () => {
    setPaymentError('');
    if (!invoiceId) {
      setPaymentError(tr('សូមរក្សាទុកវិក្កយបត្រជាមុនសិន', 'Please save the invoice first'));
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError(tr('សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ', 'Please enter a valid amount'));
      return;
    }
    setPaymentBusy(true);
    const { error } = await supabase.from('invoice_payments').insert({
      invoice_id: invoiceId,
      amount: amt,
      note: paymentNote.trim() || null,
      payment_date: paymentDate,
    });
    setPaymentBusy(false);
    if (error) {
      setPaymentError(error.message);
      return;
    }
    setPaymentAmount('');
    setPaymentNote('');
    setIsPaymentModalOpen(false);
    fetchPayments(invoiceId);
  };

  useEffect(() => {
    if (!editInvoiceId) return;
    let cancelled = false;
    (async () => {
      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', editInvoiceId)
        .maybeSingle();
      if (!inv || cancelled) return;
      setInvoiceNumber(inv.invoice_number);
      setCustomerName(inv.customer_name || '');
      setCustomerPhone(inv.customer_phone || '');
      setInvoiceDate(inv.invoice_date || new Date().toISOString().slice(0, 10));
      setDueDate(inv.due_date || '');
      setCurrency(inv.currency || 'USD');
      setDiscount(String(inv.discount || '0'));

      const { data: itemRows } = await supabase
        .from('invoice_items')
        .select('description, quantity, unit_price, unit, product_id')
        .eq('invoice_id', editInvoiceId)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (itemRows && itemRows.length > 0) {
        setItems(
          itemRows.map((r: any) => ({
            id: genItemId(),
            description: r.description || '',
            quantity: String(r.quantity),
            unit_price: String(r.unit_price),
            unit: r.unit || DEFAULT_UNITS[0],
            product_id: r.product_id || null,
          }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editInvoiceId]);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        return sum + qty * price;
      }, 0),
    [items]
  );

  const discountVal = parseFloat(discount) || 0;
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = subtotal - discountVal - paid;

  const addItem = () =>
    setItems([
      ...items,
      { id: genItemId(), description: '', quantity: '1', unit_price: '', unit: DEFAULT_UNITS[0], product_id: null },
    ]);

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string) =>
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess(false);
    const validItems = items.filter((i) => i.description.trim() && (parseFloat(i.quantity) || 0) > 0);
    if (!customerName.trim()) {
      setSaveError(tr('សូមបញ្ចូលឈ្មោះអតិថិជន', 'Please enter customer name'));
      return;
    }
    if (validItems.length === 0) {
      setSaveError(tr('សូមបញ្ចូលបញ្ជីទំនិញយ៉ាងហោចណាស់មួយ', 'Please add at least one item'));
      return;
    }
    setSaveBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaveBusy(false);
      setSaveError(tr('មិនអាចរក្សាទុកបានទេ', 'Could not save'));
      return;
    }

    const invoicePayload = {
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || null,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      subtotal,
      discount: discountVal,
      currency,
    };

    const itemRows = validItems.map((i) => ({
      description: i.description.trim(),
      quantity: parseFloat(i.quantity) || 0,
      unit_price: parseFloat(i.unit_price) || 0,
      unit: i.unit,
      product_id: i.product_id || null,
    }));

    const isNewInvoice = !invoiceId;
    let currentInvoiceId = invoiceId;

    if (currentInvoiceId) {
      const { error: updError } = await supabase
        .from('invoices')
        .update(invoicePayload)
        .eq('id', currentInvoiceId);
      if (updError) {
        setSaveBusy(false);
        setSaveError(updError.message);
        return;
      }
      await supabase.from('invoice_items').delete().eq('invoice_id', currentInvoiceId);
      await supabase
        .from('invoice_items')
        .insert(itemRows.map((r) => ({ ...r, invoice_id: currentInvoiceId })));
    } else {
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .insert(invoicePayload)
        .select()
        .maybeSingle();

      if (invError || !invData) {
        setSaveBusy(false);
        setSaveError(invError?.message || tr('មិនអាចរក្សាទុកបានទេ', 'Could not save'));
        return;
      }

      currentInvoiceId = invData.id;
      setInvoiceId(invData.id);
      setInvoiceNumber(invData.invoice_number);

      await supabase
        .from('invoice_items')
        .insert(itemRows.map((r) => ({ ...r, invoice_id: currentInvoiceId })));

      if (isNewInvoice) {
        const stockRows = itemRows
          .filter((r) => r.product_id && r.quantity > 0)
          .map((r) => ({
            product_id: r.product_id,
            user_id: userData.user!.id,
            type: 'out' as const,
            quantity: r.quantity,
            note: tr('លក់តាមវិក្កយបត្រ', 'Sold via invoice'),
            movement_date: invoiceDate,
          }));
        if (stockRows.length > 0) {
          await supabase.from('stock_movements').insert(stockRows);
        }
      }
    }

    setSaveBusy(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleShare = async () => {
    if (!previewRef.current) return;
    setShareBusy(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceNumber || 'draft'}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (e) {
      console.error('Share failed:', e);
    }
    setShareBusy(false);
  };

  const handleQRUpload = async (file: File) => {
    setQrUploadBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setQrUploadBusy(false);
      return;
    }
    const ext = file.name.split('.').pop() || 'png';
    const path = `${userData.user.id}/qr-code.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('qr-codes')
      .upload(path, file, { upsert: true });
    if (upErr) {
      setQrUploadBusy(false);
      return;
    }
    const { data: pubData } = supabase.storage.from('qr-codes').getPublicUrl(path);
    const publicUrl = pubData.publicUrl;
    await supabase.from('profiles').update({ qr_code_url: publicUrl }).eq('id', userData.user.id);
    setQrCodeUrl(publicUrl);
    setQrUploadBusy(false);
    setShowQRUpload(false);
  };

  const tabBtn = (tabKey: Tab, label: string, Icon: LucideIcon) => (
    <button
      onClick={() => setTab(tabKey)}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all"
      style={{
        backgroundColor: tab === tabKey ? COLORS.invoice : 'transparent',
        color: tab === tabKey ? '#FFFFFF' : COLORS.muted,
      }}
    >
      <Icon size={INLINE} color={tab === tabKey ? '#FFFFFF' : COLORS.muted} strokeWidth={2} />
      {label}
    </button>
  );

  const inputStyle: CSSProperties = {
    borderColor: COLORS.border,
    backgroundColor: '#FAFAF8',
    color: COLORS.navy,
    ...khmerFont,
  };

  const PreviewContent = () => (
    <div
      ref={previewRef}
      className="bg-white rounded-2xl overflow-hidden border"
      style={{ boxShadow: '0 4px 20px rgba(24,41,62,0.05)', borderColor: COLORS.border }}
    >
      {/* Light Banner Header Style */}
      <div 
        className="p-5 flex justify-between items-center border-b" 
        style={{ background: 'linear-gradient(180deg, #F4F7FA 0%, #FFFFFF 100%)', borderColor: COLORS.border }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border text-xl font-bold" style={{ color: COLORS.invoice, borderColor: COLORS.border }}>
            {profile.business_name ? profile.business_name.charAt(0).toUpperCase() : 'K'}
          </div>
          <div>
            <h3 className="text-base font-extrabold" style={{ color: COLORS.navy }}>
              {profile.business_name || 'ឈ្មោះអាជីវកម្ម'}
            </h3>
            <p className="text-xs text-gray-500" style={{ ...khmerFont }}>
              {profile.phone || tr('មិនទាន់មានលេខទូរស័ព្ទ', 'No phone number')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md" style={{ backgroundColor: COLORS.invoiceTint, color: COLORS.invoice }}>
            {tr('វិក្កយបត្រ', 'INVOICE')}
          </span>
          <p className="text-xs font-bold mt-1.5" style={{ color: COLORS.navy }}>
            #{invoiceNumber ? String(invoiceNumber).padStart(6, '0') : '------'}
          </p>
        </div>
      </div>

      <div className="p-5">
        {/* Info Blocks */}
        <div className="grid grid-cols-2 gap-4 mb-5 pb-4 border-b" style={{ borderColor: COLORS.border }}>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">{tr('អតិថិជន', 'Bill To')}</p>
            <p className="text-sm font-bold" style={{ color: COLORS.navy }}>{customerName || '---'}</p>
            {customerPhone && <p className="text-xs text-gray-500 mt-0.5">{customerPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">{tr('កាលបរិច្ឆេទ', 'Date Info')}</p>
            <p className="text-xs text-gray-600">{tr('ថ្ងៃចេញ៖ ', 'Issued: ')}{invoiceDate}</p>
            {dueDate && <p className="text-xs text-red-500 mt-0.5">{tr('ថ្ងៃផុតកំណត់៖ ', 'Due: ')}{dueDate}</p>}
          </div>
        </div>

        {/* Table list */}
        <table className="w-full mb-5">
          <thead>
            <tr className="border-b-2 pb-2 text-left" style={{ borderColor: COLORS.border }}>
              <th className="text-xs font-bold text-gray-400 pb-2">{tr('ការពិពណ៌នា', 'Description')}</th>
              <th className="text-xs font-bold text-gray-400 pb-2 text-center">{tr('ចំនួន', 'Qty')}</th>
              <th className="text-xs font-bold text-gray-400 pb-2 text-right">{tr('តម្លៃ', 'Price')}</th>
              <th className="text-xs font-bold text-gray-400 pb-2 text-right">{tr('សរុប', 'Total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: COLORS.border }}>
            {items
              .filter((i) => i.description.trim())
              .map((item) => {
                const qty = parseFloat(item.quantity) || 0;
                const price = parseFloat(item.unit_price) || 0;
                return (
                  <tr key={item.id}>
                    <td className="text-xs py-3 text-gray-800">{item.description}</td>
                    <td className="text-xs py-3 text-center text-gray-600">{qty} {item.unit}</td>
                    <td className="text-xs py-3 text-right text-gray-600">{fmtMoney(price, currency)}</td>
                    <td className="text-xs py-3 text-right font-bold" style={{ color: COLORS.navy }}>{fmtMoney(qty * price, currency)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {/* Financial Details */}
        <div className="flex justify-end mb-6">
          <div className="w-52 space-y-2 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>{tr('សរុបរង', 'Subtotal')}</span>
              <span className="font-semibold">{fmtMoney(subtotal, currency)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between text-red-500">
                <span>{tr('បញ្ចុះតម្លៃ (-)', 'Discount (-)')}</span>
                <span className="font-semibold">-{fmtMoney(discountVal, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-green-600">
              <span>{tr('បានបង់', 'Paid')}</span>
              <span className="font-semibold">{fmtMoney(paid, currency)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t font-bold" style={{ borderColor: COLORS.border }}>
              <span style={{ color: COLORS.navy }}>{tr('នៅសល់', 'Balance')}</span>
              <span style={{ color: COLORS.danger }}>{fmtMoney(balance, currency)}</span>
            </div>
          </div>
        </div>

        {/* QR Payment Area Section */}
        {qrCodeUrl && (
          <div className="pt-4 border-t flex flex-col items-center justify-center bg-gray-50 rounded-xl p-3" style={{ borderColor: COLORS.border }}>
            <img
              src={qrCodeUrl}
              alt="Payment QR"
              className="w-28 h-28 rounded-lg bg-white p-1 border shadow-sm"
              style={{ borderColor: COLORS.border }}
              crossOrigin="anonymous"
            />
            <p className="text-[11px] text-gray-500 font-bold mt-2 tracking-wide">
              {tr('ស្កេន QR ខាងលើនេះដើម្បីទូទាត់ប្រាក់', 'SCAN QR CODE TO MAKE PAYMENT')}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const EditTab = () => (
    <div className="space-y-3">
      {/* Identity info */}
      <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-2 mb-3">
          <IconBadge icon={Hash} size={INLINE} tint="invoice" shape="rounded" />
          <p className="text-xs font-bold text-gray-500">{tr('អត្តសញ្ញាណ', 'Identity')}</p>
          <span className="ml-auto text-sm font-bold" style={{ color: COLORS.navy }}>
            {invoiceNumber ? `#${String(invoiceNumber).padStart(6, '0')}` : tr('#ថ្មី', '#New')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold block mb-1 text-gray-700">{tr('ថ្ងៃទី', 'Date')}</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1 text-gray-700">{tr('ថ្ងៃផុតកំណត់', 'Due Date')}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-2 mb-3">
          <IconBadge icon={User} size={INLINE} tint="invoice" shape="rounded" />
          <p className="text-xs font-bold text-gray-500">{tr('ព័ត៌មានអតិថិជន', 'Customer Info')}</p>
        </div>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={tr('ឈ្មោះអតិថិជន', 'Customer name')}
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none mb-2"
          style={inputStyle}
        />
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder={tr('លេខទូរស័ព្ទ', 'Phone number')}
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
          style={inputStyle}
        />
      </div>

      {/* Items list */}
      <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: COLORS.border }}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <IconBadge icon={Package} size={INLINE} tint="invoice" shape="rounded" />
            <p className="text-xs font-bold text-gray-500">{tr('បញ្ជីទំនិញ', 'Products')}</p>
          </div>
          <button onClick={addItem} className="flex items-center gap-1 text-xs font-bold" style={{ color: COLORS.invoice }}>
            <Plus size={INLINE} strokeWidth={2} />
            {tr('បន្ថែមជួរ', 'Append Row')}
          </button>
        </div>

        {items.map((item, idx) => {
          const qty = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.unit_price) || 0;
          return (
            <div key={item.id} className="mb-3 p-3 rounded-lg border bg-gray-50" style={{ borderColor: COLORS.border }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(item.id)}>
                    <Trash2 size={INLINE} color={COLORS.danger} strokeWidth={2} />
                  </button>
                )}
              </div>
              <input
                value={item.description}
                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                placeholder={tr('ការពិពណ៌នាទំនិញ ឬសេវាកម្ម', 'Description')}
                className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none mb-2"
                style={inputStyle}
              />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] font-semibold block mb-0.5 text-gray-500">{tr('ចំនួន', 'Qty')}</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-0.5 text-gray-500">{tr('តម្លៃរាយ', 'Price')}</label>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Discount & Currency Info */}
      <div className="bg-white rounded-2xl p-4 border space-y-3" style={{ borderColor: COLORS.border }}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold block mb-1 text-gray-700">{tr('រូបិយប័ណ្ណ', 'Currency')}</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrency('USD')}
                className="flex-1 py-2 rounded-lg border text-xs font-bold"
                style={{ backgroundColor: currency === 'USD' ? COLORS.invoice : '#FFF', color: currency === 'USD' ? '#FFF' : '#333', borderColor: COLORS.border }}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency('KHR')}
                className="flex-1 py-2 rounded-lg border text-xs font-bold"
                style={{ backgroundColor: currency === 'KHR' ? COLORS.invoice : '#FFF', color: currency === 'KHR' ? '#FFF' : '#333', borderColor: COLORS.border }}
              >
                KHR
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1 text-gray-700">{tr('ការបញ្ចុះតម្លៃ', 'Discount')}</label>
            <div className="relative flex items-center">
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border pl-8 pr-2 py-2 text-sm outline-none"
                style={inputStyle}
              />
              <Percent size={14} className="absolute left-2.5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary card */}
      <div className="bg-white rounded-2xl p-4 border space-y-2" style={{ borderColor: COLORS.border }}>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{tr('សរុបរង', 'Subtotal')}</span>
          <span className="font-bold">{fmtMoney(subtotal, currency)}</span>
        </div>
        {discountVal > 0 && (
          <div className="flex justify-between text-xs text-red-500">
            <span>{tr('បញ្ចុះតម្លៃ', 'Discount')}</span>
            <span className="font-bold">-{fmtMoney(discountVal, currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-green-600">
          <span>{tr('បានបង់', 'Paid')}</span>
          <span className="font-bold">{fmtMoney(paid, currency)}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t font-extrabold" style={{ borderColor: COLORS.border, color: COLORS.navy }}>
          <span>{tr('នៅសល់', 'Balance')}</span>
          <span className="text-red-500">{fmtMoney(balance, currency)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <button
        onClick={() => (qrCodeUrl ? setShowQR(true) : setShowQRUpload(true))}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold bg-amber-50 text-amber-800"
        style={{ borderColor: COLORS.border }}
      >
        <QrCode size={INLINE} strokeWidth={2} />
        {qrCodeUrl ? tr('បង្ហាញ QR បង់ប្រាក់', 'Show Payment QR') : tr('បញ្ចូល QR បង់ប្រាក់', 'Upload Payment QR')}
      </button>

      {saveError && <div className="p-2 bg-red-50 text-red-600 rounded-lg text-xs text-center border border-red-200">{saveError}</div>}
      {saveSuccess && <div className="p-2 bg-green-50 text-green-600 rounded-lg text-xs text-center border border-green-200">{tr('រក្សាទុកបានជោគជ័យ!', 'Saved successfully!')}</div>}

      <div className="flex gap-2 pb-5">
        <button onClick={handleSave} disabled={saveBusy} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-white text-xs bg-slate-900 disabled:opacity-50">
          <Save size={INLINE} strokeWidth={2} />
          {saveBusy ? tr('កំពុងរក្សា...', 'Saving...') : tr('រក្សាទុក', 'Save')}
        </button>
        <button onClick={handleShare} disabled={shareBusy} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-white text-xs bg-amber-500 disabled:opacity-50">
          <Share2 size={INLINE} strokeWidth={2} />
          {shareBusy ? tr('កំពុងបង្កើត...', 'Sharing...') : tr('ចែករំលែក', 'Share')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.bgApp, ...khmerFont }}>
      {/* Upper header navigation */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${COLORS.navyGradientStart}, ${COLORS.navyGradientEnd})` }}>
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <ArrowLeft size={INLINE} color="#FFFFFF" strokeWidth={2} />
        </button>
        <div>
          <p className="text-white font-bold text-sm">{tr('វិក្កយបត្រ', 'Invoice Management')}</p>
          <p className="text-white/70 text-xs">{tr('គ្រប់គ្រង និងកែសម្រួលវិក្កយបត្រ', 'Manage and view details')}</p>
        </div>
      </div>

      {/* Tabs navigation options */}
      <div className="px-4 pt-3">
        <div className="flex rounded-xl border p-1 gap-1 bg-gray-100" style={{ borderColor: COLORS.border }}>
          {tabBtn('edit', tr('កែសម្រួល', 'Edit'), Pencil)}
          {tabBtn('preview', tr('មើល', 'Preview'), Eye)}
        </div>
      </div>

      {/* Active layout containers */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'edit' ? <EditTab /> : <PreviewContent />}
      </div>

      {/* Modals area elements */}
      {showQR && qrCodeUrl && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 px-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold mb-3 text-slate-800">{tr('ស្កេន QR ដើម្បីបង់ប្រាក់', 'Scan QR to Pay')}</p>
            <img src={qrCodeUrl} alt="Payment QR" className="w-48 h-48 mx-auto rounded-xl border" crossOrigin="anonymous" />
          </div>
        </div>
      )}

      {showQRUpload && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 px-4" onClick={() => setShowQRUpload(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <IconBadge icon={Upload} size={ACTION} tint="invoice" shape="rounded" />
            <p className="text-sm font-bold mt-2 mb-4 text-slate-800">{tr('បញ្ចូលរូបភាព QR', 'Upload QR Image')}</p>
            <input
              type="file"
              accept="image/*"
              disabled={qrUploadBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleQRUpload(file);
              }}
              className="hidden"
              id="qr-file-input-main"
            />
            <label htmlFor="qr-file-input-main" className="block w-full py-2.5 rounded-lg font-bold text-white text-xs cursor-pointer bg-slate-900">
              {qrUploadBusy ? tr('កំពុងបញ្ចូល...', 'Uploading...') : tr('ជ្រើសរើសរូបភាព', 'Choose Image')}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
