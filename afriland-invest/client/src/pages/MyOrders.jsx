import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';
import { useLanguage, LangToggle } from '../contexts/LanguageContext.jsx';

export default function MyOrders() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await api.get('/investment/my-orders'); setOrders(res.data.orders); }
    catch { toast.error(t('loading_error')); }
    finally { setLoading(false); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

  const getStatus = (order) => {
    const now = new Date();
    const fin = new Date(order.date_fin);
    if (order.statut === 'annule') return { label: t('annule'), bg: '#FFE5E5', color: '#FF3B30' };
    if (fin < now) return { label: t('termine'), bg: '#E5E5FF', color: '#5856D6' };
    return { label: t('actif'), bg: '#E5FFE9', color: '#34C759' };
  };

  const getDaysLeft = (dateFin) => {
    const diff = Math.ceil((new Date(dateFin) - new Date()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const activeCount = orders.filter(o => {
    const fin = new Date(o.date_fin);
    return o.statut !== 'annule' && fin >= new Date();
  }).length;

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 80 }}>

      <div style={{ background: 'linear-gradient(135deg, #FF9500, #FFB347)', padding: '50px 16px 30px', position: 'relative' }}>
        <LangToggle style={{ position: 'absolute', top: 14, right: 16 }} />
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{t('orders')}</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 }}>
          {activeCount} {t('active_investments')}
        </p>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="loading-spinner" /></div>
        ) : orders.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '40px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#1A1A1A', marginBottom: 8 }}>{t('no_orders')}</p>
            <p style={{ color: '#999', fontSize: 14, marginBottom: 20 }}>{t('invest_to_start')}</p>
            <button className="btn btn-primary" onClick={() => navigate('/investment')} style={{ maxWidth: 200, margin: '0 auto' }}>
              {t('see_plans')}
            </button>
          </div>
        ) : (
          orders.map(order => {
            const status = getStatus(order);
            const daysLeft = getDaysLeft(order.date_fin);
            const progress = Math.max(0, Math.min(100, ((order.duree_jours - daysLeft) / order.duree_jours) * 100));
            const isActive = status.label === t('actif');

            return (
              <div key={order.id} style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A' }}>{order.plan_nom}</p>
                    <p style={{ color: '#999', fontSize: 12 }}>{t('series')} {order.serie}</p>
                  </div>
                  <span style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: status.bg, color: status.color }}>
                    {status.label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: '#F7F7F7', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{t('invested_amount')}</p>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#1A1A1A' }}>{fmt(order.montant)} FCFA</p>
                  </div>
                  <div style={{ background: '#FFF8F0', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{t('gain_day')}</p>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#FF9500' }}>+{fmt(order.revenu_journalier)} FCFA</p>
                  </div>
                  <div style={{ background: '#F7F7F7', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{t('start')}</p>
                    <p style={{ fontWeight: 600, fontSize: 12, color: '#1A1A1A' }}>{new Date(order.date_debut).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div style={{ background: '#F7F7F7', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{t('end_date')}</p>
                    <p style={{ fontWeight: 600, fontSize: 12, color: '#1A1A1A' }}>{new Date(order.date_fin).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                {isActive && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#999' }}>{t('progress')}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#FF9500' }}>{daysLeft} {t('days_remaining')}</span>
                    </div>
                    <div style={{ height: 6, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${progress}%`, height: '100%',
                        background: 'linear-gradient(90deg, #FF9500, #FFB347)',
                        borderRadius: 3, transition: 'width 0.5s',
                      }} />
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
