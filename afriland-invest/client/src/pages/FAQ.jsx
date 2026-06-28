import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import api from '../lib/api';
import { useLanguage, LangToggle } from '../contexts/LanguageContext.jsx';

export default function FAQ() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(null);
  const [lienTelegram, setLienTelegram] = useState('https://t.me/gifetalpro');
  const [lienWhatsappGroupe, setLienWhatsappGroupe] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/settings/public').then(res => {
      if (res.data.lien_telegram) setLienTelegram(res.data.lien_telegram);
      if (res.data.lien_whatsapp_groupe) setLienWhatsappGroupe(res.data.lien_whatsapp_groupe);
    }).catch(() => {});
  }, []);

  const faqItems = t('faq_items');

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 90 }}>

      <div style={{ padding: '50px 16px 70px', position: 'relative', overflow: 'hidden', minHeight: 190 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #E07800 0%, #FF9500 100%)' }} />
        <img src="/payfast-bg.jpg" alt="" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', height: '80%', width: 'auto',
          objectFit: 'contain', mixBlendMode: 'multiply',
        }} />
        <button onClick={() => navigate('/')} style={{
          position: 'absolute', top: 14, left: 16, zIndex: 3,
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="fas fa-arrow-left" style={{ fontSize: 14 }} />
        </button>
        <LangToggle style={{ position: 'absolute', top: 14, right: 16, zIndex: 3 }} />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', paddingTop: 8 }}>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {t('help_center')}
          </p>
          <p style={{ color: '#fff', fontSize: 26, fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
            {t('frequent_questions')}
          </p>
        </div>
      </div>

      <div style={{ margin: '-40px 16px 0', position: 'relative', zIndex: 10 }}>

        <div style={{ background: '#fff', borderRadius: 20, padding: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg,#E07800,#FF9500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className="fas fa-headset" style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A' }}>{t('need_help')}</p>
              <p style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{t('contact_support_msg')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={lienTelegram} target="_blank" rel="noreferrer" style={{
              flex: 1, minWidth: 120,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 14px', borderRadius: 50,
              background: 'linear-gradient(135deg,#229ED9,#1a7fb5)',
              color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
              boxShadow: '0 3px 10px rgba(34,158,217,0.4)',
            }}>
              <i className="fab fa-telegram" style={{ fontSize: 16 }} /> Telegram
            </a>
            {lienWhatsappGroupe && (
              <a href={lienWhatsappGroupe} target="_blank" rel="noreferrer" style={{
                flex: 1, minWidth: 120,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 14px', borderRadius: 50,
                background: 'linear-gradient(135deg,#25D366,#1aaa52)',
                color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
                boxShadow: '0 3px 10px rgba(37,211,102,0.4)',
              }}>
                <i className="fab fa-whatsapp" style={{ fontSize: 16 }} /> WhatsApp
              </a>
            )}
          </div>
        </div>

        {faqItems.map((faq, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 20, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', padding: '16px 18px',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, overflow: 'hidden' }}>
                <img src="/payfast-bg.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: '#1A1A1A', lineHeight: 1.4 }}>
                {faq.q}
              </span>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: open === i ? '#FF950015' : '#F5F1E8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s',
              }}>
                <i className={`fas fa-chevron-${open === i ? 'up' : 'down'}`} style={{ color: open === i ? '#FF9500' : '#999', fontSize: 11 }} />
              </div>
            </button>

            {open === i && (
              <div style={{ padding: '0 18px 18px', borderTop: '1px solid #F5F1E8' }}>
                <div style={{ background: '#FAFAFA', borderRadius: 14, padding: '14px 16px', marginTop: 14 }}>
                  <p style={{ fontSize: 13, color: '#555', lineHeight: 1.75 }}>{faq.a}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{
          background: 'linear-gradient(135deg,#E07800,#FF9500)',
          borderRadius: 20, padding: '20px 18px', marginTop: 6, marginBottom: 20, textAlign: 'center',
        }}>
          <i className="fas fa-question-circle" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 28, marginBottom: 10, display: 'block' }} />
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {t('no_answer_found')}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 14 }}>
            {t('team_available')}
          </p>
          <a href={lienTelegram} target="_blank" rel="noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 22px', borderRadius: 50,
            background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.5)',
            color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}>
            <i className="fab fa-telegram" /> {t('contact_support')}
          </a>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
