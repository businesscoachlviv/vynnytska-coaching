// app.jsx — interactivity + modal form + Tweaks panel

const { useState, useEffect, useRef } = React;

// ============ SCROLL REVEAL ============
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
}

// ============ STAT COUNTERS ============
function initCounters() {
  const els = document.querySelectorAll('[data-count-to]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.countTo, 10);
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = Math.round(target * eased);
        el.textContent = v >= 1000 ? v.toLocaleString('uk-UA').replace(/\u00A0/g,' ') : String(v);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.4 });
  els.forEach(el => io.observe(el));
}

// ============ STICKY CTA ============
function initStickyCta() {
  const el = document.getElementById('stickyCta');
  if (!el) return;
  let last = 0;
  const onScroll = () => {
    const y = window.scrollY;
    const show = y > 600 && y < (document.documentElement.scrollHeight - window.innerHeight - 400);
    el.classList.toggle('visible', show);
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
    last = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ============ SEAT DOTS ============
function renderSeatDots(taken) {
  document.querySelectorAll('[data-seats-dots]').forEach(host => {
    host.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < taken ? ' taken' : '');
      host.appendChild(d);
    }
  });
}

// ============ MODAL FORM ============
const TELEGRAM_URL = 'https://t.me/oksanavynnytska';
const FORM_URL = 'https://docs.google.com/forms/d/1yqNlkcOmK_R9URjBRWIOUuL8QTuQyc3rnDToSwnb0dg/viewform';

function ModalForm({ open, onClose, seats }) {
  const [sent, setSent] = useState(false);
  const [data, setData] = useState({ name: '', phone: '' });

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Reset when opening fresh
  useEffect(() => {
    if (open) { setSent(false); }
  }, [open]);

  if (!open) return null;

  const update = (k, v) => setData(d => ({ ...d, [k]: v }));
  const canSubmit = data.name.trim() && data.phone.trim().length >= 5;

  const buildMessage = () =>
    `Вітаю! Я ${data.name}, мій номер: ${data.phone}. Хочу записатися на стратегічну сесію за $20.`;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;

    const msg = buildMessage();

    // 1) Save lead locally as a backup (in case any tracker / pixel needs it)
    try {
      const leads = JSON.parse(localStorage.getItem('ov_leads') || '[]');
      leads.push({ ...data, ts: new Date().toISOString() });
      localStorage.setItem('ov_leads', JSON.stringify(leads));
    } catch {}

    // 2) Fire a conversion event so ad pixels (FB/Google) can hook in
    window.dispatchEvent(new CustomEvent('ov:lead-submitted', { detail: data }));

    // 3) Copy message to clipboard so user can paste it into Telegram
    try {
      await navigator.clipboard.writeText(msg);
    } catch {}

    // 4) Open Telegram in a new tab
    window.open(TELEGRAM_URL, '_blank', 'noopener');

    setSent(true);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button className="modal-close" onClick={onClose} aria-label="Закрити">✕</button>

        {sent ? (
          <div className="modal-success">
            <div className="success-mark">✓</div>
            <h3 id="modalTitle">Дякую, {data.name || 'друже'}!</h3>
            <p>Зараз відкрився Telegram. Повідомлення вже скопійовано — просто вставте і&nbsp;надішліть мені. Я&nbsp;особисто відповім протягом 24&nbsp;годин.</p>
            <div className="success-message">
              <div className="success-message-label">Скопійоване повідомлення:</div>
              <div className="success-message-text">{buildMessage()}</div>
              <button type="button" className="success-copy" onClick={async () => {
                try { await navigator.clipboard.writeText(buildMessage()); } catch {}
              }}>📋 Скопіювати ще раз</button>
            </div>
            <a className="btn btn-lg" href={TELEGRAM_URL} target="_blank" rel="noopener">
              <span>Відкрити Telegram</span>
              <span className="arrow" aria-hidden="true">→</span>
            </a>
          </div>
        ) : (
          <div className="modal-inner">
            <div className="modal-head">
              <div>
                <div className="modal-eyebrow">Заявка · стратегічна сесія</div>
                <h3 id="modalTitle">Залиште ім'я і&nbsp;телефон.</h3>
                <p className="modal-sub">Натисніть «Подати заявку» — і&nbsp;відкриється Telegram, де&nbsp;я&nbsp;особисто підтверджу зручний час сесії.</p>
              </div>
              <div className="modal-price">
                <div className="was">$350</div>
                <div className="now">$20</div>
                <div className="seats-tag">Місць: <b>{seats}/10</b></div>
              </div>
            </div>

            <form className="modal-form" onSubmit={submit}>
              <div className="form-field">
                <label>Ваше ім'я *</label>
                <input type="text" value={data.name} onChange={e=>update('name', e.target.value)} placeholder="Як до вас звертатися" required autoFocus />
              </div>
              <div className="form-field">
                <label>Телефон *</label>
                <input type="tel" value={data.phone} onChange={e=>update('phone', e.target.value)} placeholder="+380…" required />
              </div>

              <div className="modal-nav">
                <div className="privacy">Натискаючи кнопку, ви&nbsp;погоджуєтесь на&nbsp;обробку даних. Я&nbsp;не&nbsp;спамлю — пишу особисто лише раз, щоб домовитись про&nbsp;сесію.</div>
                <div className="modal-nav-btns">
                  <button type="submit" className="btn btn-lg" disabled={!canSubmit}>
                    <span>Подати заявку · $20</span>
                    <span className="arrow" aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ TWEAKS UI ============
const TWEAK_DEFAULTS = window.__TWEAKS__ || {
  theme: 'dark',
  accent: '#F26B1F',
  seatsRemaining: 7,
  heroVariant: 'split',
  fontScale: 1.0,
  photoTone: 'natural'
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [open, setOpen] = useState(false);

  // Apply tweaks to DOM
  useEffect(() => {
    document.documentElement.style.setProperty('--orange', t.accent);
    // derive lighter accent for hover
    document.documentElement.style.setProperty('--orange-2', t.accent);

    document.body.dataset.theme = t.theme;
    if (t.theme === 'light') {
      document.documentElement.style.setProperty('--ink', '#1a1a1c');
      // we keep dark sections as-is for rhythm
    }

    document.documentElement.style.fontSize = (16 * t.fontScale) + 'px';

    // photo tone
    const heroPhoto = document.querySelector('[data-photo-tone]');
    if (heroPhoto) {
      const tones = {
        natural: 'contrast(1.02) saturate(0.95)',
        bw: 'grayscale(1) contrast(1.1)',
        warm: 'sepia(0.25) saturate(1.1) contrast(1.05)',
        moody: 'contrast(1.15) saturate(0.6) brightness(0.85)',
      };
      heroPhoto.style.filter = tones[t.photoTone] || tones.natural;
    }

    // seats
    document.querySelectorAll('[data-seats-count]').forEach(el => el.textContent = String(t.seatsRemaining));
    renderSeatDots(10 - t.seatsRemaining);
  }, [t.accent, t.theme, t.fontScale, t.photoTone, t.seatsRemaining]);

  useEffect(() => {
    initReveal();
    initCounters();
    initStickyCta();
    // Open Google Form in new tab on CTA click
    const handler = (e) => {
      e?.preventDefault?.();
      // Fire conversion event so ad pixels (FB/Google) can hook in
      window.dispatchEvent(new CustomEvent('ov:cta-click', { detail: { target: 'google-form' } }));
      window.open(FORM_URL, '_blank', 'noopener');
    };
    document.querySelectorAll('[data-open-form]').forEach(b => b.addEventListener('click', handler));
    return () => {
      document.querySelectorAll('[data-open-form]').forEach(b => b.removeEventListener('click', handler));
    };
  }, []);

  return (
    <>
      <ModalForm open={open} onClose={()=>setOpen(false)} seats={t.seatsRemaining} />
      <TweaksPanel>
        <TweakSection label="Брендинг" />
        <TweakColor
          label="Акцентний колір"
          value={t.accent}
          options={['#F26B1F', '#E94E1B', '#FF9A1F', '#D4AF37', '#1F8A5B']}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakRadio
          label="Тема"
          value={t.theme}
          options={['dark', 'light']}
          onChange={(v) => setTweak('theme', v)}
        />
        <TweakSlider
          label="Масштаб шрифту"
          value={t.fontScale}
          min={0.9} max={1.1} step={0.05}
          onChange={(v) => setTweak('fontScale', v)}
        />

        <TweakSection label="Hero" />
        <TweakSelect
          label="Обробка фото"
          value={t.photoTone}
          options={[
            { value: 'natural', label: 'Натуральне' },
            { value: 'bw', label: 'Чорно-біле' },
            { value: 'warm', label: 'Теплий тон' },
            { value: 'moody', label: 'Кінематографічне' },
          ]}
          onChange={(v) => setTweak('photoTone', v)}
        />

        <TweakSection label="Заклик до дії" />
        <TweakSlider
          label="Місць залишилось"
          value={t.seatsRemaining}
          min={1} max={10} step={1} unit="/10"
          onChange={(v) => setTweak('seatsRemaining', v)}
        />

        <TweakSection label="Дії" />
        <TweakButton label="Відкрити анкету (Google Forms)" onClick={() => window.open(FORM_URL, '_blank', 'noopener')} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<App />);
