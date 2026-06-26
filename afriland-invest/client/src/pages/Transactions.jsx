import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';
import Logo from '../components/Logo';

const KIND_CONFIG = {
  depot: { label: 'Dépôt', icon: 'fa-arrow-down', color: '#16a34a' },
  retrait: { label: 'Retrait', icon: 'fa-hand-holding-usd', color: '#1B2A6B' },
  investissement: { label: 'Investissement', icon: 'fa-chart-line', color: '#2563eb' },
  parrainage: { label: 'Commission parrainage', icon: 'fa-users', color: '#9333ea' },
  revenu: { label: 'Revenu investissement', icon: 'fa-coins', color: '#16a34a' },
  bonus: { label: 'Bonus roue', icon: 'fa-dice', color: '#f59e0b' },
  credit_admin: { label: 'Crédit administrateur', icon: 'fa-gift', color: '#0891b2' },
  cadeau_vip: { label: 'Cadeau VIP', icon: 'fa-gift', color: '#f59e0b' },
};

const STATUT_LABEL = {
  valide: 'Validé', en_attente: 'En attente', rejete: 'Rejeté',
  actif: 'Actif', termine: 'Terminé', annule: 'Annulé', refuse: 'Refusé',
};
const STATUT_BADGE = {
  valide: 'badge-green', actif: 'badge-green', termine: 'badge-green',
  en_attente: 'badge-yellow', rejete: 'badge-red', annule: 'badge-red', refuse: 'badge-red',
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

  const selectStyle = {
    flex: 1, padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--border-color)', background: 'var(--bg-card)',
    color: 'var(--text-primary)', fontSize: 13,
  };

  return (
    <div className="container" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}><i className="fas fa-arrow-left" /></button>
        <span className="page-title">Transactions</span>
        <Logo size="sm" style={{ marginLeft: 'auto' }} />
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, margin: '0 0 16px' }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
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
        <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} style={selectStyle}>
          <option value="all">Tous les statuts</option>
          <option value="valide">Validé</option>
          <option value="en_attente">En attente</option>
          <option value="rejete">Rejeté</option>
          <option value="actif">Actif</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <i className="fas fa-receipt" style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }} />
          <p>Aucune transaction</p>
        </div>
      ) : (
        filtered.map(t => {
          const cfg = KIND_CONFIG[t.kind] || { label: t.label, icon: 'fa-exchange-alt', color: '#6b7280' };
          return (
            <button key={t.id} onClick={() => setReceipt(t)} style={{
              width: '100%', textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 14, padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, fontSize: 16 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{cfg.label}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{fmtDate(t.date)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: t.sens === '+' ? 'var(--green-primary)' : 'var(--text-primary)' }}>
                  {t.sens}{fmt(t.montant)}
                </p>
                <span className={`badge ${STATUT_BADGE[t.statut] || 'badge-yellow'}`} style={{ fontSize: 10 }}>
                  {STATUT_LABEL[t.statut] || t.statut}
                </span>
              </div>
            </button>
          );
        })
      )}

      {/* Reçu */}
      {receipt && (
        <div onClick={() => setReceipt(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Logo size="md" /></div>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>Reçu de transaction</p>

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{(KIND_CONFIG[receipt.kind] || {}).label || receipt.label}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: receipt.sens === '+' ? 'var(--green-primary)' : 'var(--text-primary)' }}>
                {receipt.sens}{fmt(receipt.montant)} FCFA
              </p>
              <span className={`badge ${STATUT_BADGE[receipt.statut] || 'badge-yellow'}`}>
                {STATUT_LABEL[receipt.statut] || receipt.statut}
              </span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
              <ReceiptRow label="Référence" value={receipt.id} />
              <ReceiptRow label="Date" value={fmtDate(receipt.date)} />
              {receipt.details?.pays && <ReceiptRow label="Pays" value={receipt.details.pays} />}
              {receipt.details?.operateur && <ReceiptRow label="Opérateur" value={receipt.details.operateur} />}
              {receipt.details?.numero_payeur && <ReceiptRow label="Numéro payeur" value={receipt.details.numero_payeur} />}
              {receipt.details?.methode && <ReceiptRow label="Méthode" value={receipt.details.methode} />}
              {receipt.details?.numero_compte && <ReceiptRow label="Compte" value={receipt.details.numero_compte} />}
              {receipt.details?.plan_nom && <ReceiptRow label="Plan" value={receipt.details.plan_nom} />}
              {receipt.details?.revenu_journalier > 0 && <ReceiptRow label="Revenu/jour" value={`${fmt(receipt.details.revenu_journalier)} FCFA`} />}
              {receipt.details?.date_fin && <ReceiptRow label="Fin" value={fmtDate(receipt.details.date_fin)} />}
            </div>

            <button className="btn btn-primary" onClick={() => setReceipt(null)} style={{ width: '100%', marginTop: 18, padding: 12 }}>Fermer</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function ReceiptRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}
