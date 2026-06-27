import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';

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
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#888',
  marginBottom: 6,
  display: 'block',
};

export default function Withdrawal() {
  const [form, setForm] = useState({ montant: '', transaction_password: '' });
  const [history, setHistory] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('form');
  const [minRetrait, setMinRetrait] = useState(2000);
  const [retraitSchedule, setRetraitSchedule] = useState({ jours: '1,2,3,4,5,6', heureDebut: '9', heureFin: '19', maxParJour: '1' });
  const [retraitOff, setRetraitOff] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [dashRes, histRes, settingsRes] = await Promise.all([
        api.get('/user/dashboard'),
        api.get('/withdrawal/list'),
        api.get('/settings/public'),
      ]);
      setUserInfo(dashRes.data.user);
      setHistory(histRes.data.retraits);
      setMinRetrait(parseFloat(settingsRes.data.min_retrait || 2000));
      setRetraitSchedule({
        jours: settingsRes.data.retrait_jours || '1,2,3,4,5,6',
        heureDebut: settingsRes.data.retrait_heure_debut || '9',
        heureFin: settingsRes.data.retrait_heure_fin || '19',
        maxParJour: settingsRes.data.retrait_max_par_jour || '1',
      });
      setRetraitOff(settingsRes.data.retrait_off === '1');
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.montant || !form.transaction_password) return toast.error('Remplissez tous les champs');
    if (parseFloat(form.montant) < minRetrait) return toast.error(`Retrait minimum: ${new Intl.NumberFormat('fr-FR').format(minRetrait)} FCFA`);
    setSubmitting(true);
    try {
      const res = await api.post('/withdrawal/request', form);
      toast.success(res.data.message);
      setForm({ montant: '', transaction_password: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally { setSubmitting(false); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
  const devise = userInfo?.pays === 'Cameroun' ? 'XAF' : 'XOF';
  const statusColor = { valide: '#34C759', en_attente: '#FF9500', rejete: '#FF3B30' };
  const statusBg   = { valide: '#F0FFF4', en_attente: '#FFF8F0', rejete: '#FFF0F0' };
  const statusLabel = { valide: 'Validé', en_attente: 'En attente', rejete: 'Rejeté' };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5F1E8' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 90 }}>

      {/* ─── EN-TÊTE orange ─── */}
      <div style={{ padding: '50px 16px 70px', position: 'relative', overflow: 'hidden', minHeight: 160 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #E07800 0%, #FF9500 100%)' }} />
        <img
          src="/payfast-bg.jpg" alt=""
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            height: '80%', width: 'auto',
            objectFit: 'contain', mixBlendMode: 'multiply',
          }}
        />
        {/* Bouton retour */}
        <button onClick={() => navigate('/')} style={{
          position: 'absolute', top: 14, left: 16, zIndex: 3,
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="fas fa-arrow-left" style={{ fontSize: 14 }} />
        </button>

        {/* Titre */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', paddingTop: 8 }}>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Votre solde disponible
          </p>
          <p style={{ color: '#fff', fontSize: 30, fontWeight: 800, lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
            {fmt(userInfo?.solde)} <span style={{ fontSize: 16, fontWeight: 600 }}>{devise}</span>
          </p>
        </div>
      </div>

      {/* ─── CARTE FLOTTANTE : onglets ─── */}
      <div style={{ margin: '-40px 16px 16px', position: 'relative', zIndex: 10 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '14px 14px 0', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 14 }}>
            {[
              { key: 'form',    label: 'Nouveau retrait', icon: 'fa-hand-holding-usd' },
              { key: 'history', label: 'Historique',      icon: 'fa-history' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: 1, padding: '11px 8px', borderRadius: 50, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13,
                background: tab === t.key ? '#FF9500' : '#F5F1E8',
                color:      tab === t.key ? '#fff'    : '#888',
                boxShadow:  tab === t.key ? '0 3px 10px rgba(255,149,0,0.35)' : 'none',
                transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <i className={`fas ${t.icon}`} style={{ fontSize: 12 }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── FORMULAIRE ─── */}
      {tab === 'form' && (
        <div style={{ margin: '0 16px' }}>

          {/* Banner suspension */}
          {retraitOff && (
            <div style={{
              background: 'linear-gradient(135deg, #FF3B30, #CC0000)',
              borderRadius: 20, padding: '16px 18px', marginBottom: 14,
              boxShadow: '0 4px 20px rgba(255,59,48,0.35)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-ban" style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 3 }}>Retraits suspendus</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                  Les retraits sont temporairement indisponibles. Veuillez réessayer plus tard.
                </p>
              </div>
            </div>
          )}

          {/* Conditions */}
          <div style={{
            background: '#fff', borderRadius: 20, padding: '16px 18px', marginBottom: 14,
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#FF9500', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: '#FFF8F0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-info-circle" style={{ fontSize: 13, color: '#FF9500' }} />
              </span>
              Conditions de retrait
            </p>
            {(() => {
              const jourNoms = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
              const jourNomsFull = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
              const joursArr = retraitSchedule.jours.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
              const joursStr = joursArr.map(d => jourNomsFull[d]).join(', ');
              const maxJour = parseInt(retraitSchedule.maxParJour || 1);
              return (
                <ul style={{ fontSize: 12, color: '#666', lineHeight: 2, paddingLeft: 18, margin: 0 }}>
                  <li>{joursStr} de {retraitSchedule.heureDebut}h à {retraitSchedule.heureFin}h (GMT)</li>
                  <li>Minimum: <strong style={{ color: '#1A1A1A' }}>{fmt(minRetrait)} FCFA</strong></li>
                  <li>{maxJour <= 1 ? 'Un seul retrait toutes les 24h' : `Maximum ${maxJour} retraits par 24h`}</li>
                  <li>Plan d'investissement actif requis</li>
                  <li>Portefeuille configuré obligatoire</li>
                </ul>
              );
            })()}
          </div>

          {/* Lien portefeuille */}
          <div style={{
            background: '#fff', borderRadius: 20, padding: '14px 18px', marginBottom: 14,
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FFF8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-wallet" style={{ fontSize: 18, color: '#FF9500' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A' }}>Mon portefeuille</p>
                <p style={{ fontSize: 12, color: '#999' }}>Compte de réception du retrait</p>
              </div>
            </div>
            <button onClick={() => navigate('/wallet')} style={{
              padding: '8px 14px', borderRadius: 50,
              background: '#FF9500', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(255,149,0,0.35)',
            }}>
              Modifier
            </button>
          </div>

          {/* Formulaire principal */}
          <div style={{
            background: '#fff', borderRadius: 20, padding: '20px 18px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, background: '#FFF8F0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-arrow-up" style={{ fontSize: 14, color: '#FF9500' }} />
              </span>
              Demande de retrait
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Montant (FCFA)</label>
                <input
                  type="number"
                  placeholder={`Minimum ${fmt(minRetrait)} FCFA`}
                  value={form.montant}
                  onChange={e => setForm({ ...form, montant: e.target.value })}
                  min={minRetrait}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Mot de passe de transaction</label>
                <input
                  type="password"
                  placeholder="• • • •"
                  maxLength={4}
                  value={form.transaction_password}
                  onChange={e => setForm({ ...form, transaction_password: e.target.value })}
                  style={{ ...inputStyle, textAlign: 'center', letterSpacing: 10, fontSize: 22 }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '14px', borderRadius: 50,
                  background: submitting ? '#ccc' : '#FF9500',
                  border: 'none', color: '#fff',
                  fontWeight: 700, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting ? 'none' : '0 3px 12px rgba(255,149,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting
                  ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />
                  : <><i className="fas fa-paper-plane" /> Envoyer la demande</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── HISTORIQUE ─── */}
      {tab === 'history' && (
        <div style={{ margin: '0 16px' }}>
          {history.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 20, padding: '40px 20px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.07)', textAlign: 'center',
            }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px', background: '#FFF8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-history" style={{ fontSize: 24, color: '#FF9500' }} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 4 }}>Aucun retrait</p>
              <p style={{ fontSize: 13, color: '#999' }}>Vos demandes de retrait apparaîtront ici</p>
            </div>
          ) : (
            history.map(r => (
              <div key={r.id} style={{
                background: '#fff', borderRadius: 20, padding: '16px 18px', marginBottom: 10,
                boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: statusBg[r.statut] || '#F5F5F5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`fas ${r.statut === 'valide' ? 'fa-check' : r.statut === 'rejete' ? 'fa-times' : 'fa-clock'}`}
                        style={{ fontSize: 16, color: statusColor[r.statut] || '#999' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A' }}>{fmt(r.montant)} FCFA</p>
                      <p style={{ fontSize: 12, color: '#999' }}>{r.methode} • {r.numero_compte}</p>
                      <p style={{ fontSize: 11, color: '#bbb' }}>{new Date(r.date_demande).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <span style={{
                    background: statusBg[r.statut] || '#F5F5F5',
                    color: statusColor[r.statut] || '#999',
                    borderRadius: 20, padding: '4px 12px',
                    fontSize: 12, fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}>
                    {statusLabel[r.statut] || r.statut}
                  </span>
                </div>
                {r.reference && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '6px 10px', background: '#F0F6FF', borderRadius: 8 }}>
                    <i className="fas fa-hashtag" style={{ color: '#007AFF', fontSize: 10 }} />
                    <span style={{ flex: 1, color: '#007AFF', fontSize: 11, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 0.3 }}>{r.reference}</span>
                    <button onClick={() => { navigator.clipboard.writeText(r.reference); import('react-hot-toast').then(m => m.default.success('Référence copiée !')); }} style={{ background: '#007AFF', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', color: '#fff', fontSize: 10, fontWeight: 700 }}>Copier</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
