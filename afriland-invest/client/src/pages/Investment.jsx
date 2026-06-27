import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';

export default function Investment() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [modal, setModal] = useState(null);
  const [txPassword, setTxPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadPlans(); loadPasswordStatus(); }, []);

  const loadPlans = async () => {
    try {
      const res = await api.get('/investment/plans');
      setPlans(res.data.plans);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const loadPasswordStatus = async () => {
    try {
      const res = await api.get('/user/has-transaction-password');
      setHasPassword(res.data.has_password);
    } catch {}
  };

  const openModal = (plan) => {
    setTxPassword('');
    setModal(plan);
  };

  const handleBuy = async () => {
    if (!txPassword) return toast.error('Mot de passe requis');
    setBuying(modal.id);
    try {
      const res = await api.post('/investment/buy', { plan_id: modal.id, transaction_password: txPassword });
      toast.success(res.data.message);
      setModal(null); setTxPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally { setBuying(null); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 80 }}>

      {/* Modal — pas de mot de passe configuré */}
      {modal && hasPassword === false && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 380, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fas fa-lock" style={{ fontSize: 28, color: '#FF9500' }} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: 17, color: '#1A1A1A', marginBottom: 10 }}>
              Mot de passe requis
            </h3>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.5, marginBottom: 24 }}>
              Vous devez d'abord configurer votre mot de passe de transaction avant de pouvoir investir.
            </p>
            <button
              onClick={() => { setModal(null); navigate('/account'); }}
              style={{
                width: '100%', padding: '14px', borderRadius: 50,
                background: '#FF9500', border: 'none', color: '#fff',
                fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 10,
              }}
            >
              <i className="fas fa-cog" style={{ marginRight: 8 }} />
              Configurer maintenant
            </button>
            <button
              onClick={() => setModal(null)}
              style={{
                width: '100%', padding: '12px', borderRadius: 50,
                background: 'none', border: '1.5px solid #E0E0E0', color: '#999',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Modal achat normal */}
      {modal && hasPassword === true && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 430 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: 18 }}>Activer {modal.nom}</h3>
              <button onClick={() => { setModal(null); setTxPassword(''); }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            <div style={{ background: '#FFF8F0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
              {[
                { label: 'Prix', value: `${fmt(modal.prix)} FCFA`, color: '#1A1A1A' },
                { label: 'Gain / jour', value: `${fmt(modal.revenu_journalier)} FCFA (${modal.rendement_journalier}%)`, color: '#FF9500' },
                { label: 'Durée', value: `${modal.duree_jours} jours`, color: '#1A1A1A' },
                { label: 'Gain total', value: `${fmt(modal.revenu_total)} FCFA`, color: '#34C759' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F0E8D8' }}>
                  <span style={{ color: '#666', fontSize: 13 }}>{r.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Mot de passe de transaction (4 chiffres)</p>
              <input
                type="password" inputMode="numeric" placeholder="••••" maxLength={4} value={txPassword}
                onChange={e => setTxPassword(e.target.value)}
                style={{
                  width: '100%', background: '#F7F7F7', border: '1.5px solid #E8E8E8',
                  borderRadius: 12, padding: '14px', textAlign: 'center',
                  letterSpacing: 12, fontSize: 22, color: '#1A1A1A',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button className="btn btn-primary" onClick={handleBuy} disabled={!!buying}>
              {buying ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : "Confirmer l'investissement"}
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div style={{
        background: 'linear-gradient(135deg, #FF9500, #FFB347)',
        padding: '50px 16px 24px',
        position: 'relative',
      }}>
        <button onClick={() => navigate('/')} style={{
          position: 'absolute', top: 14, left: 16,
          width: 34, height: 34, borderRadius: 10,
          background: 'rgba(255,255,255,0.25)', border: 'none',
          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="fas fa-arrow-left" />
        </button>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, textAlign: 'center' }}>Tous les produits</h1>
      </div>

      {/* Liste plans */}
      <div style={{ padding: '16px 16px 0' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="loading-spinner" /></div>
        ) : plans.map((plan, idx) => (
          <div key={plan.id} style={{
            background: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #FF9500, #FFB347)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img src="/vip-icon.png" alt="VIP" style={{ width: '85%', height: '85%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 3 }}>{plan.nom}</p>
              <p style={{ color: '#666', fontSize: 12 }}>Durée: {plan.duree_jours} jours</p>
              <p style={{ color: '#666', fontSize: 12 }}>Profit/jour: <span style={{ color: '#FF9500', fontWeight: 600 }}>{fmt(plan.revenu_journalier)} FCFA</span></p>
              <p style={{ color: '#666', fontSize: 12 }}>Profit total: <span style={{ color: '#34C759', fontWeight: 600 }}>{fmt(plan.revenu_total)} FCFA</span></p>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: '#1A1A1A', marginBottom: 8 }}>{fmt(plan.prix)}</p>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>FCFA</p>
              <button onClick={() => openModal(plan)} style={{
                padding: '8px 16px', borderRadius: 50,
                background: '#FF9500', border: 'none',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(255,149,0,0.4)',
              }}>
                Investir
              </button>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
