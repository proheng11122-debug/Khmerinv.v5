import { useState } from 'react';
import type { CSSProperties } from 'react';
import { X, Clock, QrCode, Send, CheckCircle2, Crown } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { COLORS, latinFont } from '../lib/theme';


type PlanKey = '1m' | '6m' | '1y';

const PLANS: { key: PlanKey; months: number; price: number; labelKh: string; labelEn: string; tag?: string }[] = [
  { key: '1m', months: 1, price: 2, labelKh: '១ ខែ', labelEn: '1 Month' },
  { key: '6m', months: 6, price: 7, labelKh: '៦ ខែ', labelEn: '6 Months' },
  { key: '1y', months: 12, price: 15, labelKh: '១ ឆ្នាំ', labelEn: '1 Year', tag: 'Best Value' },
];

// Each ABA KHQR code has its amount baked in, so every plan needs its own
// matching QR image. Drop new files in /public and add the path here.
const QR_BY_PLAN: Record<PlanKey, string | null> = {
  '1m': '/qr-1m.jpg',
  '6m': null,
  '1y': null,
};

const PAYEE_NAME = 'PANG SOK HENG';
const PAYEE_ACCOUNT = '900 999 998';

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

  const selectedPlan = PLANS.find((p) => p.key === selected) || null;

  const handleConfirmPaid = async () => {
    if (!selectedPlan) return;
    setError('');
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('subscription_requests').insert({
      user_id: userData.user?.id,
      plan: selectedPlan.key,
      amount: selectedPlan.price,
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
                      <p className="text-base font-extrabold mt-0.5" style={{ color: COLORS.gold, ...latinFont }}>
                        ${p.price}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* QR + pay */}
              {selectedPlan && (
                <div>
                  <div
                    className="rounded-2xl overflow-hidden mb-3"
                    style={{ border: `1px solid ${COLORS.border}`, boxShadow: '0 6px 16px rgba(12,68,124,0.10)' }}
                  >
                    {/* Card header strip */}
                    <div
                      className="px-4 py-2.5 flex items-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${COLORS.navy} 0%, #185FA5 100%)` }}
                    >
                      <QrCode size={15} color="#FFFFFF" strokeWidth={2} />
                      <p className="text-white text-[11px] font-bold">
                        {tr('ស្កេនទូទាត់ (KHQR)', 'Scan to Pay (KHQR)')}
                      </p>
                    </div>

                    {/* Payee + amount */}
                    <div className="bg-white pt-3.5 pb-3 text-center px-4">
                      <p className="text-[10px] font-semibold tracking-wide" style={{ color: COLORS.muted }}>
                        {PAYEE_NAME}
                      </p>
                      <p className="text-[26px] leading-tight font-extrabold mt-0.5" style={{ color: COLORS.gold, ...latinFont }}>
                        ${selectedPlan.price}
                        <span className="text-xs font-semibold ml-1" style={{ color: COLORS.muted }}>USD</span>
                      </p>
                    </div>

                    {/* Dashed divider like a real payment ticket */}
                    <div className="mx-4 border-t border-dashed" style={{ borderColor: COLORS.border }} />

                    {/* QR code */}
                    <div className="bg-white flex justify-center py-4">
                      {QR_BY_PLAN[selectedPlan.key] ? (
                        <img
                          src={QR_BY_PLAN[selectedPlan.key]!}
                          alt="Payment QR"
                          className="w-44 h-44 rounded-lg object-contain"
                        />
                      ) : (
                        <div
                          className="w-44 h-44 rounded-lg flex items-center justify-center text-center text-[11px] p-4"
                          style={{ backgroundColor: COLORS.bgApp, color: COLORS.muted }}
                        >
                          {tr(
                            'QR សម្រាប់គម្រោងនេះមិនទាន់មាន សូមទាក់ទង Admin ខាងក្រោម',
                            'QR for this plan is not set up yet — please contact admin below'
                          )}
                        </div>
                      )}
                    </div>

                    {/* Account number footer */}
                    <div className="bg-white px-4 pb-3.5 text-center">
                      <p className="text-[10px]" style={{ color: COLORS.muted }}>
                        {tr('គណនី USD', 'USD Account')}:{' '}
                        <span className="font-semibold" style={{ color: COLORS.navy, ...latinFont }}>{PAYEE_ACCOUNT}</span>
                      </p>
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
