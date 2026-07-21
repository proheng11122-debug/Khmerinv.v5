import { useState } from 'react'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react'
import './Welcome.css'

type Mode = 'signin' | 'signup'

export default function Welcome({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [showPwd, setShowPwd] = useState(false)
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !pwd.trim()) {
      setError('សូមបំពេញអ៊ីមែល និងពាក្យសម្ងាត់។')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      setError('សូមបំពេញឈ្មោះរបស់អ្នក។')
      return
    }
    if (mode === 'signup' && !agree) {
      setError('សូមព្រមទទួលយកលក្ខខណ្ឌប្រើប្រាស់។')
      return
    }

    setLoading(true)
    // Simulated auth — replace with Supabase auth later
    setTimeout(() => {
      setLoading(false)
      setError(null)
      alert(mode === 'signin' ? 'ចូលគណនីបានជោគជ័យ!' : 'បង្កើតគណនីបានជោគជ័យ!')
    }, 900)
  }

  return (
    <div className="welcome-page">
      {/* Header */}
      <header className="welcome-header">
        <button className="welcome-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="welcome-logo">
          <div className="welcome-logo-icon">KH</div>
        </div>
      </header>

      {/* Hero */}
      <section className="welcome-hero">
        <h1 className="welcome-title khmer">
          {mode === 'signin' ? 'ស្វាគមន៍មកវិញ!' : 'បង្កើតគណនី'}
        </h1>
        <p className="welcome-sub khmer">
          {mode === 'signin'
            ? 'ចូលគណនីដើម្បីបន្តគ្រប់គ្រងវិក្កយបត្ររបស់អ្នក។'
            : 'ចុះឈ្មោះដើម្បីចាប់ផ្តើមប្រើ KH Invoice ភ្លាមៗ។'}
        </p>
      </section>

      {/* Tab switch */}
      <div className="welcome-tabs">
        <button
          className={`wtab ${mode === 'signin' ? 'on' : ''} khmer`}
          onClick={() => { setMode('signin'); setError(null) }}
        >
          ចូលគណនី
        </button>
        <button
          className={`wtab ${mode === 'signup' ? 'on' : ''} khmer`}
          onClick={() => { setMode('signup'); setError(null) }}
        >
          បង្កើតគណនី
        </button>
        <div
          className="wtab-indicator"
          style={{ transform: mode === 'signin' ? 'translateX(0%)' : 'translateX(100%)' }}
        />
      </div>

      {/* Form */}
      <form className="welcome-form" onSubmit={submit}>
        {mode === 'signup' && (
          <label className="wfield">
            <span className="wfield-label khmer">ឈ្មោះពេញ</span>
            <div className="wfield-input-wrap">
              <User size={18} className="wfield-icon" />
              <input
                type="text"
                className="wfield-input khmer"
                placeholder="បញ្ចូលឈ្មោះរបស់អ្នក"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          </label>
        )}

        <label className="wfield">
          <span className="wfield-label khmer">អ៊ីមែល</span>
          <div className="wfield-input-wrap">
            <Mail size={18} className="wfield-icon" />
            <input
              type="email"
              className="wfield-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </label>

        <label className="wfield">
          <span className="wfield-label khmer">ពាក្យសម្ងាត់</span>
          <div className="wfield-input-wrap">
            <Lock size={18} className="wfield-icon" />
            <input
              type={showPwd ? 'text' : 'password'}
              className="wfield-input"
              placeholder="••••••••"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              className="wfield-eye"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {mode === 'signup' && (
          <label className="wcheck">
            <button
              type="button"
              className={`wcheck-box ${agree ? 'on' : ''}`}
              onClick={() => setAgree((a) => !a)}
              aria-pressed={agree}
            >
              {agree && <Check size={13} strokeWidth={3} />}
            </button>
            <span className="wcheck-label khmer">
              ខ្ញុំយល់ព្រមនឹង <a href="#" className="wlink">លក្ខខណ្ឌប្រើប្រាស់</a> និង <a href="#" className="wlink">គោលការណ៍ឯកជនភាព</a>។
            </span>
          </label>
        )}

        {error && <div className="werror khmer">{error}</div>}

        <button
          type="submit"
          className="wsubmit khmer"
          disabled={loading}
        >
          {loading ? (
            <span className="wspinner" />
          ) : mode === 'signin' ? (
            'ចូលគណនី'
          ) : (
            'បង្កើតគណនី'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="wdivider">
        <span className="wdivider-line" />
        <span className="wdivider-text">ឬ</span>
        <span className="wdivider-line" />
      </div>

      {/* Social (placeholder) */}
      <div className="wsocial-row">
        <button className="wsocial" aria-label="Continue with Google">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          <span className="khmer">បន្តជាមួយ Google</span>
        </button>
      </div>

      <p className="welcome-foot khmer">
        {mode === 'signin' ? 'មិនទាន់មានគណនី? ' : 'មានគណនីរួចហើយ? '}
        <button
          type="button"
          className="wlink-btn khmer"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
        >
          {mode === 'signin' ? 'បង្កើតគណនី' : 'ចូលគណនី'}
        </button>
      </p>
    </div>
  )
}
