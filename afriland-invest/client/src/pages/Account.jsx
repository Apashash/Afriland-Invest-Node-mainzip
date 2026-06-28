import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth.jsx';
import BottomNav from '../components/BottomNav';
import { useLanguage, LangToggle } from '../contexts/LanguageContext.jsx';

export default function Account() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showTxForm, setShowTxForm] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  const [newPass, setNewPass] = useState('');
  const [oldPass, setOldPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [profileRes, pwRes] = await Promise.all([
        api.get('/user/profile'),
        api.get('/user/has-transaction-password'),
      ]);
      setUserInfo(profileRes.data);
      setHasPassword(pwRes.data.has_password);
    } catch {}
  };

  const resetForm = () => {
    setOldPass(''); setNewPass(''); setConfirmPass('');
    setShowTxForm(false);
  };

  const handleTxPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (hasPassword) {
        await api.put('/user/transaction-password', {
          old_password: oldPass, new_password: newPass, confirm_password: confirmPass,
        });
      } else {
        await api.put('/user/transaction-password', { password: newPass });
      }
      toast.success(hasPassword ? t('pass_modified') : t('pass_created'));
      setHasPassword(true);
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

  const inputStyle = {
    width: '100%', background: '#F7F7F7', border: '1.5px solid #E8E8E8',
    borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#1A1A1A',
    boxSizing: 'border-box', marginBottom: 10,
  };
  const pinStyle = { ...inputStyle, textAlign: 'center', letterSpacing: 10, fontSize: 20 };
  const labelStyle = { fontSize: 12, color: '#888', marginBottom: 4, display: 'block' };

  const menuItems = [
    { fa: 'fa-key',          bg: '#FFF3E0', color: '#FF9500', label: t('tx_password_menu'), onPress: () => setShowTxForm(!showTxForm) },
    { fa: 'fa-lock',         bg: '#E8F5E9', color: '#34C759', label: t('my_investments'), path: '/orders' },
    { fa: 'fa-users',        bg: '#E3F2FD', color: '#4A90E2', label: t('my_team'), path: '/referral' },
    { fa: 'fa-crown',        bg: '#FFF8E1', color: '#F5A623', label: t('vip_salary'), path: '/salary' },
    { fa: 'fa-dice',         bg: '#FCE4EC', color: '#FF3B30', label: t('fortune_wheel'), path: '/wheel' },
    { fa: 'fa-wallet',       bg: '#EDE7F6', color: '#5856D6', label: t('my_wallet'), path: '/wallet' },
    { fa: 'fa-question-circle', bg: '#E0F7FA', color: '#00BCD4', label: t('faq_help'), path: '/faq' },
  ];

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 80 }}>

      <div style={{
        background: 'linear-gradient(135deg, #FF9500, #FFB347)',
        padding: '50px 16px 80px', position: 'relative', overflow: 'hidden',
      }}>
        <img src="/payfast-bg.jpg" alt="" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', height: '80%', width: 'auto',
          objectFit: 'contain', mixBlendMode: 'multiply',
        }} />
        <LangToggle style={{ position: 'absolute', top: 14, right: 16, zIndex: 3 }} />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
            background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.6)',
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
              <i className="fas fa-shield-alt" style={{ fontSize: 10 }} /> {t('administrator')}
            </span>
          )}
        </div>
      </div>

      <div style={{ margin: '-50px 16px 16px', position: 'relative', zIndex: 10 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '16px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, textAlign: 'center', background: '#FFF8F0', borderRadius: 12, padding: '10px' }}>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{t('total_deposits')}</p>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#FF9500' }}>
                {fmt(userInfo?.stats?.total_depots || 0)} FCFA
              </p>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: '#F0F8FF', borderRadius: 12, padding: '10px' }}>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{t('total_withdrawals')}</p>
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
        </div>
      </div>

      <div style={{ margin: '0 16px 12px' }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 10 }}>{t('services')}</p>
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {menuItems.map((item, idx) => (
            <React.Fragment key={idx}>
              <button
                onClick={item.path ? () => navigate(item.path) : item.onPress}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`fas ${item.fa}`} style={{ fontSize: 16, color: item.color }} />
                </div>
                <span style={{ flex: 1, fontWeight: 500, fontSize: 14, color: '#1A1A1A' }}>{item.label}</span>
                <i className={`fas ${showTxForm && item.label === t('tx_password_menu') ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ color: '#CCC', fontSize: 12 }} />
              </button>

              {item.label === t('tx_password_menu') && showTxForm && (
                <div style={{ padding: '4px 16px 16px', background: '#FAFAFA' }}>
                  {!hasPassword ? (
                    <form onSubmit={handleTxPassword}>
                      <p style={{ fontSize: 13, color: '#FF9500', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fas fa-plus-circle" /> {t('create_tx_password')}
                      </p>
                      <label style={labelStyle}>{t('pin_label')}</label>
                      <input type="password" inputMode="numeric" placeholder="••••" maxLength={4}
                        value={newPass} onChange={e => setNewPass(e.target.value)} style={pinStyle} />
                      <button type="submit" className="btn btn-primary" disabled={loading} style={{ borderRadius: 12, marginTop: 4 }}>
                        {loading ? <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : t('save')}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleTxPassword}>
                      <p style={{ fontSize: 13, color: '#4A90E2', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fas fa-lock" /> {t('modify_password')}
                      </p>
                      <label style={labelStyle}>{t('old_password')}</label>
                      <input type="password" inputMode="numeric" placeholder="••••" maxLength={4}
                        value={oldPass} onChange={e => setOldPass(e.target.value)} style={pinStyle} />
                      <label style={labelStyle}>{t('new_password')}</label>
                      <input type="password" inputMode="numeric" placeholder="••••" maxLength={4}
                        value={newPass} onChange={e => setNewPass(e.target.value)} style={pinStyle} />
                      <label style={labelStyle}>{t('confirm_password')}</label>
                      <input type="password" inputMode="numeric" placeholder="••••" maxLength={4}
                        value={confirmPass} onChange={e => setConfirmPass(e.target.value)} style={pinStyle} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button type="button" onClick={resetForm} style={{
                          flex: 1, padding: '12px', borderRadius: 12,
                          background: '#F0F0F0', border: 'none', color: '#666',
                          fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        }}>
                          {t('cancel')}
                        </button>
                        <button type="submit" disabled={loading} style={{
                          flex: 2, padding: '12px', borderRadius: 12,
                          background: '#FF9500', border: 'none', color: '#fff',
                          fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        }}>
                          {loading ? <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : t('modify_btn')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {idx < menuItems.length - 1 && <div style={{ height: 1, background: '#F5F5F5', margin: '0 16px' }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {user?.role === 'admin' && (
        <div style={{ margin: '0 16px 12px' }}>
          <button onClick={() => navigate('/admin')} style={{
            width: '100%', padding: '14px', borderRadius: 16,
            background: '#1A1A1A', border: 'none', color: '#FF9500',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <i className="fas fa-shield-alt" /> {t('admin_panel')}
          </button>
        </div>
      )}

      <div style={{ margin: '0 16px 16px' }}>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '14px', borderRadius: 16,
          background: '#fff', border: '1.5px solid #FFE0E0',
          color: '#FF3B30', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="fas fa-sign-out-alt" /> {t('sign_out')}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
