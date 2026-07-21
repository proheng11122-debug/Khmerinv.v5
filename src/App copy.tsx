import { useState, useEffect } from 'react'
import { Download, Check, FileText } from 'lucide-react'
import InstallModal from './InstallModal'
import './App.css'

type Platform = 'android' | 'ios'

const slides = [
  { src: 'https://images.pexels.com/photos/669454/pexels-photo-669454.jpeg?auto=compress&cs=tinysrgb&w=400', label: 'ផ្ទាំង Dashboard' },
  { src: 'https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg?auto=compress&cs=tinysrgb&w=400', label: 'បង្កើតវិក្កយបត្រ' },
  { src: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=400', label: 'គ្រប់គ្រងអតិថិជន' },
  { src: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400', label: 'របាយការណ៍' },
]

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'android'
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'android'
}

export default function App() {
  const [modal, setModal] = useState<Platform | null>(null)
  const [installed, setInstalled] = useState(false)
  const [deferred, setDeferred] = useState<any>(null)
  const [slide, setSlide] = useState(0)
  const platform = detectPlatform()

  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setDeferred(e) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setSlide(i => (i + 1) % slides.length), 3000)
    return () => clearInterval(t)
  }, [])

  const installAndroid = async () => {
    if (deferred) {
      deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
    } else {
      setModal('android')
    }
  }

  return (
    <div className="page">
      {/* ── TOP: Hero ── */}
      <section className="top">
        <div className="app-icon"><FileText size={44} strokeWidth={1.6} /></div>
        <h1 className="app-name khmer">KH Invoice</h1>
        <p className="app-tagline khmer">កម្មវិធីបង្កើត និងគ្រប់គ្រងវិក្កយបត្រ</p>

        {/* ── App description ── */}
        <div className="app-desc">
          <p className="app-desc-line khmer app-desc-main">បង្កើតវិក្កយបត្រ គ្រប់គ្រងស្ដុកដោយស្វ័យប្រវត្តិ</p>
          <p className="app-desc-line khmer">តាមដានចំណូលចំណាយ &amp;បំណុល គ្រប់ប្រភេទប្រចាំខែ</p>
          <p className="app-desc-line khmer app-desc-cta">បង្កើតគណនីអាឡូវនេះដើម្បីភាពងាយស្រួលគ្រប់គ្រងអាជីកម្មរបស់អ្នក</p>
        </div>
      </section>

      {/* ── MIDDLE: Screenshots ── */}
      <section className="middle">
        <div className="phone-shell">
          <div className="phone-notch" />
          <div className="phone-screen">
            {slides.map((s, i) => (
              <img
                key={i}
                src={s.src}
                alt={s.label}
                className={`phone-img ${i === slide ? 'visible' : ''}`}
                loading="lazy"
              />
            ))}
          </div>
          <div className="phone-label khmer">{slides[slide].label}</div>
        </div>
        <div className="slide-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`sdot ${i === slide ? 'on' : ''}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>

        <div className="install-row">
          <button
            className={`ibtn android ${installed ? 'done' : ''}`}
            onClick={installAndroid}
          >
            {installed ? <Check size={19} /> : <Download size={19} />}
            <span className="ibtn-label">
              <span className="ibtn-top">Install on</span>
              <span className="ibtn-bot">Android</span>
            </span>
          </button>
          <button className={`ibtn ios ${installed ? 'done' : ''}`} onClick={() => setModal('ios')}>
            {installed ? <Check size={19} /> : <Download size={19} />}
            <span className="ibtn-label">
              <span className="ibtn-top">Install on</span>
              <span className="ibtn-bot">iOS</span>
            </span>
          </button>
        </div>
      </section>

      {/* ── BOTTOM: Auth ── */}
      <section className="bottom">
        <p className="bottom-caption khmer">ចូលគណនី ឬ បង្កើតគណនីថ្មី ដើម្បីចាប់ផ្តើមប្រើប្រាស់</p>
        <div className="auth-row">
          <button className="auth-btn primary khmer">ចូលគណនី (Sign In)</button>
          <button className="auth-btn outline khmer">បង្កើតគណនី (Sign Up)</button>
        </div>
        <p className="bottom-note">KH Invoice © 2026 · Made in Cambodia</p>
      </section>

      {modal && <InstallModal platform={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
