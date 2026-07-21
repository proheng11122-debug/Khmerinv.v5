import { useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import './InstallModal.css'

type Platform = 'android' | 'ios'

const androidSteps = [
  {
    title: 'បើក Chrome Browser',
    sub: 'Open Chrome',
    desc: 'បើកកម្មវិធី Chrome នៅលើទូរស័ព្ទ Android របស់អ្នក។ បន្ទាប់មកចូលទៅកាន់គេហទំព័រ KH Invoice។'
  },
  {
    title: 'ចុចលើប៊ូតុងម៉ឺនុយ',
    sub: 'Tap menu (⋮)',
    desc: 'ចុចលើរូបតំណាង⋮ នៅផ្នែកខាងស្ដាំផ្នែកខាងលើនៃ Chrome។'
  },
  {
    title: 'ជ្រើសរើស "Add to Home screen"',
    sub: 'Choose Install app',
    desc: 'រំកិលចុះ ហើយជ្រើសរើស "Add to Home screen" ឬ "Install app" ដើម្បីដំឡើង KH Invoice ទៅក្នុងទូរស័ព្ទ។'
  },
  {
    title: 'បញ្ជាក់ដំឡើង',
    sub: 'Confirm install',
    desc: 'ចុច "Install" ដើម្បីបញ្ជាក់។ រូបតំណាង KH Invoice នឹងបង្ហាញនៅលើ home screen របស់អ្នក។'
  }
]

const iosSteps = [
  {
    title: 'បើក Safari',
    sub: 'Open Safari',
    desc: 'បើកកម្មវិធី Safari នៅលើ iPhone ឬ iPad របស់អ្នក។ បន្ទាប់មកចូលទៅកាន់គេហទំព័រ KH Invoice។'
  },
  {
    title: 'ចុចប៊ូតុង Share',
    sub: 'Tap Share',
    desc: 'ចុចលើរូបតំណាង Share (ការ៉េមានព្រួលឡើងលើ) នៅផ្នែកខាងក្រោម ឬខាងស្ដាំផ្នែកខាងលើនៃ Safari។'
  },
  {
    title: 'ជ្រើសរើស "Add to Home Screen"',
    sub: 'Choose Add to Home Screen',
    desc: 'រំកិលចុះក្នុងបញ្ជី Share ហើយជ្រើសរើស "Add to Home Screen"។'
  },
  {
    title: 'បញ្ជាក់ដោយចុច "Add"',
    sub: 'Tap Add',
    desc: 'ចុច "Add" នៅផ្នែកខាងស្ដាំផ្នែកខាងលើ។ KH Invoice នឹងត្រូវបានបន្ថែមទៅ home screen របស់អ្នក។'
  }
]

export default function InstallModal({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  const steps = platform === 'ios' ? iosSteps : androidSteps
  const [openStep, setOpenStep] = useState<number | null>(0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-head">
          <span className={`modal-badge ${platform}`}>
            {platform === 'ios' ? 'iOS' : 'Android'}
          </span>
          <h2 className="modal-title">
            {platform === 'ios' ? 'របៀបដំឡើងនៅលើ iOS' : 'របៀបដំឡើងនៅលើ Android'}
          </h2>
          <button className="modal-x" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="modal-sub">
          {platform === 'ios'
            ? 'ដើម្បីដំឡើង KH Invoice នៅលើ iPhone ឬ iPad សូមធ្វើតាមជំហានខាងក្រោម។'
            : 'ដើម្បីដំឡើង KH Invoice នៅលើ Android សូមធ្វើតាមជំហានខាងក្រោម។'}
        </p>

        <div className="modal-steps">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`mstep ${openStep === i ? 'active' : ''}`}
              onClick={() => setOpenStep(openStep === i ? null : i)}
            >
              <div className="mstep-row">
                <div className={`mstep-num ${openStep === i ? 'on' : ''}`}>{i + 1}</div>
                <div className="mstep-labels">
                  <div className="mstep-title khmer">{s.title}</div>
                  <div className="mstep-sub">{s.sub}</div>
                </div>
                <ChevronRight
                  size={18}
                  style={{
                    transform: openStep === i ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s',
                    color: '#94a3b8'
                  }}
                />
              </div>
              {openStep === i && (
                <div className="mstep-desc khmer">{s.desc}</div>
              )}
            </div>
          ))}
        </div>

        <button className="modal-ok khmer" onClick={onClose}>
          យល់បានហើយ
        </button>
      </div>
    </div>
  )
}
