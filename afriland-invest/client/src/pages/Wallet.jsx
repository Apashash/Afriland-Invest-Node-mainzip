import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';
import { useLanguage, LangToggle } from '../contexts/LanguageContext.jsx';

const PAYS_METHODES_FALLBACK = {
  'Cameroun':       ['MTN Mobile Money', 'Orange Money'],
  "Côte d'Ivoire":  ['MTN Mobile Money', 'Moov Money', 'Orange Money', 'Wave'],
  'Bénin':          ['MTN Mobile Money', 'Moov Money'],
  'Burkina Faso':   ['Moov Money', 'Orange Money'],
  'Togo':           ['Flooz (Moov)', 'T-Money'],
};

const TYPE_CONFIG = {
  revenu_journalier: { label: 'Revenu journalier', icon: 'fa-coins',           color: '#34C759' },
  parrainage:        { label: 'Commission parrainage', icon: 'fa-users',        color: '#007AFF' },
  bonus:             { label: 'Bonus roue',          icon: 'fa-dice',           color: '#AF52DE' },
  credit_admin:      { label: 'Crédit admin',        icon: 'fa-user-shield',    color: '#FF9500' },
  cadeau_vip:        { label: 'Cadeau VIP',          icon: 'fa-gift',           color: '#FF2D55' },
};

function fmt(n) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }

function groupByDay(rows) {
  const map = {};
  rows.forEach(r => {
    const day = new Date(r.date_paiement).toISOString().split('T')[0];
    if (!map[day]) map[day] = [];
    map[day].push(r);
  });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function Wallet() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    nom_portefeuille: '',
    pays: '',
    methode_paiement: '',
    numero_telephone: '',
  });
  const [userPays, setUserPays] = useState('');
  const [wallets, setWallets] = useState([]);
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [methodes, setMethodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [walletRes, histRes, opsRes, userRes] = await Promise.all([
        api.get('/user/wallet'),
        api.get('/investment/revenue-history'),
        api.get('/deposit/operators').catch(() => ({ data: [] })),
        api.get('/user/profile').catch(() => ({ data: {} })),
      ]);

      // Pays d'inscription de l'utilisateur
      const inscritPays = userRes.data?.user?.pays || userRes.data?.pays || 'Cameroun';
      setUserPays(inscritPays);

      // Opérateurs pour ce pays uniquement
      const ops = opsRes.data || [];
      const paysMap = {};
      ops.forEach(o => { paysMap[o.pays] = o.operateurs; });
      const opsForPays = paysMap[inscritPays] || PAYS_METHODES_FALLBACK[inscritPays] || [];
      setMethodes(opsForPays);

      setWallets(walletRes.data.wallets);

      if (walletRes.data.wallets.length > 0) {
        const w = walletRes.data.wallets[0];
        // Garder l'opérateur sauvegardé s'il est valide, sinon prendre le premier
        const methodeValide = opsForPays.includes(w.methode_paiement) ? w.methode_paiement : (opsForPays[0] || '');
        setForm({ nom_portefeuille: w.nom_portefeuille, pays: inscritPays, methode_paiement: methodeValide, numero_telephone: w.numero_telephone });
      } else {
        setForm(f => ({ ...f, pays: inscritPays, methode_paiement: opsForPays[0] || '' }));
      }

      setRevenueHistory(histRes.data.history || []);
    } catch { toast.error(t('loading_error')); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom_portefeuille || !form.numero_telephone) return toast.error(t('fill_all'));
    setSubmitting(true);
    try {
      await api.post('/user/wallet', { ...form, pays: userPays });
      toast.success(t('wallet_saved'));
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setSubmitting(false); }
  };

  const inputStyle = {
    width: '100%', background: '#F7F7F7', border: '1.5px solid #E8E8E8',
    borderRadius: 12, padding: '13px 14px', fontSize: 14, color: '#1A1A1A',
    boxSizing: 'border-box', outline: 'none', appearance: 'none', WebkitAppearance: 'none',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, display: 'block' };

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 80 }}>

      <div style={{ padding: '50px 16px 70px', position: 'relative', overflow: 'hidden', minHeight: 140 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #E07800 0%, #FF9500 100%)' }} />
        <img src="/payfast-bg.jpg" alt="" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', height: '80%', width: 'auto',
          objectFit: 'contain', mixBlendMode: 'multiply',
        }} />
        <button onClick={() => navigate('/account')} style={{
          position: 'absolute', top: 14, left: 16, zIndex: 3,
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="fas fa-arrow-left" style={{ fontSize: 14 }} />
        </button>
        <LangToggle style={{ position: 'absolute', top: 14, right: 16, zIndex: 3 }} />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', paddingTop: 8 }}>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {t('wallet_title')}
          </p>
          <p style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>
            <i className="fas fa-wallet" style={{ marginRight: 8 }} />
            {t('withdrawal_account')}
          </p>
        </div>
      </div>

      <div style={{ margin: '-40px 16px 16px', position: 'relative', zIndex: 10 }}>
        {loading ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loading-spinner" />
          </div>
        ) : wallets.length > 0 ? (
          <div style={{ background: 'linear-gradient(135deg, #FF9500, #FFB347)', borderRadius: 20, padding: '18px 20px', boxShadow: '0 4px 20px rgba(255,149,0,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-wallet" style={{ fontSize: 20, color: '#fff' }} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{wallets[0].nom_portefeuille}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{wallets[0].methode_paiement}</p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                  {wallets[0].pays}
                </span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: 12 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>{t('withdrawal_number')}</p>
              <p style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: 1 }}>{wallets[0].numero_telephone}</p>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 20, padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px', background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-wallet" style={{ fontSize: 24, color: '#FF9500' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 4 }}>{t('no_wallet')}</p>
            <p style={{ fontSize: 13, color: '#999' }}>{t('add_withdrawal_account')}</p>
          </div>
        )}
      </div>

      <div style={{ margin: '0 16px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: '#FFF3E0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-edit" style={{ fontSize: 14, color: '#FF9500' }} />
            </span>
            {wallets.length > 0 ? t('edit_wallet') : t('add_wallet')}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{t('wallet_name')}</label>
              <input type="text" placeholder="Ex: Mon compte MTN"
                value={form.nom_portefeuille}
                onChange={e => setForm({ ...form, nom_portefeuille: e.target.value })}
                style={inputStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{t('country')}</label>
              <div style={{
                ...inputStyle, display: 'flex', alignItems: 'center', gap: 8,
                background: '#F0F0F0', color: '#555', cursor: 'not-allowed',
              }}>
                <i className="fas fa-lock" style={{ fontSize: 11, color: '#aaa' }} />
                <span>{userPays || form.pays}</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{t('payment_method')}</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={form.methode_paiement}
                  onChange={e => setForm({ ...form, methode_paiement: e.target.value })}
                  style={{ ...inputStyle, paddingRight: 36 }}
                >
                  {methodes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <i className="fas fa-chevron-down" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#999', pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>{t('phone_number')}</label>
              <input type="tel" placeholder="+237600000000"
                value={form.numero_telephone}
                onChange={e => setForm({ ...form, numero_telephone: e.target.value })}
                style={inputStyle} />
            </div>

            <button type="submit" disabled={submitting} style={{
              width: '100%', padding: '14px', borderRadius: 50,
              background: '#FF9500', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(255,149,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {submitting
                ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />
                : <><i className="fas fa-save" /> {t('save')}</>}
            </button>
          </form>
        </div>
      </div>

      {/* ── Historique des revenus ── */}
      <div style={{ margin: '0 16px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#34C75915', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-history" style={{ color: '#34C759', fontSize: 15 }} />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: '#1A1A1A' }}>Historique des revenus</p>
            <p style={{ fontSize: 11, color: '#999' }}>50 dernières entrées</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><div className="loading-spinner" /></div>
        ) : revenueHistory.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 12px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-coins" style={{ fontSize: 22, color: '#ccc' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A', marginBottom: 4 }}>Aucun revenu pour l'instant</p>
            <p style={{ fontSize: 12, color: '#999' }}>Vos gains apparaîtront ici après le premier versement.</p>
          </div>
        ) : (
          <div>
            {groupByDay(revenueHistory).map(([day, items]) => {
              const totalJour = items.reduce((s, r) => s + parseFloat(r.montant), 0);
              const dateLabel = new Date(day).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

              return (
                <div key={day} style={{ marginBottom: 14 }}>
                  {/* En-tête du jour */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 2 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'capitalize' }}>{dateLabel}</p>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#34C759' }}>+{fmt(totalJour)} FCFA</span>
                  </div>

                  {/* Lignes du jour */}
                  <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                    {items.map((r, idx) => {
                      const cfg = TYPE_CONFIG[r.type] || { label: r.type, icon: 'fa-coins', color: '#FF9500' };
                      const heure = new Date(r.date_paiement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={r.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '13px 16px',
                          borderBottom: idx < items.length - 1 ? '1px solid #F5F5F5' : 'none',
                        }}>
                          <div style={{ width: 38, height: 38, borderRadius: 11, background: cfg.color + '18', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className={`fas ${cfg.icon}`} style={{ fontSize: 15, color: cfg.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: 13, color: '#1A1A1A' }}>{cfg.label}</p>
                            <p style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{heure}</p>
                          </div>
                          <p style={{ fontWeight: 800, fontSize: 15, color: '#34C759', flexShrink: 0 }}>+{fmt(r.montant)} FCFA</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
