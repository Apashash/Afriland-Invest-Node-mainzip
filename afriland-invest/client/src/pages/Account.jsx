import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth.jsx';
import BottomNav from '../components/BottomNav';

export default function Account() {
  const [txPassword, setTxPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showTxForm, setShowTxForm] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await api.get('/user/profile'); setUserInfo(res.data); }
    catch {}
  };

  const handleTxPassword = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(txPassword)) return toast.error('4 chiffres requis');
    setLoading(true);
    try {
      await api.put('/user/transaction-password', { password: txPassword });
      toast.success('Mot de passe de transaction défini');
      setTxPassword(''); setShowTxForm(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

  const menuItems = [
    { icon: '🔑', label: 'Mot de passe transaction', onPress: () => setShowTxForm(!showTxForm) },
    { icon: '🔒', label: 'Mes investissements', path: '/orders' },
    { icon: '👥', label: 'Mon équipe', path: '/referral' },
    { icon: '👑', label: 'Salaire VIP', path: '/salary' },
    { icon: '🎰', label: 'Roue de la fortune', path: '/wheel' },
    { icon: '💼', label: 'Mon portefeuille', path: '/wallet' },
    { icon: '❓', label: 'FAQ / Aide', path: '/faq' },
    { icon: 'ℹ️', label: 'À propos', onPress: () => toast('PayFast v1.0') },
  ];

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 80 }}>

      {/* En-tête orange avec infos utilisateur */}
      <div style={{
        background: 'linear-gradient(135deg, #FF9500, #FFB347)',
        padding: '50px 16px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 14px)',
        }} />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
            background: 'rgba(255,255,255,0.25)',
            border: '3px solid rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: '#fff',
          }}>
            {user?.nom?.[0]?.toUpperCase() || 'U'}
          </div>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{user?.nom}</p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{user?.telephone}</p>
          {user?.role === 'admin' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 8, padding: '4px 12px', borderRadius: 20,
              background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 12, fontWeight: 600,
            }}>
              <i className="fas fa-shield-alt" style={{ fontSize: 10 }} /> Administrateur
            </span>
          )}
        </div>
      </div>

      {/* Carte solde flottante */}
      <div style={{ margin: '-50px 16px 16px', position: 'relative', zIndex: 10 }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '16px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, textAlign: 'center', background: '#FFF8F0', borderRadius: 12, padding: '10px' }}>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>Dépôts totaux</p>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#FF9500' }}>
                {fmt(userInfo?.stats?.total_depots || 0)} FCFA
              </p>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: '#F0F8FF', borderRadius: 12, padding: '10px' }}>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>Retraits totaux</p>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#4A90E2' }}>
                {fmt(userInfo?.stats?.total_retraits || 0)} FCFA
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/deposit')} style={{
              flex: 1, padding: '12px', borderRadius: 50,
              background: '#FF9500', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              Recharger
            </button>
            <button onClick={() => navigate('/withdrawal')} style={{
              flex: 1, padding: '12px', borderRadius: 50,
              background: '#1A1A1A', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              Retirer
            </button>
          </div>
        </div>
      </div>

      {/* Menu services */}
      <div style={{ margin: '0 16px 12px' }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 10 }}>Services</p>
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {menuItems.map((item, idx) => (
            <React.Fragment key={idx}>
              <button
                onClick={item.path ? () => navigate(item.path) : item.onPress}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{item.icon}</span>
                <span style={{ flex: 1, fontWeight: 500, fontSize: 14, color: '#1A1A1A' }}>{item.label}</span>
                <i className="fas fa-chevron-right" style={{ color: '#CCC', fontSize: 12 }} />
              </button>
              {/* Form mot de passe transaction */}
              {item.label === 'Mot de passe transaction' && showTxForm && (
                <div style={{ padding: '0 16px 16px', borderBottom: idx < menuItems.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
                  <form onSubmit={handleTxPassword}>
                    <input
                      type="password" placeholder="4 chiffres" maxLength={4} value={txPassword}
                      onChange={e => setTxPassword(e.target.value)}
                      style={{
                        width: '100%', background: '#F7F7F7', border: '1.5px solid #E8E8E8',
                        borderRadius: 12, padding: '12px', textAlign: 'center',
                        letterSpacing: 10, fontSize: 20, marginBottom: 10,
                      }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ borderRadius: 12 }}>
                      {loading ? <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Enregistrer'}
                    </button>
                  </form>
                </div>
              )}
              {idx < menuItems.length - 1 && <div style={{ height: 1, background: '#F5F5F5', margin: '0 16px' }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Admin */}
      {user?.role === 'admin' && (
        <div style={{ margin: '0 16px 12px' }}>
          <button onClick={() => navigate('/admin')} style={{
            width: '100%', padding: '14px', borderRadius: 16,
            background: '#1A1A1A', border: 'none', color: '#FF9500',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <i className="fas fa-shield-alt" /> Panneau d'administration
          </button>
        </div>
      )}

      {/* Déconnexion */}
      <div style={{ margin: '0 16px 16px' }}>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '14px', borderRadius: 16,
          background: '#fff', border: '1.5px solid #FFE0E0',
          color: '#FF3B30', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="fas fa-sign-out-alt" /> Se déconnecter
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
