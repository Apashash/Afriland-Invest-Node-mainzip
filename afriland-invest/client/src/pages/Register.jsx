import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';
import { useLanguage, LangToggle } from '../contexts/LanguageContext.jsx';

const PAYS = [
  { code: '+237', label: '🇨🇲 +237', nom: 'Cameroun' },
  { code: '+225', label: '🇨🇮 +225', nom: "Côte d'Ivoire" },
  { code: '+229', label: '🇧🇯 +229', nom: 'Bénin' },
  { code: '+226', label: '🇧🇫 +226', nom: 'Burkina Faso' },
  { code: '+228', label: '🇹🇬 +228', nom: 'Togo' },
];

export default function Register() {
  const [searchParams] = useSearchParams();
  const codeFromUrl = (searchParams.get('p') || '').toUpperCase();

  const [lienWhatsapp, setLienWhatsapp] = useState('https://wa.me/237600000000');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    indicatif: '+237',
    telephone: '',
    mot_de_passe: '',
    pays: 'Cameroun',
    code_parrain: codeFromUrl,
  });

  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    fetch('/api/settings/public').then(r => r.json()).then(d => {
      if (d.lien_whatsapp) setLienWhatsapp(d.lien_whatsapp);
    }).catch(() => {});
  }, []);

  const handleIndicatifChange = (val) => {
    const found = PAYS.find(p => p.code === val);
    setForm(f => ({ ...f, indicatif: val, pays: found?.nom || f.pays }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.telephone || !form.mot_de_passe) return toast.error(t('fill_all'));
    if (form.mot_de_passe.length < 6) return toast.error(t('password_min'));
    setLoading(true);
    try {
      await register({ ...form, telephone: form.indicatif + form.telephone });
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur d'inscription");
    } finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ background: '#fff', minHeight: '100vh' }}>
      <div style={{
        height: 220, position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #E07800 0%, #FF9500 100%)' }} />
        <img src="/payfast-bg.jpg" alt="" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', height: '80%', width: 'auto',
          objectFit: 'contain', mixBlendMode: 'multiply',
        }} />
        <div style={{ position: 'absolute', top: 14, right: 16, zIndex: 10 }}>
          <LangToggle />
        </div>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.35)', padding: '6px 0', overflow: 'hidden', zIndex: 3,
        }}>
          <div style={{ animation: 'ticker 18s linear infinite', whiteSpace: 'nowrap', fontSize: 12, color: '#fff', fontWeight: 500 }}>
            &nbsp;&nbsp;&nbsp;🎉 Jean C. a retiré 15 000 FCFA &nbsp;•&nbsp; Marie D. a investi dans VIP 3 &nbsp;•&nbsp; Paul O. a reçu 8 500 FCFA &nbsp;•&nbsp; Ibrahim S. a activé VIP 5 &nbsp;•&nbsp;
          </div>
        </div>
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, marginTop: 20 }}>
          <p style={{ color: '#fff', fontSize: 24, fontWeight: 800, lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {t('invest_tagline')}
          </p>
        </div>
      </div>

      <div style={{ background: '#F5F1E8', minHeight: 'calc(100vh - 220px)', padding: '0 16px 40px' }}>
        <div style={{
          background: '#fff', borderRadius: 24, padding: 20, marginTop: -24,
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)', position: 'relative', zIndex: 10,
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', marginBottom: 4, textAlign: 'center' }}>
            {t('register_tab')}
          </h2>
          <p style={{ fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 20 }}>
            Créez votre compte gratuitement
          </p>

          {codeFromUrl && (
            <div style={{
              background: '#FFF8F0', border: '1.5px solid #FF9500', borderRadius: 12,
              padding: '10px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 20 }}>🔗</span>
              <div>
                <p style={{ fontSize: 12, color: '#FF9500', fontWeight: 700, margin: 0 }}>Invitation de parrainage</p>
                <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Code : <strong style={{ color: '#FF9500' }}>{codeFromUrl}</strong></p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#22c55e', fontWeight: 700 }}>✓ Actif</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ background: '#F7F7F7', borderRadius: 12, border: '1.5px solid #E8E8E8' }}>
                <input
                  type="text" placeholder={t('name_placeholder')}
                  value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                  style={{ width: '100%', background: 'transparent', border: 'none', padding: '13px 14px', fontSize: 15, color: '#1A1A1A', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: '#F7F7F7', borderRadius: 12, border: '1.5px solid #E8E8E8', overflow: 'hidden',
              }}>
                <select
                  value={form.indicatif}
                  onChange={e => handleIndicatifChange(e.target.value)}
                  style={{
                    background: 'transparent', border: 'none', padding: '13px 10px',
                    color: '#FF9500', fontWeight: 700, fontSize: 14, width: 90, flexShrink: 0,
                  }}
                >
                  {PAYS.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                </select>
                <div style={{ width: 1, height: 24, background: '#E8E8E8' }} />
                <input
                  type="tel" placeholder={t('phone_placeholder')}
                  value={form.telephone}
                  onChange={e => setForm({ ...form, telephone: e.target.value })}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '13px 14px', fontSize: 15, color: '#1A1A1A' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: '#F7F7F7', borderRadius: 12, border: '1.5px solid #E8E8E8',
              }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder={t('password_placeholder')}
                  value={form.mot_de_passe}
                  onChange={e => setForm({ ...form, mot_de_passe: e.target.value })}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '13px 14px', fontSize: 15, color: '#1A1A1A' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ background: 'none', border: 'none', padding: '0 14px', color: '#999' }}>
                  <i className={`fas fa-eye${showPass ? '-slash' : ''}`} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ background: '#F7F7F7', borderRadius: 12, border: '1.5px solid #E8E8E8' }}>
                <select
                  value={form.pays}
                  onChange={e => setForm({ ...form, pays: e.target.value })}
                  style={{ width: '100%', background: 'transparent', border: 'none', padding: '13px 14px', fontSize: 15, color: '#1A1A1A' }}
                >
                  {PAYS.map(p => <option key={p.nom} value={p.nom}>{p.nom}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{
                background: codeFromUrl ? '#FFF8F0' : '#F7F7F7',
                borderRadius: 12,
                border: codeFromUrl ? '1.5px solid #FF9500' : '1.5px solid #E8E8E8',
                display: 'flex', alignItems: 'center',
              }}>
                <input
                  type="text" placeholder={t('referral_placeholder')}
                  value={form.code_parrain}
                  onChange={e => !codeFromUrl && setForm({ ...form, code_parrain: e.target.value })}
                  readOnly={!!codeFromUrl}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    padding: '13px 14px', fontSize: 15,
                    color: codeFromUrl ? '#FF9500' : '#1A1A1A',
                    fontWeight: codeFromUrl ? 700 : 400,
                    cursor: codeFromUrl ? 'default' : 'text',
                  }}
                />
                {codeFromUrl && (
                  <span style={{ paddingRight: 14, fontSize: 12, color: '#22c55e', fontWeight: 600, whiteSpace: 'nowrap' }}>✓ Verrouillé</span>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                : t('register_btn')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <p style={{ fontSize: 14, color: '#666' }}>
              Déjà un compte ?{' '}
              <Link to="/login" style={{ color: '#FF9500', fontWeight: 700, textDecoration: 'none' }}>
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>

      <a href={lienWhatsapp} target="_blank" rel="noreferrer" style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 200,
        width: 52, height: 52, borderRadius: '50%', background: '#25D366',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(37,211,102,0.5)',
      }}>
        <i className="fab fa-whatsapp" style={{ fontSize: 28, color: '#fff' }} />
      </a>
    </div>
  );
}
