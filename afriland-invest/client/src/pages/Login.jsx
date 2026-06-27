import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';

const PAYS = [
  { code: '+237', label: '🇨🇲 +237' },
  { code: '+225', label: '🇨🇮 +225' },
  { code: '+221', label: '🇸🇳 +221' },
  { code: '+223', label: '🇲🇱 +223' },
  { code: '+229', label: '🇧🇯 +229' },
  { code: '+226', label: '🇧🇫 +226' },
  { code: '+228', label: '🇹🇬 +228' },
  { code: '+243', label: '🇨🇩 +243' },
  { code: '+242', label: '🇨🇬 +242' },
  { code: '+241', label: '🇬🇦 +241' },
];

export default function Login() {
  const [tab, setTab] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ indicatif: '+237', telephone: '', mot_de_passe: '' });
  const [regForm, setRegForm] = useState({ nom: '', indicatif: '+237', telephone: '', mot_de_passe: '', pays: 'Cameroun', code_parrain: '' });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.telephone || !loginForm.mot_de_passe) return toast.error('Remplissez tous les champs');
    setLoading(true);
    try {
      await login(loginForm.indicatif, loginForm.telephone, loginForm.mot_de_passe);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Identifiants incorrects');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.nom || !regForm.telephone || !regForm.mot_de_passe) return toast.error('Remplissez tous les champs');
    if (regForm.mot_de_passe.length < 6) return toast.error('Mot de passe : 6 caractères minimum');
    setLoading(true);
    try {
      await register({ ...regForm, telephone: regForm.indicatif + regForm.telephone });
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur d\'inscription');
    } finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        height: 260,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}>
        {/* Fond orange uniforme */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #E07800 0%, #FF9500 100%)',
        }} />
        {/* Logo PayFast centré */}
        <img
          src="/payfast-bg.jpg"
          alt=""
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            height: '80%',
            width: 'auto',
            objectFit: 'contain',
            mixBlendMode: 'multiply',
          }}
        />

        {/* Bandeau défilant */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.35)',
          padding: '6px 0', overflow: 'hidden', zIndex: 3,
        }}>
          <div style={{ animation: 'ticker 18s linear infinite', whiteSpace: 'nowrap', fontSize: 12, color: '#fff', fontWeight: 500 }}>
            &nbsp;&nbsp;&nbsp;🎉 Jean C. a retiré 15 000 FCFA &nbsp;•&nbsp; Marie D. a investi dans VIP 3 &nbsp;•&nbsp; Paul O. a reçu 8 500 FCFA &nbsp;•&nbsp; Ibrahim S. a activé VIP 5 &nbsp;•&nbsp;
          </div>
        </div>

        {/* Texte au-dessus */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, marginTop: 20 }}>
          <p style={{ color: '#fff', fontSize: 26, fontWeight: 800, lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            Investissez &amp; Gagnez
          </p>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 8, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            Faites fructifier votre argent dès aujourd'hui
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div style={{ background: '#F5F1E8', minHeight: 'calc(100vh - 240px)', padding: '0 16px 40px' }}>
        <div style={{
          background: '#fff',
          borderRadius: 24,
          padding: 20,
          marginTop: -24,
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          position: 'relative', zIndex: 10,
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', background: '#F5F1E8', borderRadius: 50, padding: 4, marginBottom: 20,
          }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '10px', borderRadius: 50, border: 'none', cursor: 'pointer',
                background: tab === t ? '#FF9500' : 'transparent',
                color: tab === t ? '#fff' : '#999',
                fontWeight: tab === t ? 700 : 400,
                fontSize: 14, transition: 'all 0.25s',
              }}>
                {t === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              {/* Téléphone */}
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: '#F7F7F7', borderRadius: 12, border: '1.5px solid #E8E8E8', overflow: 'hidden',
                }}>
                  <select
                    value={loginForm.indicatif}
                    onChange={e => setLoginForm({ ...loginForm, indicatif: e.target.value })}
                    style={{
                      background: 'transparent', border: 'none', padding: '13px 10px',
                      color: '#FF9500', fontWeight: 700, fontSize: 14, width: 90, flexShrink: 0,
                    }}
                  >
                    {PAYS.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </select>
                  <div style={{ width: 1, height: 24, background: '#E8E8E8' }} />
                  <input
                    type="tel" placeholder="Numéro de téléphone"
                    value={loginForm.telephone}
                    onChange={e => setLoginForm({ ...loginForm, telephone: e.target.value })}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      padding: '13px 14px', fontSize: 15, color: '#1A1A1A',
                    }}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div style={{ marginBottom: 20, position: 'relative' }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: '#F7F7F7', borderRadius: 12, border: '1.5px solid #E8E8E8',
                }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mot de passe"
                    value={loginForm.mot_de_passe}
                    onChange={e => setLoginForm({ ...loginForm, mot_de_passe: e.target.value })}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      padding: '13px 14px', fontSize: 15, color: '#1A1A1A',
                    }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ background: 'none', border: 'none', padding: '0 14px', color: '#999' }}>
                    <i className={`fas fa-eye${showPass ? '-slash' : ''}`} />
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading
                  ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  : 'Connexion'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: '#F7F7F7', borderRadius: 12, border: '1.5px solid #E8E8E8',
                }}>
                  <input
                    type="text" placeholder="Nom complet"
                    value={regForm.nom}
                    onChange={e => setRegForm({ ...regForm, nom: e.target.value })}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      padding: '13px 14px', fontSize: 15, color: '#1A1A1A',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: '#F7F7F7', borderRadius: 12, border: '1.5px solid #E8E8E8', overflow: 'hidden',
                }}>
                  <select
                    value={regForm.indicatif}
                    onChange={e => setRegForm({ ...regForm, indicatif: e.target.value })}
                    style={{
                      background: 'transparent', border: 'none', padding: '13px 10px',
                      color: '#FF9500', fontWeight: 700, fontSize: 14, width: 90, flexShrink: 0,
                    }}
                  >
                    {PAYS.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </select>
                  <div style={{ width: 1, height: 24, background: '#E8E8E8' }} />
                  <input
                    type="tel" placeholder="Numéro de téléphone"
                    value={regForm.telephone}
                    onChange={e => setRegForm({ ...regForm, telephone: e.target.value })}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      padding: '13px 14px', fontSize: 15, color: '#1A1A1A',
                    }}
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
                    placeholder="Mot de passe"
                    value={regForm.mot_de_passe}
                    onChange={e => setRegForm({ ...regForm, mot_de_passe: e.target.value })}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      padding: '13px 14px', fontSize: 15, color: '#1A1A1A',
                    }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ background: 'none', border: 'none', padding: '0 14px', color: '#999' }}>
                    <i className={`fas fa-eye${showPass ? '-slash' : ''}`} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{
                  background: '#F7F7F7', borderRadius: 12, border: '1.5px solid #E8E8E8',
                }}>
                  <select
                    value={regForm.pays}
                    onChange={e => setRegForm({ ...regForm, pays: e.target.value })}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      padding: '13px 14px', fontSize: 15, color: '#1A1A1A',
                    }}
                  >
                    <option>Cameroun</option>
                    <option>Côte d'Ivoire</option>
                    <option>Sénégal</option>
                    <option>Mali</option>
                    <option>Bénin</option>
                    <option>Burkina Faso</option>
                    <option>Togo</option>
                    <option>Congo RDC</option>
                    <option>Congo Brazzaville</option>
                    <option>Gabon</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{
                  background: '#F7F7F7', borderRadius: 12, border: '1.5px solid #E8E8E8',
                }}>
                  <input
                    type="text" placeholder="Code de parrainage (optionnel)"
                    value={regForm.code_parrain}
                    onChange={e => setRegForm({ ...regForm, code_parrain: e.target.value })}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      padding: '13px 14px', fontSize: 15, color: '#1A1A1A',
                    }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading
                  ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>

        {/* WhatsApp flottant */}
        <a
          href="https://wa.me/237600000000"
          target="_blank" rel="noreferrer"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 200,
            width: 52, height: 52, borderRadius: '50%',
            background: '#25D366',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(37,211,102,0.5)',
          }}
        >
          <i className="fab fa-whatsapp" style={{ fontSize: 28, color: '#fff' }} />
        </a>
      </div>
    </div>
  );
}
