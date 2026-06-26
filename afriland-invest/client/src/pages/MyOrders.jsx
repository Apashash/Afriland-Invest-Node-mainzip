import React, { useState, useEffect } from 'react';
import Logo from "../components/Logo";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { const res = await api.get('/investment/my-orders'); setOrders(res.data.orders); }
    catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

  const getStatus = (order) => {
    const now = new Date();
    const fin = new Date(order.date_fin);
    if (order.statut === 'annule') return { label: 'Annulé', color: 'red' };
    if (fin < now) return { label: 'Terminé', color: 'blue' };
    return { label: 'Actif', color: 'green' };
  };

  const getDaysLeft = (dateFin) => {
    const now = new Date();
    const fin = new Date(dateFin);
    const diff = Math.ceil((fin - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/account')}><i className="fas fa-arrow-left" /></button>
        <span className="page-title">Mes investissements</span>
        <Logo size="sm" style={{ marginLeft: "auto" }} />
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="loading-spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-chart-line" />
            <p style={{ marginBottom: 16 }}>Aucun investissement</p>
            <button className="btn btn-primary" onClick={() => navigate('/investment')}>Investir maintenant</button>
          </div>
        ) : (
          orders.map(order => {
            const status = getStatus(order);
            const daysLeft = getDaysLeft(order.date_fin);
            const totalGain = parseFloat(order.revenu_journalier) * order.duree_jours;
            const progress = Math.max(0, Math.min(100, ((order.duree_jours - daysLeft) / order.duree_jours) * 100));

            return (
              <div key={order.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{order.plan_nom}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Série {order.serie}</p>
                  </div>
                  <span className={`badge badge-${status.color}`}>
                    <span className={`status-dot ${status.color}`} />
                    {status.label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Montant investi</p>
                    <p style={{ fontWeight: 700, fontSize: 13 }}>{fmt(order.montant)} FCFA</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Gain/jour</p>
                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--green-primary)' }}>+{fmt(order.revenu_journalier)} FCFA</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Début</p>
                    <p style={{ fontWeight: 600, fontSize: 12 }}>{new Date(order.date_debut).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Fin</p>
                    <p style={{ fontWeight: 600, fontSize: 12 }}>{new Date(order.date_fin).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                {status.label === 'Actif' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Progression</span>
                      <span style={{ color: 'var(--green-primary)', fontWeight: 600 }}>{daysLeft} jours restants</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,var(--green-primary),var(--blue-primary))', borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
