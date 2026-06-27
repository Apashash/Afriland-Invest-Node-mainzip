import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';
import Logo from '../components/Logo';

const KIND_CONFIG = {
  depot:        { label: 'Dépôt',                  icon: 'fa-arrow-down',        color: '#34C759', bg: '#34C75918' },
  retrait:      { label: 'Retrait',                 icon: 'fa-hand-holding-usd',  color: '#FF3B30', bg: '#FF3B3018' },
  investissement:{ label: 'Investissement',         icon: 'fa-chart-line',        color: '#FF9500', bg: '#FF950018' },
  parrainage:   { label: 'Commission parrainage',   icon: 'fa-users',             color: '#5856D6', bg: '#5856D618' },
  revenu:       { label: 'Revenu investissement',   icon: 'fa-coins',             color: '#34C759', bg: '#34C75918' },
  bonus:        { label: 'Bonus roue',              icon: 'fa-dice',              color: '#FF9500', bg: '#FF950018' },
  credit_admin: { label: 'Crédit administrateur',   icon: 'fa-gift',              color: '#007AFF', bg: '#007AFF18' },
  cadeau_vip:   { label: 'Cadeau VIP',              icon: 'fa-crown',             color: '#FF9500', bg: '#FF950018' },
};

const STATUT_LABEL = {
  valide: 'Validé', en_attente: 'En attente', rejete: 'Rejeté',
  actif: 'Actif', termine: 'Terminé', annule: 'Annulé', refuse: 'Refusé',
};
const STATUT_COLOR = {
  valide:     { bg: '#34C75920', color: '#34C759' },
  actif:      { bg: '#34C75920', color: '#34C759' },
  termine:    { bg: '#34C75920', color: '#34C759' },
  en_attente: { bg: '#FF950020', color: '#FF9500' },
  rejete:     { bg: '#FF3B3020', color: '#FF3B30' },
  annule:     { bg: '#FF3B3020', color: '#FF3B30' },
  refuse:     { bg: '#FF3B3020', color: '#FF3B30' },
};

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statutFilter, setStatutFilter] = useState('all');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data.transactions || []);
    } catch { toast.error('Erreur de chargement des transactions'); }
    finally { setLoading(false); }
  };

  const filtered = transactions.filter(t =>
    (typeFilter === 'all' || t.kind === typeFilter) &&
    (statutFilter === 'all' || t.statut === statutFilter)
  );

  const totaux = filtered.reduce((acc, t) => {
    if (t.sens === '+') acc.entrees += parseFloat(t.montant || 0);
    else acc.sorties += parseFloat(t.montant || 0);
    return acc;
  }, { entrees: 0, sorties: 0 });

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 90, minHeight: '100vh' }}>

      {/* ── Header orange gradient ── */}
      <div style={{
        background: 'linear-gradient(135deg, #E07800 0%, #FF9500 100%)',
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

        <div style={{ position: 'absolute', top: 14, right: 16 }}>
          <Logo size="sm" />
        </div>

        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 16 }}>
          Transactions
        </h1>

        {/* Résumé entrées / sorties */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: '12px 14px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginBottom: 4 }}>Entrées</p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>+{fmt(totaux.entrees)}</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>FCFA</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: '12px 14px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginBottom: 4 }}>Sorties</p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>-{fmt(totaux.sorties)}</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>FCFA</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: '12px 14px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginBottom: 4 }}>Total</p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{filtered.length}</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>opérations</p>
          </div>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
            flex: 1, padding: '10px 12px', borderRadius: 12,
            border: '1.5px solid #E8E8E8', background: '#fff',
            color: '#1A1A1A', fontSize: 13, fontWeight: 500,
          }}>
            <option value="all">Tous les types</option>
            <option value="depot">Dépôt</option>
            <option value="retrait">Retrait</option>
            <option value="investissement">Investissement</option>
            <option value="parrainage">Commission parrainage</option>
            <option value="revenu">Revenu investissement</option>
            <option value="bonus">Bonus roue</option>
            <option value="credit_admin">Crédit administrateur</option>
            <option value="cadeau_vip">Cadeau VIP</option>
          </select>
          <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} style={{
            flex: 1, padding: '10px 12px', borderRadius: 12,
            border: '1.5px solid #E8E8E8', background: '#fff',
            color: '#1A1A1A', fontSize: 13, fontWeight: 500,
          }}>
            <option value="all">Tous les statuts</option>
            <option value="valide">Validé</option>
            <option value="en_attente">En attente</option>
            <option value="rejete">Rejeté</option>
            <option value="actif">Actif</option>
          </select>
        </div>

        {/* ── Liste ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="loading-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FF950015', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-receipt" style={{ fontSize: 28, color: '#FF9500' }} />
            </div>
            <p style={{ fontWeight: 600, color: '#666' }}>Aucune transaction</p>
            <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Vos opérations apparaîtront ici</p>
          </div>
        ) : (
          filtered.map(t => {
            const cfg = KIND_CONFIG[t.kind] || { label: t.label || t.kind, icon: 'fa-exchange-alt', color: '#FF9500', bg: '#FF950018' };
            const sc = STATUT_COLOR[t.statut] || { bg: '#FF950020', color: '#FF9500' };
            return (
              <button key={t.id} onClick={() => setReceipt(t)} style={{
                width: '100%', textAlign: 'left',
                background: '#fff',
                border: 'none',
                borderRadius: 16,
                padding: '14px 16px',
                marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                  background: cfg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, fontSize: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A', marginBottom: 2 }}>{cfg.label}</p>
                  <p style={{ color: '#999', fontSize: 11 }}>{fmtDate(t.date)}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{
                    fontWeight: 800, fontSize: 15,
                    color: t.sens === '+' ? '#34C759' : '#1A1A1A',
                    marginBottom: 4,
                  }}>
                    {t.sens}{fmt(t.montant)} <span style={{ fontSize: 10, fontWeight: 600, color: '#999' }}>FCFA</span>
                  </p>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 20,
                    background: sc.bg, color: sc.color,
                  }}>
                    {STATUT_LABEL[t.statut] || t.statut}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ── Modal Reçu ── */}
      {receipt && (
        <div onClick={() => setReceipt(null)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 200,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff',
            borderRadius: '24px 24px 0 0',
            padding: '0 0 32px',
            width: '100%', maxWidth: 480,
          }}>
            {/* Bande colorée en tête */}
            {(() => {
              const cfg = KIND_CONFIG[receipt.kind] || { color: '#FF9500', icon: 'fa-exchange-alt' };
              const sc = STATUT_COLOR[receipt.statut] || { bg: '#FF950020', color: '#FF9500' };
              return (
                <>
                  <div style={{
                    background: `linear-gradient(135deg, ${cfg.color}CC, ${cfg.color})`,
                    borderRadius: '24px 24px 0 0',
                    padding: '28px 24px 24px',
                    textAlign: 'center',
                    position: 'relative',
                  }}>
                    <button onClick={() => setReceipt(null)} style={{
                      position: 'absolute', top: 16, right: 16,
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.25)', border: 'none',
                      color: '#fff', cursor: 'pointer', fontSize: 14,
                    }}>✕</button>

                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}>
                      <i className={`fas ${cfg.icon}`} style={{ color: '#fff', fontSize: 24 }} />
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 4 }}>
                      {(KIND_CONFIG[receipt.kind] || {}).label || receipt.label}
                    </p>
                    <p style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                      {receipt.sens}{fmt(receipt.montant)} FCFA
                    </p>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.25)', color: '#fff',
                    }}>
                      {STATUT_LABEL[receipt.statut] || receipt.statut}
                    </span>
                  </div>

                  <div style={{ padding: '20px 24px 0' }}>
                    {receipt.reference ? (
                      <div style={{
                        background: '#FFF8F0', borderRadius: 12, padding: '12px 14px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 12,
                      }}>
                        <div>
                          <p style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Référence</p>
                          <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#1A1A1A' }}>{receipt.reference}</p>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(receipt.reference); toast.success('Référence copiée !'); }}
                          style={{ background: '#FF9500', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 700 }}
                        >
                          <i className="fas fa-copy" style={{ marginRight: 4 }} />Copier
                        </button>
                      </div>
                    ) : null}

                    <div style={{ background: '#F5F1E8', borderRadius: 14, padding: '14px 16px' }}>
                      <ReceiptRow label="Date" value={fmtDate(receipt.date)} />
                      {receipt.details?.pays && <ReceiptRow label="Pays" value={receipt.details.pays} />}
                      {receipt.details?.operateur && <ReceiptRow label="Opérateur" value={receipt.details.operateur} />}
                      {receipt.details?.numero_payeur && <ReceiptRow label="N° payeur" value={receipt.details.numero_payeur} />}
                      {receipt.details?.methode && <ReceiptRow label="Méthode" value={receipt.details.methode} />}
                      {receipt.details?.numero_compte && <ReceiptRow label="Compte" value={receipt.details.numero_compte} />}
                      {receipt.details?.plan_nom && <ReceiptRow label="Plan" value={receipt.details.plan_nom} />}
                      {receipt.details?.revenu_journalier > 0 && <ReceiptRow label="Revenu/jour" value={`${fmt(receipt.details.revenu_journalier)} FCFA`} />}
                      {receipt.details?.date_fin && <ReceiptRow label="Fin" value={fmtDate(receipt.details.date_fin)} last />}
                    </div>

                    <button
                      onClick={() => setReceipt(null)}
                      style={{
                        width: '100%', marginTop: 16, padding: '14px',
                        borderRadius: 50, border: 'none',
                        background: 'linear-gradient(135deg, #E07800, #FF9500)',
                        color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                      }}
                    >
                      Fermer
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function ReceiptRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 12,
      paddingBottom: last ? 0 : 10, marginBottom: last ? 0 : 10,
      borderBottom: last ? 'none' : '1px solid #E8E0D0',
    }}>
      <span style={{ color: '#999', fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', wordBreak: 'break-word', color: '#1A1A1A' }}>{value}</span>
    </div>
  );
}
