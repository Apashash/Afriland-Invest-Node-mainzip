import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';

export default function Referral() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openLevel, setOpenLevel] = useState(1);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await api.get('/referral/data'); setData(res.data); }
    catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copié !'));
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
  const lien = data?.code_parrainage ? `${window.location.origin}?p=${data.code_parrainage}` : '';

  const NIVEAUX = [
    { num: 1, commission: data?.commissions?.niveau1 ?? '10' },
    { num: 2, commission: data?.commissions?.niveau2 ?? '5' },
    { num: 3, commission: data?.commissions?.niveau3 ?? '2' },
  ];

  const totalPersonnes = NIVEAUX.reduce((s, n) => s + (data?.[`niveau${n.num}`]?.count || 0), 0);

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 80 }}>

      {/* En-tête */}
      <div style={{
        background: 'linear-gradient(135deg, #FF9500, #FFB347)',
        padding: '50px 16px 30px',
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
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>Équipe</h1>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><div className="loading-spinner" /></div>
      ) : (
        <div style={{ padding: '16px' }}>

          {/* Lien invitation */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 12 }}>Lien d'invitation</p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#F7F7F7', borderRadius: 12, padding: '10px 14px', marginBottom: 12,
            }}>
              <p style={{ flex: 1, fontSize: 12, color: '#666', wordBreak: 'break-all' }}>
                {lien || '—'}
              </p>
              <button onClick={() => copy(lien)} style={{
                padding: '8px 16px', borderRadius: 50,
                background: '#FF9500', border: 'none',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
              }}>
                Copier
              </button>
            </div>

            {/* Partage réseaux sociaux */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              {[
                { icon: 'fa-whatsapp', color: '#25D366', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent('Rejoignez AFRILAND INVEST: ' + lien)}` },
                { icon: 'fa-facebook', color: '#1877F2', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(lien)}` },
                { icon: 'fa-telegram', color: '#229ED9', label: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(lien)}` },
                { icon: 'fa-twitter', color: '#1DA1F2', label: 'Twitter', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent('Rejoignez AFRILAND INVEST: ' + lien)}` },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: s.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 3px 10px ${s.color}44`,
                  }}>
                    <i className={`fab ${s.icon}`} style={{ fontSize: 22, color: '#fff' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#666' }}>{s.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Nombre de personnes</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: '#FF9500' }}>{totalPersonnes}</p>
              </div>
              <div style={{ width: 1, background: '#E8E8E8' }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Total commission</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: '#FF9500' }}>{fmt(data?.gains_parrainage)}</p>
              </div>
            </div>
          </div>

          {/* Tableau commissions */}
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: '#FF9500' }}>
              {['Nv', 'Niveau 1', 'Niveau 2', 'Niveau 3'].map(h => (
                <div key={h} style={{ padding: '12px 8px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>{h}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid #F0F0F0' }}>
              {['1,2,3', `${NIVEAUX[0].commission}%`, `${NIVEAUX[1].commission}%`, `${NIVEAUX[2].commission}%`].map((v, i) => (
                <div key={i} style={{ padding: '12px 8px', textAlign: 'center', color: i === 0 ? '#666' : '#FF9500', fontWeight: i === 0 ? 400 : 700, fontSize: 14 }}>{v}</div>
              ))}
            </div>
          </div>

          {/* Niveaux filleuls */}
          {NIVEAUX.map(n => {
            const levelData = data?.[`niveau${n.num}`];
            const isOpen = openLevel === n.num;
            return (
              <div key={n.num} style={{ background: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <button onClick={() => setOpenLevel(isOpen ? 0 : n.num)} style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: '#FFF8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className="fas fa-users" style={{ color: '#FF9500', fontSize: 16 }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A' }}>Équipe niveau {n.num}</p>
                      <p style={{ fontSize: 12, color: '#999' }}>{levelData?.count || 0} membre(s) • {n.commission}%</p>
                    </div>
                  </div>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, background: '#FFF8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#FF9500', fontSize: 12,
                  }}>
                    <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} />
                  </div>
                </button>
                {isOpen && (
                  <div style={{ borderTop: '1px solid #F0F0F0' }}>
                    {levelData?.filleuls?.length > 0 ? levelData.filleuls.map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F8F8F8' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: '#FF9500', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 14, color: '#fff',
                        }}>
                          {f.nom?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: '#1A1A1A' }}>{f.nom}</p>
                          <p style={{ fontSize: 11, color: '#999' }}>{f.pays} • {new Date(f.date_inscription).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                    )) : (
                      <p style={{ textAlign: 'center', color: '#999', fontSize: 13, padding: '16px' }}>Aucun membre à ce niveau</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
