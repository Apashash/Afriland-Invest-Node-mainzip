import React, { useState, useEffect } from 'react';
import Logo from "../components/Logo";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';

const NUMERO_DEPOT = {
  Cameroun: { MTN: '+237 674 000 000', Orange: '+237 655 000 000' },
  default: 'Contactez le support',
};

export default function Deposit() {
  const [operators, setOperators] = useState({});
  const [form, setForm] = useState({ montant: '', pays: '', operateur: '', numero_payeur: '' });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('form');
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [opRes, histRes] = await Promise.all([
        api.get('/deposit/operators'),
        api.get('/deposit/list'),
      ]);
      setOperators(opRes.data.pays_operateurs);
      setHistory(histRes.data.depots);
      const firstPays = Object.keys(opRes.data.pays_operateurs)[0];
      setForm(f => ({ ...f, pays: firstPays, operateur: Object.keys(opRes.data.pays_operateurs[firstPays]?.operators || {})[0] || '' }));
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const handlePaysChange = (e) => {
    const pays = e.target.value;
    const ops = operators[pays]?.operators || {};
    setForm({ ...form, pays, operateur: Object.keys(ops)[0] || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.montant || !form.pays || !form.operateur || !form.numero_payeur) return toast.error('Remplissez tous les champs');
    if (parseFloat(form.montant) < 500) return toast.error('Montant minimum: 500 FCFA');
    setSubmitting(true);
    try {
      const res = await api.post('/deposit/request', form);
      toast.success(res.data.message);
      setForm(f => ({ ...f, montant: '', numero_payeur: '' }));
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally { setSubmitting(false); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
  const currentOps = operators[form.pays]?.operators || {};
  const currentOpName = currentOps[form.operateur] || '';

  const statusColor = { valide: 'green', en_attente: 'yellow', rejete: 'red' };
  const statusLabel = { valide: 'Validé', en_attente: 'En attente', rejete: 'Rejeté' };

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}><i className="fas fa-arrow-left" /></button>
        <span className="page-title">Dépôt</span>
        <Logo size="sm" style={{ marginLeft: "auto" }} />
      </div>

      <div style={{ display: 'flex', margin: '0 16px 20px', background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 4 }}>
        {['form', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: tab === t ? 'linear-gradient(135deg,var(--green-primary),var(--green-dark))' : 'transparent',
            color: tab === t ? '#fff' : 'var(--text-muted)', fontWeight: tab === t ? 600 : 400, fontSize: 14,
          }}>
            {t === 'form' ? 'Nouveau dépôt' : 'Historique'}
          </button>
        ))}
      </div>

      {tab === 'form' ? (
        <div style={{ padding: '0 16px' }}>
          <div className="card" style={{ background: 'rgba(27,42,107,0.08)', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--green-primary)' }}>
              <i className="fas fa-info-circle" style={{ marginRight: 8 }} />Instructions
            </p>
            <ol style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16 }}>
              <li>Choisissez votre pays et opérateur</li>
              <li>Envoyez le montant sur notre numéro</li>
              <li>Remplissez le formulaire avec votre numéro payeur</li>
              <li>Votre dépôt sera validé sous 24h</li>
            </ol>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              <i className="fas fa-phone" style={{ marginRight: 8, color: 'var(--blue-primary)' }} />
              Numéros de dépôt
            </p>
            {Object.entries(NUMERO_DEPOT).filter(([k]) => k !== 'default').map(([pays, ops]) => (
              <div key={pays} style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{pays}</p>
                {Object.entries(ops).map(([op, num]) => (
                  <div key={op} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{op}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-primary)' }}>{num}</span>
                  </div>
                ))}
              </div>
            ))}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Autres pays: contactez notre support Telegram
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Pays</label>
              <select value={form.pays} onChange={handlePaysChange}>
                {Object.keys(operators).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Opérateur</label>
              <select value={form.operateur} onChange={e => setForm({ ...form, operateur: e.target.value })}>
                {Object.entries(currentOps).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Montant (FCFA)</label>
              <input type="number" placeholder="Minimum 500 FCFA" value={form.montant}
                onChange={e => setForm({ ...form, montant: e.target.value })} min="500" />
            </div>
            <div className="input-group">
              <label>Votre numéro payeur</label>
              <input type="tel" placeholder="Ex: +237600000000" value={form.numero_payeur}
                onChange={e => setForm({ ...form, numero_payeur: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
                <><i className="fas fa-paper-plane" /> Soumettre le dépôt</>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {history.length === 0 ? (
            <div className="empty-state"><i className="fas fa-history" /><p>Aucun dépôt</p></div>
          ) : (
            history.map(d => (
              <div key={d.id} className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>{fmt(d.montant)} FCFA</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{d.pays} • {d.operateur}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(d.date_depot).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className={`badge badge-${statusColor[d.statut] || 'yellow'}`}>
                    <span className={`status-dot ${statusColor[d.statut] || 'yellow'}`} />
                    {statusLabel[d.statut] || d.statut}
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
