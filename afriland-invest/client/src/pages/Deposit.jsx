import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';

const MONTANTS_RAPIDES = [1000, 3000, 8000, 15000, 30000, 60000, 80000, 120000, 160000];

export default function Deposit() {
  const [operators, setOperators] = useState({});
  const [form, setForm] = useState({ montant: '', pays: '', operateur: '', numero_payeur: '' });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('form');
  const [solde, setSolde] = useState(0);
  const [minDepot, setMinDepot] = useState(500);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [opRes, histRes, userRes, settingsRes] = await Promise.all([
        api.get('/deposit/operators'),
        api.get('/deposit/list'),
        api.get('/user/profile'),
        api.get('/settings/public'),
      ]);
      setOperators(opRes.data.pays_operateurs);
      setHistory(histRes.data.depots);
      setSolde(userRes.data.solde || 0);
      setMinDepot(parseFloat(settingsRes.data.min_depot || 500));
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
    if (parseFloat(form.montant) < minDepot) return toast.error(`Montant minimum: ${new Intl.NumberFormat('fr-FR').format(minDepot)} FCFA`);
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
  const statusColor = { valide: 'green', en_attente: 'yellow', rejete: 'red' };
  const statusLabel = { valide: 'Validé', en_attente: 'En attente', rejete: 'Rejeté' };

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 80 }}>

      {/* En-tête orange */}
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
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, textAlign: 'center' }}>Centre de Recharge</h1>
      </div>

      {/* Tabs */}
      <div style={{ margin: '16px 16px 0', display: 'flex', background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {['form', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: tab === t ? '#FF9500' : 'transparent',
            color: tab === t ? '#fff' : '#999',
            fontWeight: tab === t ? 700 : 400, fontSize: 14, transition: 'all 0.25s',
          }}>
            {t === 'form' ? 'Nouveau dépôt' : 'Historique'}
          </button>
        ))}
      </div>

      {tab === 'form' ? (
        <div style={{ padding: '16px' }}>
          {/* Solde */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>Mon solde :</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#FF9500' }}>{fmt(solde)} FCFA</p>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 12 }}>
              Sélectionnez ou entrez le montant
            </p>

            {/* Grille montants rapides */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
              {MONTANTS_RAPIDES.map(m => (
                <button key={m} onClick={() => setForm({ ...form, montant: String(m) })} style={{
                  padding: '12px 8px', borderRadius: 12,
                  border: form.montant === String(m) ? '2px solid #FF9500' : '1.5px solid #E8E8E8',
                  background: form.montant === String(m) ? '#FFF8F0' : '#F7F7F7',
                  color: form.montant === String(m) ? '#FF9500' : '#1A1A1A',
                  fontWeight: form.montant === String(m) ? 700 : 500,
                  fontSize: 13, cursor: 'pointer', textAlign: 'center', position: 'relative',
                }}>
                  {new Intl.NumberFormat('fr-FR').format(m)}
                </button>
              ))}
            </div>

            {/* Montant personnalisé */}
            <div style={{ marginBottom: 14 }}>
              <input
                type="number" placeholder="Autre montant (FCFA)"
                value={form.montant}
                onChange={e => setForm({ ...form, montant: e.target.value })}
                style={{
                  width: '100%', background: '#F7F7F7', border: '1.5px solid #E8E8E8',
                  borderRadius: 12, padding: '13px 14px', fontSize: 15, color: '#1A1A1A',
                }}
              />
            </div>

            {/* Pays */}
            <div style={{ marginBottom: 10 }}>
              <select value={form.pays} onChange={handlePaysChange} style={{
                width: '100%', background: '#F7F7F7', border: '1.5px solid #E8E8E8',
                borderRadius: 12, padding: '13px 14px', fontSize: 15, color: '#1A1A1A',
              }}>
                {Object.keys(operators).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Opérateur */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {Object.entries(currentOps).map(([code, name]) => (
                <button key={code} onClick={() => setForm({ ...form, operateur: code })} style={{
                  flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                  border: form.operateur === code ? '2px solid #FF9500' : '1.5px solid #E8E8E8',
                  background: form.operateur === code ? '#FFF8F0' : '#F7F7F7',
                  color: form.operateur === code ? '#FF9500' : '#666',
                  fontWeight: form.operateur === code ? 700 : 500, fontSize: 13,
                }}>
                  {name}
                </button>
              ))}
            </div>

            {/* Numéro payeur */}
            <div style={{ marginBottom: 16 }}>
              <input
                type="tel" placeholder="Votre numéro payeur"
                value={form.numero_payeur}
                onChange={e => setForm({ ...form, numero_payeur: e.target.value })}
                style={{
                  width: '100%', background: '#F7F7F7', border: '1.5px solid #E8E8E8',
                  borderRadius: 12, padding: '13px 14px', fontSize: 15, color: '#1A1A1A',
                }}
              />
            </div>

            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Continuer'}
            </button>

            {/* Instructions */}
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                <span style={{ color: '#34C759', marginRight: 4 }}>✅</span>Montant minimum: {new Intl.NumberFormat('fr-FR').format(minDepot)} FCFA
              </p>
              <p style={{ fontSize: 12, color: '#999' }}>
                <span style={{ color: '#34C759', marginRight: 4 }}>✅</span>Validé sous 24h ouvrables
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px' }}>
          {history.length === 0 ? (
            <div className="empty-state"><i className="fas fa-history" /><p>Aucun dépôt pour l'instant</p></div>
          ) : (
            history.map(d => (
              <div key={d.id} style={{
                background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A' }}>{fmt(d.montant)} FCFA</p>
                    <p style={{ color: '#999', fontSize: 12 }}>{d.pays} • {d.operateur}</p>
                    <p style={{ color: '#ccc', fontSize: 11 }}>{new Date(d.date_depot).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className={`badge badge-${statusColor[d.statut] || 'yellow'}`}>
                    <span className={`status-dot ${statusColor[d.statut] || 'yellow'}`} />
                    {statusLabel[d.statut] || d.statut}
                  </span>
                </div>
                {d.reference && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 10px', background: '#FFF8EE', borderRadius: 8 }}>
                    <i className="fas fa-hashtag" style={{ color: '#FF9500', fontSize: 10 }} />
                    <span style={{ flex: 1, color: '#FF9500', fontSize: 11, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 0.3 }}>{d.reference}</span>
                    <button onClick={() => { navigator.clipboard.writeText(d.reference); import('react-hot-toast').then(m => m.default.success('Référence copiée !')); }} style={{ background: '#FF9500', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', color: '#fff', fontSize: 10, fontWeight: 700 }}>Copier</button>
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
