import React, { useState, useEffect } from 'react';
import Logo from "../components/Logo";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';

export default function Withdrawal() {
  const [form, setForm] = useState({ montant: '', transaction_password: '' });
  const [history, setHistory] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('form');
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [dashRes, histRes] = await Promise.all([
        api.get('/user/dashboard'),
        api.get('/withdrawal/list'),
      ]);
      setUserInfo(dashRes.data.user);
      setHistory(histRes.data.retraits);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.montant || !form.transaction_password) return toast.error('Remplissez tous les champs');
    if (parseFloat(form.montant) < 2000) return toast.error('Retrait minimum: 2000 FCFA');
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
  const statusColor = { valide: 'green', en_attente: 'yellow', rejete: 'red' };
  const statusLabel = { valide: 'Validé', en_attente: 'En attente', rejete: 'Rejeté' };

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}><i className="fas fa-arrow-left" /></button>
        <span className="page-title">Retrait</span>
        <Logo size="sm" style={{ marginLeft: "auto" }} />
      </div>

      {userInfo && (
        <div style={{ margin: '0 16px 16px', background: 'linear-gradient(135deg,rgba(27,42,107,0.15),rgba(0,0,0,0.15))', border: '1px solid var(--border-color)', borderRadius: 14, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Solde disponible</p>
          <p className="amount-large">{fmt(userInfo.solde)} {devise}</p>
        </div>
      )}

      <div style={{ display: 'flex', margin: '0 16px 20px', background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 4 }}>
        {['form', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: tab === t ? 'linear-gradient(135deg,var(--blue-primary),var(--blue-dark))' : 'transparent',
            color: tab === t ? '#fff' : 'var(--text-muted)', fontWeight: tab === t ? 600 : 400, fontSize: 14,
          }}>
            {t === 'form' ? 'Nouveau retrait' : 'Historique'}
          </button>
        ))}
      </div>

      {tab === 'form' ? (
        <div style={{ padding: '0 16px' }}>
          <div className="card" style={{ background: 'rgba(0,0,0,0.08)', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--blue-primary)' }}>
              <i className="fas fa-info-circle" style={{ marginRight: 8 }} />Conditions de retrait
            </p>
            <ul style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16 }}>
              <li>Lundi au samedi de 9h à 19h (GMT)</li>
              <li>Minimum de retrait: 2,000 FCFA</li>
              <li>Un seul retrait toutes les 24h</li>
              <li>Avoir un plan d'investissement actif</li>
              <li>Portefeuille configuré obligatoire</li>
            </ul>
          </div>

          <div className="card" style={{ marginBottom: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Portefeuille</p>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Configurer mon portefeuille</p>
            </div>
            <button onClick={() => navigate('/wallet')} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.3)', color: 'var(--blue-primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <i className="fas fa-wallet" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Montant (FCFA)</label>
              <input type="number" placeholder="Minimum 2000 FCFA" value={form.montant}
                onChange={e => setForm({ ...form, montant: e.target.value })} min="2000" />
            </div>
            <div className="input-group">
              <label>Mot de passe de transaction (4 chiffres)</label>
              <input type="password" placeholder="••••" maxLength={4} value={form.transaction_password}
                onChange={e => setForm({ ...form, transaction_password: e.target.value })}
                style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20 }} />
            </div>
            <button type="submit" className="btn btn-blue" disabled={submitting}>
              {submitting ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
                <><i className="fas fa-hand-holding-usd" /> Demander le retrait</>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {history.length === 0 ? (
            <div className="empty-state"><i className="fas fa-history" /><p>Aucun retrait</p></div>
          ) : (
            history.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>{fmt(r.montant)} FCFA</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.methode} • {r.numero_compte}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(r.date_demande).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className={`badge badge-${statusColor[r.statut] || 'yellow'}`}>
                    <span className={`status-dot ${statusColor[r.statut] || 'yellow'}`} />
                    {statusLabel[r.statut] || r.statut}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
