import React, { useState, useEffect } from 'react';
import Logo from "../components/Logo";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';
import { useLanguage, LangToggle } from '../contexts/LanguageContext.jsx';

const VIP_META = {
  1: { color: '#1B2A6B', icon: 'fas fa-star' },
  2: { color: '#a855f7', icon: 'fas fa-gem' },
  3: { color: '#f59e0b', icon: 'fas fa-crown' },
};

export default function Salary() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { const res = await api.get('/investment/salary'); setData(res.data); }
    catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const claim = async (niveau) => {
    setClaiming(niveau);
    try {
      const res = await api.post('/investment/claim-gift', { niveau });
      toast.success(res.data.message || t('claim_gift'));
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la réclamation');
    } finally { setClaiming(null); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
  const count = data?.filleuls_investisseurs || 0;

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/account')}><i className="fas fa-arrow-left" /></button>
        <span className="page-title">{t('vip_gifts')}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <LangToggle style={{ background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.15)', color: '#1A1A1A' }} />
          <Logo size="sm" />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><div className="loading-spinner" /></div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(168,85,247,0.15))', borderColor: 'rgba(245,158,11,0.3)', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(245,158,11,0.15)', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <i className="fas fa-gift" style={{ fontSize: 28, color: '#f59e0b' }} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{t('invested_referrals')}</p>
            <p style={{ fontWeight: 800, fontSize: 30, color: 'var(--green-primary)' }}>{fmt(count)}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
              {t('current_level')} : <strong>VIP {data?.niveau || 0}</strong>
            </p>
            {data?.prochain && (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                {t('more_needed').replace('{n}', fmt(data.prochain.restant)).replace('{lvl}', data.prochain.niveau)}
              </p>
            )}
          </div>

          <p className="section-title">{t('vip_levels_gifts')}</p>
          {(data?.niveaux || []).map((lvl) => {
            const meta = VIP_META[lvl.niveau] || { color: '#6b7280', icon: 'fas fa-star' };
            const pct = Math.min(100, (count / lvl.requis) * 100);
            return (
              <div key={lvl.niveau} className="card" style={{ marginBottom: 12, padding: '16px', border: `1px solid ${lvl.atteint ? meta.color + '55' : 'var(--border-color)'}`, background: lvl.atteint ? `${meta.color}0d` : 'var(--bg-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={meta.icon} style={{ color: meta.color, fontSize: 18 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>VIP {lvl.niveau}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(lvl.requis)} {t('invested_required')}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 800, fontSize: 18, color: meta.color }}>{fmt(lvl.cadeau)}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('fcfa_gift')}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
                  <span>{t('progress')}</span>
                  <span style={{ color: meta.color, fontWeight: 600 }}>{fmt(count)} / {fmt(lvl.requis)}</span>
                </div>
                <div style={{ height: 7, background: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: meta.color, borderRadius: 4 }} />
                </div>

                {lvl.statut === 'valide' ? (
                  <div style={{ textAlign: 'center', padding: '10px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', color: 'var(--success, #16a34a)', fontWeight: 700, fontSize: 13 }}>
                    <i className="fas fa-check-circle" style={{ marginRight: 6 }} />{t('gift_received')}
                  </div>
                ) : lvl.statut === 'en_attente' ? (
                  <div style={{ textAlign: 'center', padding: '10px', borderRadius: 8, background: 'rgba(245,158,11,0.12)', color: '#d97706', fontWeight: 700, fontSize: 13 }}>
                    <i className="fas fa-clock" style={{ marginRight: 6 }} />{t('pending_confirmation')}
                  </div>
                ) : lvl.atteint ? (
                  <button className="btn btn-primary" disabled={claiming === lvl.niveau} onClick={() => claim(lvl.niveau)} style={{ width: '100%', padding: '12px' }}>
                    {claiming === lvl.niveau
                      ? <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      : <><i className="fas fa-gift" /> {lvl.statut === 'rejete' ? t('claim_again') : t('claim_gift')}</>}
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', padding: '10px', borderRadius: 8, background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 13 }}>
                    <i className="fas fa-lock" style={{ marginRight: 6 }} />{t('still_needed').replace('{n}', fmt(Math.max(0, lvl.requis - count)))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="card" style={{ background: 'rgba(27,42,107,0.08)', marginTop: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--green-primary)' }}>
              <i className="fas fa-info-circle" style={{ marginRight: 8 }} />{t('how_it_works')}
            </p>
            <ol style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16 }}>
              <li>{t('salary_step1')}</li>
              <li>{t('salary_step2')}</li>
              <li>{t('salary_step3')}</li>
              <li>{t('salary_step4')}</li>
            </ol>
            <button className="btn btn-primary" onClick={() => navigate('/referral')} style={{ marginTop: 14, padding: '12px' }}>
              <i className="fas fa-users" /> {t('referral_program')}
            </button>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
