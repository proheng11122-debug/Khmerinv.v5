import { useState } from 'react';
import { X, Clock, QrCode, Send, CheckCircle2, Crown, Hash, Calendar, Upload } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { COLORS, latinFont } from '../lib/theme';

type PlanKey = '1m' | '6m' | '1y';

const PLANS: { key: PlanKey; months: number; price: number; originalPrice?: number; labelKh: string; labelEn: string; tag?: string }[] = [
  { key: '1m', months: 1, price: 2, labelKh: '១ ខែ', labelEn: '1 Month' },
  { key: '6m', months: 6, price: 7, labelKh: '៦ ខែ', labelEn: '6 Months' },
  { key: '1y', months: 12, price: 14, originalPrice: 15, labelKh: '១ ឆ្នាំ', labelEn: '1 Year', tag: 'Best Value' },
];

interface Props {
  lang: 'KH' | 'EN';
  trialDaysRemaining: number;
  onClose: () => void;
  onOpenTelegram: () => void;
}

export default function SubscriptionModal({ lang, trialDaysRemaining, onClose, onOpenTelegram }: Props) {
  const tr = (kh: string, en: string) => (lang === 'KH' ? kh : en);
  const [selected, setSelected] = useState<PlanKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);

  const selectedPlan = PLANS.find((p) => p.key === selected) || null;

  const handleProofUpload = async (file: File) => {
    setProofUploading(true);
    setError('');
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setProofUploading(false);
      return;
    }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `subscription-proofs/${userData.user.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('qr-codes').upload(path, file, { upsert: true });
    if (uploadError) {
      setProofUploading(false);
      setError(uploadError.message);
      return;
    }
    const { data: pubData } = supabase.storage.from('qr-codes').getPublicUrl(path);
    setProofUrl(pubData.publicUrl);
    setProofUploading(false);
  };

  const handleConfirmPaid = async () => {
    if (!selectedPlan) return;
    if (!transactionId.trim()) {
      setError(tr('សូមបញ្ចូលលេខ Transaction ID ពី ABA', 'Please enter the ABA transaction ID'));
      return;
    }
    setError('');
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('subscription_requests').insert({
      user_id: userData.user?.id,
      plan: selectedPlan.key,
      amount: selectedPlan.price,
      transaction_id: transactionId.trim(),
      payment_date: paymentDate,
      proof_url: proofUrl,
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
      style={{ backgroundColor: 'rgba(18,48,58,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl w-full max-w-md max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 rounded-t-2xl"
          style={{ background: `linear-gradient(135deg, ${COLORS.navy} 0%, #185FA5 100%)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown size={20} color="#FFC94D" strokeWidth={2} />
              <p className="text-white font-bold text-sm">{tr('គម្រោងសមាជិកភាព', 'Subscription Plans')}</p>
            </div>
            <button onClick={onClose}>
              <X size={20} color="#FFFFFF" strokeWidth={2} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <Clock size={13} color="rgba(255,255,255,0.75)" strokeWidth={2} />
            <p className="text-white/75 text-[11px]">
              {trialDaysRemaining > 0
                ? tr(`សាកល្បងនៅសល់ ${trialDaysRemaining} ថ្ងៃ`, `${trialDaysRemaining} trial day${trialDaysRemaining === 1 ? '' : 's'} left`)
                : tr('ការសាកល្បងបានផុតកំណត់', 'Trial expired')}
            </p>
          </div>
        </div>

        <div className="p-4">
          {!submitted ? (
            <>
              {/* Plan cards */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PLANS.map((p) => {
                  const isSelected = selected === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setSelected(p.key)}
                      className="relative rounded-xl border-2 p-2.5 text-center"
                      style={{
                        borderColor: isSelected ? COLORS.gold : COLORS.border,
                        backgroundColor: isSelected ? COLORS.goldTint : '#FFFFFF',
                      }}
                    >
                      {p.tag && (
                        <span
                          className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white whitespace-nowrap"
                          style={{ backgroundColor: COLORS.gold }}
                        >
                          {p.tag}
                        </span>
                      )}
                      <p className="text-[11px] font-semibold mt-1" style={{ color: COLORS.navy }}>
                        {lang === 'KH' ? p.labelKh : p.labelEn}
                      </p>
                      {p.originalPrice && (
                        <p className="text-[10px] line-through" style={{ color: COLORS.muted, ...latinFont }}>
                          ${p.originalPrice}
                        </p>
                      )}
                      <p className="text-base font-extrabold mt-0.5" style={{ color: COLORS.gold, ...latinFont }}>
                        ${p.price}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* QR + pay */}
              {selectedPlan && (
                <div className="rounded-xl border p-3.5" style={{ borderColor: COLORS.border, backgroundColor: COLORS.bgApp }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <QrCode size={16} color={COLORS.navy} strokeWidth={2} />
                    <p className="text-xs font-bold" style={{ color: COLORS.navy }}>
                      {tr('ស្កេនទូទាត់', 'Scan to Pay')} —{' '}
                      <span style={latinFont}>${selectedPlan.price}</span>
                    </p>
                  </div>
                  <div className="flex justify-center mb-3">
                    <img
                      src="/subscription-qr.png"
                      alt="Payment QR"
                      className="w-40 h-40 rounded-lg border object-cover"
                      style={{ borderColor: COLORS.border }}
                    />
                  </div>

                  {/* Verification — the ABA QR's transaction ID is different every
                      time even though the payee name stays the same, so we ask
                      for it here to make manual verification against the bank
                      statement fast and unambiguous. */}
                  <div className="space-y-2.5 mb-3">
                    <div>
                      <label className="text-[11px] font-semibold flex items-center gap-1 mb-1" style={{ color: COLORS.navy }}>
                        <Calendar size={12} color={COLORS.navy} strokeWidth={2} />
                        {tr('ថ្ងៃទីបានទូទាត់', 'Payment Date')}
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none"
                        style={{ borderColor: COLORS.border, backgroundColor: '#FFFFFF', color: COLORS.navy }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold flex items-center gap-1 mb-1" style={{ color: COLORS.navy }}>
                        <Hash size={12} color={COLORS.navy} strokeWidth={2} />
                        {tr('Transaction ID (ពី ABA)', 'Transaction ID (from ABA)')}
                      </label>
                      <input
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder={tr('ចម្លងពី App ABA ក្រោយបង់ប្រាក់', 'Copy from the ABA app after paying')}
                        className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none"
                        style={{ borderColor: COLORS.border, backgroundColor: '#FFFFFF', color: COLORS.navy, ...latinFont }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold flex items-center gap-1 mb-1" style={{ color: COLORS.navy }}>
                        <Upload size={12} color={COLORS.navy} strokeWidth={2} />
                        {tr('រូបភាពបញ្ជាក់ (ស្រេចចិត្ត)', 'Receipt Screenshot (optional)')}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={proofUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProofUpload(file);
                        }}
                        className="hidden"
                        id="subscription-proof-upload"
                      />
                      <label
                        htmlFor="subscription-proof-upload"
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{ borderColor: COLORS.border, color: COLORS.navy, backgroundColor: '#FFFFFF' }}
                      >
                        {proofUploading ? (
                          tr('កំពុងផ្ទុកឡើង...', 'Uploading...')
                        ) : proofUrl ? (
                          <>
                            <CheckCircle2 size={13} color={COLORS.success} strokeWidth={2} />
                            {tr('បានផ្ទុករូបភាពរួច', 'Screenshot uploaded')}
                          </>
                        ) : (
                          tr('ជ្រើសរើសរូបភាព', 'Choose Image')
                        )}
                      </label>
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs mb-2 text-center" style={{ color: COLORS.danger }}>
                      {error}
                    </p>
                  )}

                  <button
                    onClick={handleConfirmPaid}
                    disabled={busy}
                    className="w-full py-2.5 rounded-lg font-bold text-white text-xs mb-2 disabled:opacity-60"
                    style={{ backgroundColor: COLORS.success }}
                  >
                    {busy ? tr('កំពុងបញ្ជូន...', 'Sending...') : tr('ខ្ញុំបានទូទាត់រួច', "I've Paid")}
                  </button>
                  <button
                    onClick={onOpenTelegram}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold"
                    style={{ borderColor: COLORS.border, color: COLORS.goldDark }}
                  >
                    <Send size={13} color={COLORS.goldDark} strokeWidth={2} />
                    {tr('ជូនដំណឹង Admin (Telegram)', 'Notify Admin (Telegram)')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 size={40} color={COLORS.success} strokeWidth={1.5} className="mx-auto" />
              <p className="text-sm font-bold mt-3" style={{ color: COLORS.navy }}>
                {tr('បានទទួលសំណើរបស់អ្នក', 'Request received')}
              </p>
              <p className="text-xs mt-1 px-4" style={{ color: COLORS.muted }}>
                {tr(
                  'សូមរង់ចាំការផ្ទៀងផ្ទាត់ពី Admin (ជាធម្មតាក្នុងរយៈពេលពីរបីម៉ោង)។ ជូនដំណឹង Telegram ដើម្បីលឿនជាង។',
                  'Please wait for admin verification (usually within a few hours). Notify via Telegram for faster confirmation.'
                )}
              </p>
              <button
                onClick={onOpenTelegram}
                className="mt-4 mr-2 px-4 py-2 rounded-lg font-bold text-xs border inline-flex items-center gap-1.5"
                style={{ borderColor: COLORS.border, color: COLORS.goldDark }}
              >
                <Send size={13} color={COLORS.goldDark} strokeWidth={2} />
                {tr('ជូនដំណឹង Telegram', 'Notify on Telegram')}
              </button>
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2 rounded-lg font-bold text-xs text-white"
                style={{ backgroundColor: COLORS.navy }}
              >
                {tr('បិទ', 'Close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
