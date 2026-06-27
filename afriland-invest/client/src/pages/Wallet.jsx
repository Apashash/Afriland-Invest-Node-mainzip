import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';

const PAYS_METHODES = {
  'Cameroun': ['MTN Mobile Money', 'Orange Money'],
  "Côte d'Ivoire": ['MTN Money', 'Orange Money', 'Moov Money', 'Wave'],
  'Sénégal': ['Orange Money', 'Wave', 'Free Money'],
  'Mali': ['Orange Money', 'Moov Money'],
  'Bénin': ['MTN Money', 'Moov Money'],
  'Burkina Faso': ['Orange Money', 'Moov Money'],
  'Togo': ['T-Money', 'Moov Money'],
};

export default function Wallet() {
  const [form, setForm] = useState({
    nom_portefeuille: '',
    pays: 'Cameroun',
    methode_paiement: 'MTN Mobile Money',
    numero_telephone: '',
  });
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/user/wallet');
      setWallets(res.data.wallets);
      if (res.data.wallets.length > 0) {
        const w = res.data.wallets[0];
        setForm({
          nom_portefeuille: w.nom_portefeuille,
          pays: w.pays,
          methode_paiement: w.methode_paiement,
          numero_telephone: w.numero_telephone,
        });
      }
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom_portefeuille || !form.numero_telephone) return toast.error('Remplissez tous les champs');
    setSubmitting(true);
    try {
      await api.post('/user/wallet', form);
      toast.success('Portefeuille enregistré');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setSubmitting(false); }
  };

  const methodes = PAYS_METHODES[form.pays] || [];

  const inputStyle = {
    width: '100%',
    background: '#F7F7F7',
    border: '1.5px solid #E8E8E8',
    borderRadius: 12,
    padding: '13px 14px',
    fontSize: 14,
    color: '#1A1A1A',
    boxSizing: 'border-box',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: '#888',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 80 }}>

      {/* ─── EN-TÊTE orange (même style Dashboard) ─── */}
      <div style={{
        padding: '50px 16px 70px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 140,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #E07800 0%, #FF9500 100%)',
        }} />
        <img
          src="/payfast-bg.jpg"
          alt=""
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            height: '80%', width: 'auto',
            objectFit: 'contain',
            mixBlendMode: 'multiply',
          }}
        />
        {/* Bouton retour */}
        <button onClick={() => navigate('/account')} style={{
          position: 'absolute', top: 14, left: 16, zIndex: 3,
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="fas fa-arrow-left" style={{ fontSize: 14 }} />
        </button>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', paddingTop: 8 }}>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Mon portefeuille
          </p>
          <p style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>
            <i className="fas fa-wallet" style={{ marginRight: 8 }} />
            Compte de retrait
          </p>
        </div>
      </div>

      {/* ─── CARTE PORTEFEUILLE ACTUEL ─── */}
      <div style={{ margin: '-40px 16px 16px', position: 'relative', zIndex: 10 }}>
        {loading ? (
          <div style={{
            background: '#fff', borderRadius: 20, padding: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="loading-spinner" />
          </div>
        ) : wallets.length > 0 ? (
          <div style={{
            background: 'linear-gradient(135deg, #FF9500, #FFB347)',
            borderRadius: 20, padding: '18px 20px',
            boxShadow: '0 4px 20px rgba(255,149,0,0.35)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="fas fa-wallet" style={{ fontSize: 20, color: '#fff' }} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{wallets[0].nom_portefeuille}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{wallets[0].methode_paiement}</p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.25)', borderRadius: 20,
                  padding: '4px 10px', fontSize: 11, color: '#fff', fontWeight: 600,
                }}>
                  {wallets[0].pays}
                </span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: 12 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>Numéro de retrait</p>
              <p style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: 1 }}>
                {wallets[0].numero_telephone}
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#fff', borderRadius: 20, padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
              background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fas fa-wallet" style={{ fontSize: 24, color: '#FF9500' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 4 }}>Aucun portefeuille</p>
            <p style={{ fontSize: 13, color: '#999' }}>Ajoutez votre compte de retrait ci-dessous</p>
          </div>
        )}
      </div>

      {/* ─── FORMULAIRE ─── */}
      <div style={{ margin: '0 16px 16px' }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
        }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: '#FFF3E0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-edit" style={{ fontSize: 14, color: '#FF9500' }} />
            </span>
            {wallets.length > 0 ? 'Modifier le portefeuille' : 'Ajouter un portefeuille'}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nom du portefeuille</label>
              <input
                type="text"
                placeholder="Ex: Mon compte MTN"
                value={form.nom_portefeuille}
                onChange={e => setForm({ ...form, nom_portefeuille: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Pays</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={form.pays}
                  onChange={e => {
                    const newPays = e.target.value;
                    const newMethodes = PAYS_METHODES[newPays] || [];
                    setForm({ ...form, pays: newPays, methode_paiement: newMethodes[0] || '' });
                  }}
                  style={{ ...inputStyle, paddingRight: 36 }}
                >
                  {Object.keys(PAYS_METHODES).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <i className="fas fa-chevron-down" style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 12, color: '#999', pointerEvents: 'none',
                }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Méthode de paiement</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={form.methode_paiement}
                  onChange={e => setForm({ ...form, methode_paiement: e.target.value })}
                  style={{ ...inputStyle, paddingRight: 36 }}
                >
                  {methodes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <i className="fas fa-chevron-down" style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 12, color: '#999', pointerEvents: 'none',
                }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Numéro de téléphone</label>
              <input
                type="tel"
                placeholder="+237600000000"
                value={form.numero_telephone}
                onChange={e => setForm({ ...form, numero_telephone: e.target.value })}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '14px', borderRadius: 50,
                background: '#FF9500', border: 'none', color: '#fff',
                fontWeight: 700, fontSize: 15, cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(255,149,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting
                ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />
                : <><i className="fas fa-save" /> Enregistrer</>}
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
