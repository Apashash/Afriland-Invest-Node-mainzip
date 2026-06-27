import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth.jsx';
import BottomNav from '../components/BottomNav';
import { useLanguage, LangToggle } from '../contexts/LanguageContext.jsx';

const FAUX_NOTIFS = [
  '🎉 Jean C. a retiré 15 000 FCFA',
  '📈 Marie D. a investi dans VIP 3',
  '💰 Paul O. a reçu 8 500 FCFA de revenus',
  '👥 Alice B. a rejoint via parrainage',
  '💸 Ibrahim S. a retiré 45 000 FCFA',
  '🚀 Fatou N. a activé le plan VIP 5',
];

const STATIC_SLIDES = [
  { id: 's1', image_local: '/slide1.jpg', titre: 'Investissez & Gagnez', contenu: 'Des rendements jusqu\'à 19.5% par jour' },
  { id: 's2', image_local: '/slide2.jpg', titre: 'Partenariats Solides', contenu: 'Rejoignez une communauté de confiance' },
  { id: 's3', image_local: '/slide3.jpg', titre: 'Opportunités Premium', contenu: 'Accédez à des plans VIP exclusifs' },
  { id: 's4', image_local: '/slide4.jpg', titre: 'Croissance Financière', contenu: 'Maximisez vos revenus dès aujourd\'hui' },
];

const MENU_ICONS = [
  { icon: 'fa-headset', key: 'service', path: '/faq', bg: '#4A90E2' },
  { icon: 'fa-dice', key: 'lottery', path: '/wheel', bg: '#FF3B30' },
  { icon: 'fa-gift', key: 'bonus', path: '/salary', bg: '#FF9500' },
  { icon: 'fa-receipt', key: 'details', path: '/transactions', bg: '#5856D6' },
];

const NOTIF_SEEN_KEY = 'notif_last_seen';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slideIdx, setSlideIdx] = useState(0);
  const [notifIdx, setNotifIdx] = useState(0);
  const [annonces, setAnnonces] = useState([]);
  const [lienWhatsapp, setLienWhatsapp] = useState('https://wa.me/237600000000');
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const slideTimerRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    loadData();
    loadAnnonces();
    loadNotifications();
    const notifTimer = setInterval(() => setNotifIdx(i => (i + 1) % FAUX_NOTIFS.length), 3000);
    return () => clearInterval(notifTimer);
  }, []);

  useEffect(() => {
    clearInterval(slideTimerRef.current);
    const slides = annonces.length > 0 ? annonces : STATIC_SLIDES;
    slideTimerRef.current = setInterval(() => setSlideIdx(i => (i + 1) % slides.length), 4000);
    return () => clearInterval(slideTimerRef.current);
  }, [annonces]);

  const loadData = async () => {
    try {
      const res = await api.get('/user/dashboard');
      setData(res.data);
    } catch { toast.error(t('loading_error')); }
    finally { setLoading(false); }
  };

  const loadAnnonces = async () => {
    try {
      const [annoncesRes, settingsRes] = await Promise.all([
        api.get('/annonces'),
        api.get('/settings/public'),
      ]);
      setAnnonces(annoncesRes.data.annonces || []);
      if (settingsRes.data.lien_whatsapp) setLienWhatsapp(settingsRes.data.lien_whatsapp);
    } catch {}
  };

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      const list = res.data.notifications || [];
      setNotifs(list);
      const lastSeen = localStorage.getItem(NOTIF_SEEN_KEY);
      const unread = lastSeen
        ? list.filter(n => new Date(n.date) > new Date(lastSeen)).length
        : list.length;
      setUnreadCount(unread);
    } catch {}
  };

  const openNotifs = () => {
    setShowNotifs(true);
    localStorage.setItem(NOTIF_SEEN_KEY, new Date().toISOString());
    setUnreadCount(0);
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
  const solde = data?.user?.solde || 0;

  const slides = annonces.length > 0 ? annonces : STATIC_SLIDES;
  const cur = slides[slideIdx % slides.length] || slides[0];

  if (loading) return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fff' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 80 }}>

      {/* ─── EN-TÊTE ─── */}
      <div style={{
        padding: '50px 16px 70px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 200,
      }}>
        {/* Fond orange uniforme */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #E07800 0%, #FF9500 100%)',
        }} />
        {/* Logo PayFast centré */}
        <img
          src="/payfast-bg.jpg"
          alt=""
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            height: '80%',
            width: 'auto',
            objectFit: 'contain',
            mixBlendMode: 'multiply',
          }}
        />

        {/* Bandeau notif défilant */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.3)', padding: '5px 0', overflow: 'hidden', zIndex: 3,
        }}>
          <div style={{ animation: 'ticker 20s linear infinite', whiteSpace: 'nowrap', fontSize: 12, color: '#fff' }}>
            &nbsp;&nbsp;&nbsp;{FAUX_NOTIFS[notifIdx]}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </div>
        </div>

        {/* Barre top : icônes droite */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', zIndex: 2, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {user?.role === 'admin' && (
              <button onClick={() => navigate('/admin')} style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="fas fa-shield-alt" style={{ fontSize: 14 }} />
              </button>
            )}
            <LangToggle />
            <button onClick={openNotifs} style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <i className="fas fa-bell" style={{ fontSize: 14 }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#FF3B30', color: '#fff',
                  fontSize: 9, fontWeight: 800,
                  width: 16, height: 16, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #FF9500',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Texte central */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600, marginBottom: 4, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            {t('invest_grow')}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 12 }}>{t('total_balance')}</p>
          <p style={{ color: '#fff', fontSize: 34, fontWeight: 800, lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            {fmt(solde)} <span style={{ fontSize: 18, fontWeight: 600 }}>FCFA</span>
          </p>
        </div>
      </div>

      {/* ─── CARTE SOLDE FLOTTANTE ─── */}
      <div style={{ margin: '-40px 16px 16px', position: 'relative', zIndex: 10 }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '16px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button onClick={() => navigate('/deposit')} style={{
              flex: 1, padding: '12px', borderRadius: 50,
              background: '#FF9500', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(255,149,0,0.4)',
            }}>
              {t('recharge')}
            </button>
            <button onClick={() => navigate('/withdrawal')} style={{
              flex: 1, padding: '12px', borderRadius: 50,
              background: '#1A1A1A', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              {t('withdraw')}
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: '#FFF8F0', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{t('revenues')}</p>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#FF9500' }}>{fmt(data?.user?.revenus_totaux)} FCFA</p>
            </div>
            <div style={{ flex: 1, background: '#F0F8FF', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{t('referrals')}</p>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#4A90E2' }}>{data?.user?.nombre_filleuls || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PARTAGER & GAGNER ─── */}
      <div style={{ margin: '0 16px 16px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #E8F4FD 0%, #D4EDFF 100%)',
          borderRadius: 16, padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#1A1A1A', marginBottom: 8 }}>{t('share_earn')}</p>
            <button onClick={() => navigate('/referral')} style={{
              padding: '8px 20px', borderRadius: 50,
              background: '#fff', border: 'none',
              color: '#FF3B30', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              {t('invite_now')}
            </button>
          </div>
          <div style={{ fontSize: 48 }}>🎁</div>
        </div>
      </div>

      {/* ─── MENU ICÔNES ─── */}
      <div style={{ margin: '0 16px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {MENU_ICONS.map(item => (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: item.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 3px 10px ${item.bg}44`,
              }}>
                <i className={`fas ${item.icon}`} style={{ fontSize: 20, color: '#fff' }} />
              </div>
              <span style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>{t(item.key)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── SLIDER ANNONCES ─── */}
      <div style={{ margin: '0 16px 16px' }}>
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          height: 160, position: 'relative',
          background: '#1A1A1A',
        }}>
          {(cur.image || cur.image_local) ? (
            <>
              <img
                src={cur.image ? `/uploads/${cur.image}` : cur.image_local}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '30px 18px 30px', background: 'linear-gradient(transparent, rgba(0,0,0,0.65))' }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{cur.titre}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{cur.contenu}</p>
              </div>
            </>
          ) : (
            <>
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(135deg, ${cur.couleur}, ${cur.couleur}bb)`,
              }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 18px 16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{cur.titre}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{cur.contenu}</p>
              </div>
            </>
          )}
          <div style={{ position: 'absolute', bottom: 10, right: 12, display: 'flex', gap: 4 }}>
            {slides.map((_, i) => (
              <div key={i} style={{ width: i === slideIdx ? 16 : 6, height: 6, borderRadius: 3, transition: 'all 0.3s', background: i === slideIdx ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setSlideIdx(i)} />
            ))}
          </div>
        </div>
      </div>

      {/* ─── MEILLEURES VENTES ─── */}
      <div style={{ margin: '0 16px 16px' }}>
        <p className="section-title">{t('best_sellers')}</p>

        {data?.commandes_actives?.length > 0 ? (
          data.commandes_actives.slice(0, 2).map(cmd => (
            <PlanCard key={cmd.id} plan={{
              nom: cmd.plan_nom, prix: cmd.montant,
              duree_jours: cmd.jours_restants, revenu_journalier: cmd.revenu_journalier,
              revenu_total: cmd.revenu_journalier * cmd.jours_restants,
            }} badge="Actif" onInvest={null} />
          ))
        ) : null}

        <button onClick={() => navigate('/investment')} style={{
          width: '100%', padding: '14px', borderRadius: 16,
          background: '#fff', border: '2px dashed #E8E8E8',
          color: '#FF9500', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="fas fa-th-large" /> {t('see_all')}
        </button>
      </div>

      {/* ─── PLANS ACTIFS ─── */}
      {data?.commandes_actives?.length > 0 && (
        <div style={{ margin: '0 16px 16px' }}>
          <p className="section-title">{t('active_plans')} ({data.commandes_actives.length})</p>
          {data.commandes_actives.map(cmd => (
            <div key={cmd.id} style={{
              background: '#fff', borderRadius: 14, padding: '14px 16px',
              marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#1A1A1A' }}>{cmd.plan_nom}</p>
                <p style={{ color: '#999', fontSize: 12 }}>Fin: {new Date(cmd.date_fin).toLocaleDateString('fr-FR')}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#FF9500', fontWeight: 700, fontSize: 15 }}>+{fmt(cmd.revenu_journalier)}/j</p>
                <span className="badge badge-green">Actif</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />

      {/* ─── PANNEAU NOTIFICATIONS ─── */}
      {showNotifs && (
        <div onClick={() => setShowNotifs(false)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 300,
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '24px 24px 0 0',
            width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header panneau */}
            <div style={{
              background: 'linear-gradient(135deg, #E07800, #FF9500)',
              borderRadius: '24px 24px 0 0', padding: '20px 20px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-bell" style={{ color: '#fff', fontSize: 16 }} />
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{t('notifications')}</p>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{notifs.length} {t('operations')}</p>
                </div>
              </div>
              <button onClick={() => setShowNotifs(false)} style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)', border: 'none',
                color: '#fff', cursor: 'pointer', fontSize: 14,
              }}>✕</button>
            </div>

            {/* Liste */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px 24px' }}>
              {notifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FFF8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <i className="fas fa-bell-slash" style={{ fontSize: 24, color: '#FF9500' }} />
                  </div>
                  <p style={{ fontWeight: 600, color: '#666' }}>{t('no_notif')}</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>{t('no_notif_sub')}</p>
                </div>
              ) : notifs.map((n, idx) => {
                const STATUT_COLOR = {
                  valide:     '#34C759', actif: '#34C759', termine: '#34C759',
                  en_attente: '#FF9500',
                  rejete:     '#FF3B30', annule: '#FF3B30', refuse: '#FF3B30',
                };
                const sc = STATUT_COLOR[n.statut] || '#FF9500';
                const isNew = !localStorage.getItem(NOTIF_SEEN_KEY)
                  ? true
                  : new Date(n.date) > new Date(localStorage.getItem(NOTIF_SEEN_KEY));
                return (
                  <div key={n.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 14, marginBottom: 8,
                    background: isNew ? '#FFF8F0' : '#F5F1E8',
                    border: isNew ? '1px solid #FF950030' : '1px solid transparent',
                  }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: `${n.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`fas ${n.icon}`} style={{ color: n.color, fontSize: 16 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#1A1A1A', marginBottom: 2 }}>{n.titre}</p>
                      <p style={{ fontSize: 12, color: '#666' }}>{n.message}</p>
                      <p style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        {n.date ? new Date(n.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                    {isNew && idx === 0 && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF3B30', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp flottant */}
      <a href={lienWhatsapp} target="_blank" rel="noreferrer" style={{
        position: 'fixed', bottom: 80, right: 16, zIndex: 200,
        width: 50, height: 50, borderRadius: '50%',
        background: '#25D366',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(37,211,102,0.5)',
      }}>
        <i className="fab fa-whatsapp" style={{ fontSize: 26, color: '#fff' }} />
      </a>
    </div>
  );
}

function PlanCard({ plan, badge, onInvest }) {
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
  return (
    <div style={{
      background: 'linear-gradient(135deg, #9B59B6, #6C3483)',
      borderRadius: 16, padding: '14px 16px', marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 4px 16px rgba(155,89,182,0.3)',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(135deg, #FF9500, #FFB347)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img src="/vip-icon.png" alt="VIP" style={{ width: '85%', height: '85%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{plan.nom}</p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Durée: {plan.duree_jours} jours</p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Profit/jour: {fmt(plan.revenu_journalier)} FCFA</p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Profit total: {fmt(plan.revenu_total)} FCFA</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{fmt(plan.prix)}</p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 8 }}>FCFA</p>
        {onInvest && (
          <button onClick={onInvest} style={{
            padding: '6px 14px', borderRadius: 50,
            background: '#FF9500', border: 'none',
            color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}>Investir</button>
        )}
        {badge && <span className="badge badge-green">{badge}</span>}
      </div>
    </div>
  );
}
