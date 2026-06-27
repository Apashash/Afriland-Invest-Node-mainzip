import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';

const NAV_ITEMS = [
  { path: '/', icon: 'fa-home', key: 'nav_home' },
  { path: '/investment', icon: 'fa-th-large', key: 'nav_products' },
  { path: '/orders', icon: 'fa-clipboard-list', key: 'nav_orders' },
  { path: '/referral', icon: 'fa-users', key: 'nav_team' },
  { path: '/account', icon: 'fa-user', key: 'nav_account' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: '#fff',
      borderTop: '1px solid #EBEBEB',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
      zIndex: 100,
    }}>
      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              background: 'none', border: 'none', padding: '4px 6px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              cursor: 'pointer', flex: 1, transition: 'var(--transition)',
              color: active ? '#FF9500' : '#999999',
            }}
          >
            <i className={`fas ${item.icon}`} style={{ fontSize: 19 }} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{t(item.key)}</span>
          </button>
        );
      })}
    </nav>
  );
}
