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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { IconBadge } from './IconBadge';
import { COLORS, khmerFont, latinFont, INLINE, ACTION, DEFAULT_UNITS } from '../lib/theme';




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
  const [notes, setNotes] = useState('');
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

  // Units (shared pattern with Income/Expense)
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [addingUnitFor, setAddingUnitFor] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState('');

  // Payment ledger
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
      .then(({ data, error }) => {
        if (!error) setCustomUnits((data || []).map((u: { name: string }) => u.name));
      });
    supabase
      .from('products')
      .select('id, name, unit, sell_price, quantity')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error) setProducts((data as Product[]) || []);
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
    const { data, error } = await supabase
      .from('invoice_payments')
      .select('id, amount, note, payment_date')
      .eq('invoice_id', id)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });
    setPaymentsLoading(false);
    if (!error) setPayments(data || []);
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
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', editInvoiceId)
        .maybeSingle();
      if (invErr || !inv || cancelled) return;
      setInvoiceNumber(inv.invoice_number);
      setCustomerName(inv.customer_name || '');
      setCustomerPhone(inv.customer_phone || '');
      setInvoiceDate(inv.invoice_date || new Date().toISOString().slice(0, 10));
      setDueDate(inv.due_date || '');
      setCurrency(inv.currency || 'USD');
      setNotes(inv.notes || '');

      const { data: itemRows } = await supabase
        .from('invoice_items')
        .select('description, quantity, unit_price, unit, product_id')
        .eq('invoice_id', editInvoiceId)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (itemRows && itemRows.length > 0) {
        setItems(
          itemRows.map((r: { description: string; quantity: number; unit_price: number; unit: string | null; product_id: string | null }) => ({
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

  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = subtotal - paid;

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
      currency,
      notes: notes.trim() || null,
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
      // Update existing invoice in place
      const { error: updError } = await supabase
        .from('invoices')
        .update(invoicePayload)
        .eq('id', currentInvoiceId);
      if (updError) {
        setSaveBusy(false);
        setSaveError(updError.message);
        return;
      }
      // Replace items: simplest correct approach is delete-then-reinsert
      await supabase.from('invoice_items').delete().eq('invoice_id', currentInvoiceId);
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemRows.map((r) => ({ ...r, invoice_id: currentInvoiceId })));
      setSaveBusy(false);
      if (itemsError) {
        setSaveError(itemsError.message);
        return;
      }
    } else {
      // Create new invoice
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

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemRows.map((r) => ({ ...r, invoice_id: currentInvoiceId })));
      setSaveBusy(false);

      if (itemsError) {
        setSaveError(itemsError.message);
        return;
      }

      // Automatically deduct stock for any items linked to a product.
      // Only done on first save (new invoice) to avoid double-deducting on edits.
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
      {tab === tabKey ? (
        <Icon size={INLINE} color="#FFFFFF" strokeWidth={2} />
      ) : (
        <Icon size={INLINE} color={COLORS.muted} strokeWidth={2} />
      )}
      {label}
    </button>
  );

  const inputStyle: CSSProperties = {
    borderColor: COLORS.border,
    backgroundColor: '#FAFAF8',
    color: COLORS.navy,
    ...latinFont,
  };

  /* ============================================
     PREVIEW CONTENT (shared by preview tab + share export)
     ============================================ */
  const PreviewContent = () => (
    <div
      ref={previewRef}
      className="bg-white rounded-2xl p-5"
      style={{ boxShadow: '0 2px 8px rgba(24,41,62,0.06)' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <IconBadge icon={TrendingUp} size={INLINE} tint="invoice" shape="rounded" />
            <span className="text-lg font-extrabold" style={{ color: COLORS.navy, ...latinFont }}>
              {profile.business_name || 'KH Invoice'}
            </span>
          </div>
          <p className="text-xs" style={{ color: COLORS.muted }}>
            {profile.phone || ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold" style={{ color: COLORS.muted }}>
            {tr('វិក្កយបត្រ', 'INVOICE')}
          </p>
          <p className="text-sm font-bold" style={{ color: COLORS.navy, ...latinFont }}>
            #{invoiceNumber ? String(invoiceNumber).padStart(6, '0') : '------'}
          </p>
          <p className="text-xs" style={{ color: COLORS.muted, ...latinFont }}>
            {invoiceDate}
          </p>
        </div>
      </div>

      {/* Customer */}
      <div className="mb-4 pb-3 border-b" style={{ borderColor: COLORS.border }}>
        <p className="text-xs font-semibold" style={{ color: COLORS.muted }}>
          {tr('អតិថិជន', 'Bill To')}:
        </p>
        <p className="text-sm font-bold" style={{ color: COLORS.navy }}>
          {customerName || '---'}
        </p>
        {customerPhone && (
          <p className="text-xs" style={{ color: COLORS.muted, ...latinFont }}>
            {customerPhone}
          </p>
        )}
      </div>

      {/* Items table */}
      <table className="w-full mb-4" style={{ ...latinFont }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
            <th className="text-left text-xs font-bold pb-2" style={{ color: COLORS.muted }}>
              {tr('ការពិពណ៌នា', 'Description')}
            </th>
            <th className="text-right text-xs font-bold pb-2" style={{ color: COLORS.muted }}>
              {tr('ចំនួន', 'Qty')}
            </th>
            <th className="text-right text-xs font-bold pb-2" style={{ color: COLORS.muted }}>
              {tr('តម្លៃ', 'Price')}
            </th>
            <th className="text-right text-xs font-bold pb-2" style={{ color: COLORS.muted }}>
              {tr('សរុប', 'Total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items
            .filter((i) => i.description.trim())
            .map((item) => {
              const qty = parseFloat(item.quantity) || 0;
              const price = parseFloat(item.unit_price) || 0;
              return (
                <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td className="text-sm py-2" style={{ color: COLORS.navy }}>
                    {item.description}
                  </td>
                  <td className="text-sm text-right py-2" style={{ color: COLORS.navy }}>
                    {qty} {item.unit}
                  </td>
                  <td className="text-sm text-right py-2" style={{ color: COLORS.navy }}>
                    {fmtMoney(price, currency)}
                  </td>
                  <td className="text-sm text-right py-2 font-bold" style={{ color: COLORS.navy }}>
                    {fmtMoney(qty * price, currency)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-4">
        <div className="w-48 space-y-1.5" style={{ ...latinFont }}>
          <div className="flex justify-between text-xs">
            <span style={{ color: COLORS.muted }}>{tr('សរុបរង', 'Subtotal')}</span>
            <span className="font-bold" style={{ color: COLORS.navy }}>
              {fmtMoney(subtotal, currency)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: COLORS.muted }}>{tr('បានបង់', 'Paid')}</span>
            <span className="font-bold" style={{ color: COLORS.success }}>
              {fmtMoney(paid, currency)}
            </span>
          </div>
          <div
            className="flex justify-between text-sm pt-1.5 border-t"
            style={{ borderColor: COLORS.border }}
          >
            <span className="font-bold" style={{ color: COLORS.navy }}>
              {tr('នៅសល់', 'Balance')}
            </span>
            <span className="font-extrabold" style={{ color: COLORS.danger }}>
              {fmtMoney(balance, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="mb-4 pb-3 border-b" style={{ borderColor: COLORS.border }}>
          <p className="text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
            {tr('ប្រវត្តិទូទាត់', 'Payment History')}
          </p>
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between text-xs py-0.5">
              <span style={{ color: COLORS.navy, ...latinFont }}>
                {p.payment_date} {p.note ? `— ${p.note}` : ''}
              </span>
              <span className="font-semibold" style={{ color: COLORS.success, ...latinFont }}>
                +{fmtMoney(Number(p.amount), currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* QR + notes */}
      {(qrCodeUrl || notes) && (
        <div className="pt-3 border-t" style={{ borderColor: COLORS.border }}>
          {qrCodeUrl && (
            <div className="flex items-center gap-3 mb-2">
              <img
                src={qrCodeUrl}
                alt="Payment QR"
                className="w-20 h-20 rounded-lg border"
                style={{ borderColor: COLORS.border }}
                crossOrigin="anonymous"
              />
              <p className="text-xs" style={{ color: COLORS.muted }}>
                {tr('ស្កេន QR ដើម្បីបង់ប្រាក់', 'Scan QR to pay')}
              </p>
            </div>
          )}
          {notes && (
            <p className="text-xs" style={{ color: COLORS.muted }}>
              {tr('ចំណាំ', 'Notes')}: {notes}
            </p>
          )}
        </div>
      )}
    </div>
  );

  /* ============================================
     EDIT TAB
     ============================================ */
  const EditTab = () => (
    <div className="space-y-3">
      {/* Identity */}
      <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(12,68,124,0.08), 0 4px 12px rgba(12,68,124,0.06)', borderLeft: `4px solid ${COLORS.invoice}` }}>
        <div className="flex items-center gap-2 mb-3">
          <IconBadge icon={Hash} size={INLINE} tint="invoice" shape="rounded" />
          <p className="text-xs font-bold" style={{ color: COLORS.muted }}>
            {tr('អត្តសញ្ញាណ', 'Identity')}
          </p>
          <span className="ml-auto text-sm font-bold" style={{ color: COLORS.navy, ...latinFont }}>
            {invoiceNumber ? `#${String(invoiceNumber).padStart(6, '0')}` : tr('#ថ្មី', '#New')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.navy }}>
              {tr('ថ្ងៃទី', 'Date')}
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.navy }}>
              {tr('ថ្ងៃផុតកំណត់', 'Due Date')}
            </label>
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

      {/* Customer */}
      <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(12,68,124,0.08), 0 4px 12px rgba(12,68,124,0.06)', borderLeft: `4px solid ${COLORS.invoice}` }}>
        <div className="flex items-center gap-2 mb-3">
          <IconBadge icon={User} size={INLINE} tint="invoice" shape="rounded" />
          <p className="text-xs font-bold" style={{ color: COLORS.muted }}>
            {tr('ព័ត៌មានអតិថិជន', 'Customer Info')}
          </p>
        </div>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={tr('ឈ្មោះអតិថិជន', 'Customer name')}
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none mb-2"
          style={{ ...inputStyle, ...khmerFont }}
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

      {/* Items */}
      <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(12,68,124,0.08), 0 4px 12px rgba(12,68,124,0.06)', borderLeft: `4px solid ${COLORS.invoice}` }}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <IconBadge icon={Package} size={INLINE} tint="invoice" shape="rounded" />
            <p className="text-xs font-bold" style={{ color: COLORS.muted }}>
              {tr('បញ្ជីទំនិញ', 'Products')}
            </p>
          </div>
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: COLORS.invoice }}
          >
            <Plus size={INLINE} color={COLORS.invoice} strokeWidth={2} />
            {tr('បន្ថែមជួរ', 'Append Row')}
          </button>
        </div>

        {items.map((item, idx) => {
          const qty = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.unit_price) || 0;
          return (
            <div
              key={item.id}
              className="mb-3 p-3 rounded-lg border"
              style={{ borderColor: COLORS.border, backgroundColor: '#FAFAF8' }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold" style={{ color: COLORS.muted }}>
                  #{idx + 1}
                </span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(item.id)}>
                    <Trash2 size={INLINE} color={COLORS.danger} strokeWidth={2} />
                  </button>
                )}
              </div>
              {products.length > 0 && (
                <select
                  value={item.product_id || ''}
                  onChange={(e) => selectProductForItem(item.id, e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none mb-2"
                  style={{ ...inputStyle, color: item.product_id ? COLORS.navy : COLORS.muted }}
                >
                  <option value="">{tr('— ជ្រើសពីស្តុក (ស្រេចចិត្ត) —', '— Pick from stock (optional) —')}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.quantity} {p.unit} {tr('នៅសល់', 'left')})
                    </option>
                  ))}
                </select>
              )}
              <input
                value={item.description}
                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                placeholder={tr('ការពិពណ៌នា', 'Description')}
                className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none mb-2"
                style={{ ...inputStyle, ...khmerFont }}
              />
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold block mb-0.5" style={{ color: COLORS.muted }}>
                    {tr('ចំនួន', 'Qty')}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold block mb-0.5" style={{ color: COLORS.muted }}>
                    {tr('ឯកតា', 'Unit')}
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      className="flex-1 min-w-0 rounded-lg border px-1.5 py-2 text-sm outline-none"
                      style={inputStyle}
                    >
                      {[...DEFAULT_UNITS, ...customUnits.filter((u) => !DEFAULT_UNITS.includes(u))].map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setAddingUnitFor(addingUnitFor === item.id ? null : item.id)}
                      className="w-8 rounded-lg border font-bold flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: COLORS.border, backgroundColor: COLORS.goldTint, color: COLORS.goldDark }}
                    >
                      <Plus size={16} color={COLORS.goldDark} strokeWidth={2} />
                    </button>
                  </div>
                  {addingUnitFor === item.id && (
                    <div className="flex gap-1 mt-1">
                      <input
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                        placeholder={tr('ឯកតាថ្មី', 'New unit')}
                        className="flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none"
                        style={inputStyle}
                      />
                      <button
                        onClick={() => handleAddNewUnit(item.id)}
                        className="px-2.5 rounded-lg font-bold text-white text-xs"
                        style={{ backgroundColor: COLORS.navy }}
                      >
                        {tr('បន្ថែម', 'Add')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold block mb-0.5" style={{ color: COLORS.muted }}>
                    {tr('តម្លៃ', 'Price')}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold block mb-0.5" style={{ color: COLORS.muted }}>
                    {tr('សរុប', 'Total')}
                  </label>
                  <div
                    className="rounded-lg border px-2.5 py-2 text-sm font-bold text-right"
                    style={{ ...inputStyle, backgroundColor: COLORS.goldTint, color: COLORS.goldDark }}
                  >
                    {fmtMoney(qty * price, currency)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Currency + Notes */}
      <div className="bg-white rounded-2xl p-4 space-y-3" style={{ boxShadow: '0 1px 3px rgba(12,68,124,0.08), 0 4px 12px rgba(12,68,124,0.06)', borderLeft: `4px solid ${COLORS.invoice}` }}>
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: COLORS.navy }}>
            {tr('រូបិយប័ណ្ណ', 'Currency')}
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrency('USD')}
              className="flex-1 py-2.5 rounded-lg border text-sm font-bold"
              style={{
                borderColor: COLORS.border,
                backgroundColor: currency === 'USD' ? COLORS.gold : '#FAFAF8',
                color: currency === 'USD' ? '#FFFFFF' : COLORS.navy,
              }}
            >
              USD
            </button>
            <button
              onClick={() => setCurrency('KHR')}
              className="flex-1 py-2.5 rounded-lg border text-sm font-bold"
              style={{
                borderColor: COLORS.border,
                backgroundColor: currency === 'KHR' ? COLORS.gold : '#FAFAF8',
                color: currency === 'KHR' ? '#FFFFFF' : COLORS.navy,
              }}
            >
              KHR
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.navy }}>
            {tr('ចំណាំ', 'Notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={tr('ចំណាំផ្ទាល់ខ្លួន...', 'Additional notes...')}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
            style={{ ...inputStyle, ...khmerFont }}
          />
        </div>
      </div>

      {/* Ledger (payments) */}
      <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(12,68,124,0.08), 0 4px 12px rgba(12,68,124,0.06)', borderLeft: `4px solid ${COLORS.invoice}` }}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <IconBadge icon={Wallet} size={INLINE} tint="invoice" shape="rounded" />
            <p className="text-xs font-bold" style={{ color: COLORS.muted }}>
              {tr('បញ្ជីទូទាត់', 'Ledger')}
            </p>
          </div>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: COLORS.invoice }}
          >
            <Plus size={INLINE} color={COLORS.invoice} strokeWidth={2} />
            {tr('ការទូទាត់', 'Installment')}
          </button>
        </div>

        {!invoiceId && (
          <p className="text-xs" style={{ color: COLORS.muted }}>
            {tr('សូមរក្សាទុកវិក្កយបត្រជាមុនសិន ដើម្បីកត់ត្រាការទូទាត់', 'Save the invoice first to record payments')}
          </p>
        )}
        {invoiceId && paymentsLoading && (
          <p className="text-xs" style={{ color: COLORS.muted }}>
            {tr('កំពុងផ្ទុក...', 'Loading...')}
          </p>
        )}
        {invoiceId && !paymentsLoading && payments.length === 0 && (
          <p className="text-xs" style={{ color: COLORS.muted }}>
            {tr('មិនទាន់មានការទូទាត់នៅឡើយទេ', 'No payments recorded yet')}
          </p>
        )}
        {payments.map((p) => (
          <div
            key={p.id}
            className="flex justify-between items-center py-2 border-b last:border-b-0"
            style={{ borderColor: COLORS.border }}
          >
            <div>
              <p className="text-xs font-semibold" style={{ color: COLORS.navy, ...latinFont }}>
                {p.payment_date}
              </p>
              {p.note && (
                <p className="text-[11px]" style={{ color: COLORS.muted }}>
                  {p.note}
                </p>
              )}
            </div>
            <span className="text-sm font-bold" style={{ color: COLORS.success, ...latinFont }}>
              +{fmtMoney(Number(p.amount), currency)}
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-4 space-y-2" style={{ boxShadow: '0 1px 3px rgba(12,68,124,0.08), 0 4px 12px rgba(12,68,124,0.06)', borderLeft: `4px solid ${COLORS.invoice}` }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: COLORS.muted }}>{tr('សរុបរង', 'Subtotal')}</span>
          <span className="font-bold" style={{ color: COLORS.navy, ...latinFont }}>
            {fmtMoney(subtotal, currency)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: COLORS.muted }}>{tr('បានបង់', 'Paid')}</span>
          <span className="font-bold" style={{ color: COLORS.success, ...latinFont }}>
            {fmtMoney(paid, currency)}
          </span>
        </div>
        <div
          className="flex justify-between text-base pt-2 border-t"
          style={{ borderColor: COLORS.border }}
        >
          <span className="font-bold" style={{ color: COLORS.navy }}>
            {tr('នៅសល់', 'Balance')}
          </span>
          <span className="font-extrabold" style={{ color: COLORS.danger, ...latinFont }}>
            {fmtMoney(balance, currency)}
          </span>
        </div>
      </div>

      {/* QR button */}
      <button
        onClick={() => (qrCodeUrl ? setShowQR(true) : setShowQRUpload(true))}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold"
        style={{ borderColor: COLORS.border, backgroundColor: COLORS.goldTint, color: COLORS.goldDark }}
      >
        <QrCode size={INLINE} color={COLORS.goldDark} strokeWidth={2} />
        {qrCodeUrl
          ? tr('បង្ហាញ QR បង់ប្រាក់', 'Show Payment QR')
          : tr('បញ្ចូល QR បង់ប្រាក់', 'Upload Payment QR')}
      </button>

      {/* Error / Success */}
      {saveError && (
        <div
          className="p-2.5 rounded-lg border text-xs text-center"
          style={{ backgroundColor: COLORS.dangerTint, borderColor: '#F4A8A0', color: COLORS.danger }}
        >
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div
          className="p-2.5 rounded-lg border text-xs text-center"
          style={{ backgroundColor: COLORS.successTint, borderColor: '#7DD8A8', color: COLORS.success }}
        >
          {tr('រក្សាទុកបានជោគជ័យ!', 'Saved successfully!')} #{invoiceNumber && String(invoiceNumber).padStart(6, '0')}
        </div>
      )}

      {/* Save + Share */}
      <div className="flex gap-2 pb-4">
        <button
          onClick={handleSave}
          disabled={saveBusy}
          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-60"
          style={{ backgroundColor: COLORS.navy }}
        >
          <Save size={INLINE} color="#FFFFFF" strokeWidth={2} />
          {saveBusy ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុក', 'Save')}
        </button>
        <button
          onClick={handleShare}
          disabled={shareBusy}
          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-60"
          style={{ backgroundColor: COLORS.gold }}
        >
          <Share2 size={INLINE} color="#FFFFFF" strokeWidth={2} />
          {shareBusy ? tr('កំពុងបង្កើត...', 'Exporting...') : tr('ចែករំលែក', 'Share')}
        </button>
      </div>
    </div>
  );

  /* ============================================
     SPLIT TAB (edit + preview side by side)
     ============================================ */
  const SplitTab = () => (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-3" style={{ boxShadow: '0 1px 3px rgba(12,68,124,0.08), 0 4px 12px rgba(12,68,124,0.06)', borderLeft: `4px solid ${COLORS.invoice}` }}>
        <p className="text-xs font-bold mb-2" style={{ color: COLORS.muted }}>
          {tr('ការពិពណ៌នា', 'Quick Edit')}
        </p>
        {items.map((item, idx) => (
          <div key={item.id} className="flex gap-1.5 mb-2">
            <input
              value={item.description}
              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
              placeholder={`#${idx + 1}`}
              className="flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none"
              style={inputStyle}
            />
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
              className="w-12 rounded-lg border px-1 py-1.5 text-xs outline-none"
              style={inputStyle}
            />
            <input
              type="number"
              value={item.unit_price}
              onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
              className="w-16 rounded-lg border px-1 py-1.5 text-xs outline-none"
              style={inputStyle}
            />
            {items.length > 1 && (
              <button onClick={() => removeItem(item.id)}>
                <Trash2 size={16} color={COLORS.danger} strokeWidth={2} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addItem}
          className="flex items-center gap-1 text-xs font-bold mt-1"
          style={{ color: COLORS.gold }}
        >
          <Plus size={16} color={COLORS.gold} strokeWidth={2} />
          {tr('បន្ថែម', 'Add')}
        </button>
      </div>
      <PreviewContent />
    </div>
  );

  /* ============================================
     RECORD PAYMENT MODAL (Ledger installment)
     ============================================ */
  const PaymentModal = () =>
    isPaymentModalOpen ? (
      <div
        className="fixed inset-0 flex items-end z-50"
        style={{ backgroundColor: 'rgba(24,41,62,0.5)' }}
        onClick={() => setIsPaymentModalOpen(false)}
      >
        <div
          className="w-full bg-white rounded-t-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-4">
            <IconBadge icon={Wallet} size={INLINE} tint="invoice" shape="rounded" />
            <p className="text-sm font-bold" style={{ color: COLORS.navy }}>
              {tr('កត់ត្រាការទូទាត់', 'Record Payment')}
            </p>
          </div>

          <label className="text-xs font-semibold block mb-1.5" style={{ color: COLORS.navy }}>
            {tr('ថ្ងៃទី', 'Date')}
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none mb-3"
            style={inputStyle}
          />

          <label className="text-xs font-semibold block mb-1.5" style={{ color: COLORS.navy }}>
            {tr('ចំនួនទឹកប្រាក់', 'Amount')} ({currency})
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none mb-3"
            style={inputStyle}
          />

          <label className="text-xs font-semibold block mb-1.5" style={{ color: COLORS.navy }}>
            {tr('កំណត់ចំណាំ', 'Note')}
          </label>
          <input
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            placeholder={tr('ឧ. សាច់ប្រាក់, ABA', 'e.g. Cash, ABA Transfer')}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none mb-3"
            style={inputStyle}
          />

          {paymentError && (
            <div
              className="mb-3 p-2.5 rounded-lg border text-xs text-center"
              style={{ backgroundColor: COLORS.dangerTint, borderColor: '#F4A8A0', color: COLORS.danger }}
            >
              {paymentError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="flex-1 py-3 rounded-xl font-bold text-sm border"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              {tr('បោះបង់', 'Cancel')}
            </button>
            <button
              onClick={handleAddPayment}
              disabled={paymentBusy}
              className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60"
              style={{ backgroundColor: COLORS.invoice }}
            >
              {paymentBusy ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('បញ្ជាក់', 'Commit')}
            </button>
          </div>
        </div>
      </div>
    ) : null;

  /* ============================================
     QR MODAL
     ============================================ */
  const QRModal = () =>
    showQR && qrCodeUrl ? (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
        style={{ backgroundColor: 'rgba(24,41,62,0.5)' }}
        onClick={() => setShowQR(false)}
      >
        <div
          className="bg-white rounded-2xl p-6 max-w-xs w-full text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end mb-2">
            <button onClick={() => setShowQR(false)}>
              <X size={INLINE} color={COLORS.muted} strokeWidth={2} />
            </button>
          </div>
          <p className="text-sm font-bold mb-3" style={{ color: COLORS.navy }}>
            {tr('ស្កេន QR ដើម្បីបង់ប្រាក់', 'Scan QR to Pay')}
          </p>
          <img
            src={qrCodeUrl}
            alt="Payment QR"
            className="w-48 h-48 mx-auto rounded-xl border"
            style={{ borderColor: COLORS.border }}
            crossOrigin="anonymous"
          />
          <p className="text-xs mt-3" style={{ color: COLORS.muted }}>
            {profile.business_name || ''}
          </p>
        </div>
      </div>
    ) : null;

  /* ============================================
     QR UPLOAD MODAL
     ============================================ */
  const QRUploadModal = () =>
    showQRUpload ? (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
        style={{ backgroundColor: 'rgba(24,41,62,0.5)' }}
        onClick={() => setShowQRUpload(false)}
      >
        <div
          className="bg-white rounded-2xl p-6 max-w-xs w-full text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end mb-2">
            <button onClick={() => setShowQRUpload(false)}>
              <X size={INLINE} color={COLORS.muted} strokeWidth={2} />
            </button>
          </div>
          <IconBadge icon={Upload} size={ACTION} tint="invoice" shape="rounded" />
          <p className="text-sm font-bold mt-3 mb-4" style={{ color: COLORS.navy }}>
            {tr('បញ្ចូលរូបភាព QR', 'Upload QR Image')}
          </p>
          <input
            type="file"
            accept="image/*"
            disabled={qrUploadBusy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleQRUpload(file);
            }}
            className="hidden"
            id="qr-file-input"
          />
          <label
            htmlFor="qr-file-input"
            className="block w-full py-3 rounded-lg font-bold text-white text-sm cursor-pointer"
            style={{ backgroundColor: COLORS.navy }}
          >
            {qrUploadBusy
              ? tr('កំពុងបញ្ចូល...', 'Uploading...')
              : tr('ជ្រើសរើសរូបភាព', 'Choose Image')}
          </label>
        </div>
      </div>
    ) : null;

  /* ============================================
     MAIN RENDER
     ============================================ */
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.bgApp, ...khmerFont }}>
      {/* Header */}
      <div
        className="px-4 pt-5 pb-4 flex items-center gap-3"
        style={{
          background: `linear-gradient(135deg, ${COLORS.navyGradientStart}, ${COLORS.navyGradientEnd})`,
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <ArrowLeft size={INLINE} color="#FFFFFF" strokeWidth={2} />
        </button>
        <div>
          <p className="text-white font-bold text-base">{tr('វិក្កយបត្រ', 'Invoice')}</p>
          <p className="text-white/70 text-xs">{tr('បង្កើតវិក្កយបត្រថ្មី', 'Create a new invoice')}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 pt-3">
        <div
          className="flex rounded-xl border p-1 gap-1"
          style={{ borderColor: COLORS.border, backgroundColor: '#FAFAF8' }}
        >
          {tabBtn('edit', tr('កែសម្រួល', 'Edit'), Pencil)}
          {tabBtn('split', tr('ពុម្ព', 'Split'), SplitSquareHorizontal)}
          {tabBtn('preview', tr('មើល', 'Preview'), Eye)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {tab === 'edit' && <EditTab />}
        {tab === 'split' && <SplitTab />}
        {tab === 'preview' && <PreviewContent />}
      </div>

      <QRModal />
      <QRUploadModal />
      <PaymentModal />
    </div>
  );
}
