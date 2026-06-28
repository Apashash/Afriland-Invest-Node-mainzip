import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';

const PAGE_SIZE = 50;

function Pagination({ total, page, setPage }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingBottom: 8 }}>
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
        style={{ width: 36, height: 36, borderRadius: 50, border: '1px solid var(--border-color)', background: page === 1 ? 'transparent' : '#fff', color: page === 1 ? 'var(--text-muted)' : 'var(--text-dark)', cursor: page === 1 ? 'default' : 'pointer', fontWeight: 700, fontSize: 16 }}
      >‹</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => setPage(p)} style={{
          width: 36, height: 36, borderRadius: 50, border: 'none',
          background: p === page ? 'var(--primary)' : '#fff',
          color: p === page ? '#fff' : 'var(--text-dark)',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
          boxShadow: p === page ? 'var(--shadow-orange)' : '0 1px 4px rgba(0,0,0,0.08)',
        }}>{p}</button>
      ))}
      <button
        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        style={{ width: 36, height: 36, borderRadius: 50, border: '1px solid var(--border-color)', background: page === totalPages ? 'transparent' : '#fff', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-dark)', cursor: page === totalPages ? 'default' : 'pointer', fontWeight: 700, fontSize: 16 }}
      >›</button>
    </div>
  );
}

const statusColor = { valide: '#34C759', en_attente: '#FF9500', rejete: '#FF3B30' };
const statusLabel = { valide: 'Validé', en_attente: 'En attente', rejete: 'Rejeté' };

function StatusBadge({ statut }) {
  const color = statusColor[statut] || '#999';
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: color + '20', color, border: `1px solid ${color}40` }}>
      {statusLabel[statut] || statut}
    </span>
  );
}

function ActionBtns({ onValidate, onReject }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <button onClick={onValidate} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#34C75915', color: '#34C759', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
        <i className="fas fa-check" style={{ marginRight: 6 }} />Valider
      </button>
      <button onClick={onReject} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#FF3B3015', color: '#FF3B30', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
        <i className="fas fa-times" style={{ marginRight: 6 }} />Rejeter
      </button>
    </div>
  );
}

function SectionHeader({ icon, title, badge, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fas ${icon}`} style={{ color: '#fff', fontSize: 16 }} />
        </div>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-dark)' }}>{title}</h2>
          {badge > 0 && <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{badge} en attente</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function TransactionChart({ depots, retraits, fmt }) {
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: MONTHS[d.getMonth()] };
  });

  const bucket = (arr, dateField) => {
    const map = {};
    (arr || []).forEach(item => {
      const d = new Date(item[dateField]);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!map[k]) map[k] = { valide: 0, rejete: 0, en_attente: 0 };
      map[k][item.statut] = (map[k][item.statut] || 0) + 1;
    });
    return map;
  };

  const depotMap = bucket(depots, 'date_depot');
  const retraitMap = bucket(retraits, 'date_demande');

  const W = 340, H = 180, PL = 28, PB = 32, PT = 12, PR = 8;
  const chartW = W - PL - PR;
  const chartH = H - PB - PT;
  const barGroupW = chartW / months.length;
  const barW = Math.min(10, barGroupW / 5);
  const gap = 2;

  const allVals = months.flatMap(m => [
    depotMap[m.key]?.valide || 0, depotMap[m.key]?.rejete || 0,
    retraitMap[m.key]?.valide || 0, retraitMap[m.key]?.rejete || 0,
  ]);
  const maxVal = Math.max(...allVals, 1);

  const toY = v => PT + chartH - (v / maxVal) * chartH;
  const barH = v => (v / maxVal) * chartH;

  const LEGEND = [
    { color: '#34C759', label: 'Dép. validés' },
    { color: '#FF3B30', label: 'Dép. rejetés' },
    { color: '#007AFF', label: 'Ret. validés' },
    { color: '#FF9500', label: 'Ret. rejetés' },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '20px 16px 16px', boxShadow: 'var(--shadow-card)', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#FF950015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-chart-bar" style={{ color: '#FF9500', fontSize: 15 }} />
        </div>
        <div>
          <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-dark)' }}>Activité financière</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>6 derniers mois</p>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = PT + chartH * (1 - t);
            return (
              <g key={i}>
                <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="#F0F0F0" strokeWidth={1} />
                <text x={PL - 4} y={y + 4} textAnchor="end" fontSize={8} fill="#999">
                  {t === 0 ? '0' : Math.round(maxVal * t)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {months.map((m, mi) => {
            const cx = PL + mi * barGroupW + barGroupW / 2;
            const dv = depotMap[m.key]?.valide || 0;
            const dr = depotMap[m.key]?.rejete || 0;
            const rv = retraitMap[m.key]?.valide || 0;
            const rr = retraitMap[m.key]?.rejete || 0;
            const totalW = 4 * barW + 3 * gap;
            const x0 = cx - totalW / 2;
            return (
              <g key={m.key}>
                <rect x={x0} y={toY(dv)} width={barW} height={Math.max(barH(dv), dv > 0 ? 2 : 0)} fill="#34C759" rx={2} />
                <rect x={x0 + barW + gap} y={toY(dr)} width={barW} height={Math.max(barH(dr), dr > 0 ? 2 : 0)} fill="#FF3B30" rx={2} />
                <rect x={x0 + 2*(barW + gap)} y={toY(rv)} width={barW} height={Math.max(barH(rv), rv > 0 ? 2 : 0)} fill="#007AFF" rx={2} />
                <rect x={x0 + 3*(barW + gap)} y={toY(rr)} width={barW} height={Math.max(barH(rr), rr > 0 ? 2 : 0)} fill="#FF9500" rx={2} />
                <text x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill="#999">{m.label}</text>
              </g>
            );
          })}

          {/* X axis */}
          <line x1={PL} x2={W - PR} y1={PT + chartH} y2={PT + chartH} stroke="#E0E0E0" strokeWidth={1} />
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12, justifyContent: 'center' }}>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [depots, setDepots] = useState([]);
  const [retraits, setRetraits] = useState([]);
  const [cadeaux, setCadeaux] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [settings, setSettings] = useState({ min_depot: '500', min_retrait: '2000' });
  const [salaires, setSalaires] = useState([]);
  const [newSalaire, setNewSalaire] = useState({ niveau: '', label: '', requis: '', cadeau: '' });
  const [transactions, setTransactions] = useState([]);
  const [payingRevenu, setPayingRevenu] = useState(false);
  const [dernierVersement, setDernierVersement] = useState(null);

  const [loading, setLoading] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSeen, setNotifSeen] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notif_seen') || '[]'); } catch { return []; }
  });
  const bellRef = useRef();
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txStatutFilter, setTxStatutFilter] = useState('all');

  const [creditModal, setCreditModal] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [planModal, setPlanModal] = useState(null);
  const [planForm, setPlanForm] = useState({ nom: '', prix: '', duree_jours: '', rendement_journalier: '' });

  const [actionMenu, setActionMenu] = useState(null);
  const [balanceModal, setBalanceModal] = useState(null);
  const [balanceMode, setBalanceMode] = useState('add');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [infoModal, setInfoModal] = useState(null);
  const [infoForm, setInfoForm] = useState({ nom: '', telephone: '', pays: '' });
  const [newPassword, setNewPassword] = useState('');
  const [infoTab, setInfoTab] = useState('info');

  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const [pages, setPages] = useState({ depots: 1, retraits: 1, cadeaux: 1, users: 1, posts: 1, plans: 1, annonces: 1, transactions: 1, salaires: 1 });
  const setPage = (key, val) => setPages(p => ({ ...p, [key]: typeof val === 'function' ? val(p[key]) : val }));

  const navigate = useNavigate();

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadAll = async () => {
    try {
      const [statsRes, depotsRes, retraitsRes, cadeauxRes, usersRes, postsRes, plansRes, annoncesRes, settingsRes, txRes, salairesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/depots'),
        api.get('/admin/retraits'),
        api.get('/admin/cadeaux'),
        api.get('/admin/users'),
        api.get('/admin/posts'),
        api.get('/admin/plans'),
        api.get('/admin/annonces'),
        api.get('/admin/settings'),
        api.get('/transactions/admin'),
        api.get('/admin/salaires'),
      ]);
      setStats(statsRes.data);
      setDepots(depotsRes.data.depots || []);
      setRetraits(retraitsRes.data.retraits || []);
      setCadeaux(cadeauxRes.data.cadeaux || []);
      setUsers(usersRes.data.users || []);
      setPosts(postsRes.data.posts || []);
      setPlans(plansRes.data.plans || []);
      setAnnonces(annoncesRes.data.annonces || []);
      setSettings(settingsRes.data.settings || { min_depot: '500' });
      setTransactions(txRes.data.transactions || []);
      setSalaires(salairesRes.data.salaires || []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const handlePayerRevenus = async () => {
    if (payingRevenu) return;
    setPayingRevenu(true);
    try {
      const res = await api.post('/admin/payer-revenus');
      if (res.data.skipped) {
        toast(res.data.message, { icon: 'ℹ️', duration: 5000 });
      } else {
        toast.success(res.data.message, { duration: 5000 });
        setDernierVersement(new Date().toISOString());
        loadAll();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du versement');
    } finally {
      setPayingRevenu(false);
    }
  };

  const validateDepot = async (id) => { try { await api.put(`/admin/depots/${id}/validate`); toast.success('Dépôt validé ✅'); loadAll(); } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); } };
  const rejectDepot = async (id) => { try { await api.put(`/admin/depots/${id}/reject`); toast.success('Dépôt rejeté'); loadAll(); } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); } };
  const validateRetrait = async (id) => { try { await api.put(`/admin/retraits/${id}/validate`); toast.success('Retrait validé ✅'); loadAll(); } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); } };
  const rejectRetrait = async (id) => { try { await api.put(`/admin/retraits/${id}/reject`); toast.success('Retrait rejeté'); loadAll(); } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); } };
  const validateCadeau = async (id) => { try { await api.put(`/admin/cadeaux/${id}/validate`); toast.success('Cadeau crédité ✅'); loadAll(); } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); } };
  const rejectCadeau = async (id) => { try { await api.put(`/admin/cadeaux/${id}/reject`); toast.success('Cadeau rejeté'); loadAll(); } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); } };
  const validatePost = async (id) => { try { await api.put(`/admin/posts/${id}/validate`); toast.success('Post validé'); loadAll(); } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); } };
  const rejectPost = async (id) => { try { await api.put(`/admin/posts/${id}/reject`); toast.success('Post rejeté'); loadAll(); } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); } };

  const handleCredit = async () => {
    if (!creditAmount || isNaN(creditAmount)) return toast.error('Montant invalide');
    try { await api.put(`/admin/users/${creditModal}/credit`, { montant: parseFloat(creditAmount) }); toast.success('Crédit effectué ✅'); setCreditModal(null); setCreditAmount(''); loadAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const openActionMenu = (u) => setActionMenu(u);
  const openBalanceModal = (u) => { setBalanceModal(u); setBalanceMode('add'); setBalanceAmount(''); setActionMenu(null); };
  const openInfoModal = (u) => { setInfoModal(u); setInfoForm({ nom: u.nom || '', telephone: u.telephone || '', pays: u.pays || '' }); setNewPassword(''); setInfoTab('info'); setActionMenu(null); };

  const handleBalance = async () => {
    if (!balanceAmount || isNaN(balanceAmount)) return toast.error('Montant invalide');
    try {
      await api.put(`/admin/users/${balanceModal.id}/balance`, { mode: balanceMode, montant: parseFloat(balanceAmount) });
      const labels = { add: 'Solde augmenté ✅', subtract: 'Solde diminué ✅', set: 'Solde défini ✅' };
      toast.success(labels[balanceMode]);
      setBalanceModal(null); setBalanceAmount(''); loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const handleInfoSave = async () => {
    try {
      await api.put(`/admin/users/${infoModal.id}/info`, infoForm);
      toast.success('Informations mises à jour ✅'); loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) return toast.error('Mot de passe trop court (min 4 caractères)');
    try {
      await api.put(`/admin/users/${infoModal.id}/password`, { new_password: newPassword });
      toast.success('Mot de passe réinitialisé ✅'); setNewPassword('');
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const handleResetTxPassword = async () => {
    if (!confirm('Réinitialiser le mot de passe de transaction de cet utilisateur ?')) return;
    try {
      await api.delete(`/admin/users/${infoModal.id}/transaction-password`);
      toast.success('Mot de passe de transaction réinitialisé ✅');
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const handleBan = async (u) => {
    const action = u.banni ? 'débannir' : 'bannir';
    if (!confirm(`Voulez-vous ${action} ${u.nom} ?`)) return;
    setActionMenu(null);
    try {
      const res = await api.put(`/admin/users/${u.id}/ban`);
      toast.success(res.data.message + ' ✅'); loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const handleBlockWithdrawal = async (u) => {
    const action = u.retrait_bloque ? 'débloquer le retrait de' : 'bloquer le retrait de';
    if (!confirm(`Voulez-vous ${action} ${u.nom} ?`)) return;
    setActionMenu(null);
    try {
      const res = await api.put(`/admin/users/${u.id}/block-withdrawal`);
      toast.success(res.data.message + ' ✅'); loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const handleDeleteUser = async (u) => {
    if (!confirm(`⚠️ Supprimer définitivement ${u.nom} ? Cette action est irréversible.`)) return;
    setActionMenu(null);
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success('Utilisateur supprimé'); loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const handleToggleAdmin = async (u) => {
    const isAdmin = u.role === 'admin';
    const action = isAdmin ? `retirer les droits admin de ${u.nom}` : `nommer ${u.nom} administrateur`;
    if (!confirm(`Voulez-vous ${action} ?`)) return;
    setActionMenu(null);
    try {
      const res = await api.put(`/admin/users/${u.id}/role`);
      toast.success(res.data.message + ' ✅'); loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const saveSettings = async () => {
    try { await api.put('/admin/settings', { cle: 'min_depot', valeur: settings.min_depot }); toast.success('Sauvegardé ✅'); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const saveRetrait = async () => {
    try { await api.put('/admin/settings', { cle: 'min_retrait', valeur: settings.min_retrait }); toast.success('Sauvegardé ✅'); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const updateSalaire = (index, field, value) => {
    setSalaires(s => s.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const saveSalaire = async (s) => {
    try {
      await api.put(`/admin/salaires/${s.niveau}`, { label: s.label, requis: s.requis, cadeau: s.cadeau });
      toast.success(`Niveau ${s.niveau} sauvegardé ✅`);
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const addSalaire = async () => {
    if (!newSalaire.niveau || !newSalaire.requis || !newSalaire.cadeau) return toast.error('Remplissez tous les champs');
    try {
      await api.post('/admin/salaires', newSalaire);
      toast.success('Niveau ajouté ✅');
      setNewSalaire({ niveau: '', label: '', requis: '', cadeau: '' });
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const deleteSalaire = async (niveau) => {
    if (!window.confirm(`Supprimer le niveau VIP ${niveau} ?`)) return;
    try {
      await api.delete(`/admin/salaires/${niveau}`);
      toast.success('Niveau supprimé');
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const saveCommissions = async () => {
    try {
      await Promise.all([
        api.put('/admin/settings', { cle: 'commission_niveau1', valeur: settings.commission_niveau1 ?? '10' }),
        api.put('/admin/settings', { cle: 'commission_niveau2', valeur: settings.commission_niveau2 ?? '5' }),
        api.put('/admin/settings', { cle: 'commission_niveau3', valeur: settings.commission_niveau3 ?? '2' }),
      ]);
      toast.success('Commissions sauvegardées ✅');
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const openPlanModal = (plan = null) => {
    if (plan) { setPlanForm({ nom: plan.nom, prix: plan.prix, duree_jours: plan.duree_jours, rendement_journalier: plan.rendement_journalier }); setPlanModal(plan.id); }
    else { setPlanForm({ nom: '', prix: '', duree_jours: '', rendement_journalier: '' }); setPlanModal('new'); }
  };
  const savePlan = async () => {
    try {
      if (planModal === 'new') { await api.post('/admin/plans', planForm); toast.success('Plan créé ✅'); }
      else { await api.put(`/admin/plans/${planModal}`, planForm); toast.success('Plan modifié ✅'); }
      setPlanModal(null); loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };
  const deletePlan = async (id) => {
    if (!confirm('Supprimer ce plan ?')) return;
    try { await api.delete(`/admin/plans/${id}`); toast.success('Plan supprimé'); loadAll(); }
    catch { toast.error('Erreur'); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Sélectionnez une image');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };
  const uploadAnnonce = async () => {
    if (!imageFile) return toast.error('Sélectionnez une image');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      await api.post('/admin/annonces', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Affiche publiée ✅');
      setImageFile(null); setImagePreview(null);
      if (fileRef.current) fileRef.current.value = '';
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setUploading(false); }
  };
  const toggleAnnonce = async (ann) => {
    try { await api.put(`/admin/annonces/${ann.id}`, { actif: !ann.actif }); toast.success(ann.actif ? 'Masqué' : 'Visible ✅'); loadAll(); }
    catch { toast.error('Erreur'); }
  };
  const deleteAnnonce = async (id) => {
    if (!confirm('Supprimer cette affiche ?')) return;
    try { await api.delete(`/admin/annonces/${id}`); toast.success('Supprimée'); loadAll(); }
    catch { toast.error('Erreur'); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

  const MENU = [
    { key: 'home', label: 'Tableau de bord', icon: 'fa-tachometer-alt', color: '#FF9500' },
    { key: 'plans', label: 'Plans VIP', icon: 'fa-chart-line', color: '#34C759' },
    { key: 'users', label: 'Utilisateurs', icon: 'fa-users', color: '#007AFF' },
    { key: 'depots', label: 'Dépôts', icon: 'fa-arrow-down', color: '#34C759', badge: depots.filter(d => d.statut === 'en_attente').length },
    { key: 'retraits', label: 'Retraits', icon: 'fa-hand-holding-usd', color: '#007AFF', badge: retraits.filter(r => r.statut === 'en_attente').length },
    { key: 'cadeaux', label: 'Cadeaux VIP', icon: 'fa-gift', color: '#FF9500', badge: cadeaux.filter(c => c.statut === 'en_attente').length },
    { key: 'salaires', label: 'Salaires VIP', icon: 'fa-money-bill-wave', color: '#34C759' },
    { key: 'transactions', label: 'Transactions', icon: 'fa-receipt', color: '#5856D6' },
    { key: 'annonces', label: 'Affiches', icon: 'fa-image', color: '#FF9500' },
    { key: 'settings', label: 'Paramètres', icon: 'fa-cog', color: '#8E8E93' },
  ];

  const totalBadges = MENU.reduce((a, m) => a + (m.badge || 0), 0);

  const paginated = (arr, key) => arr.slice((pages[key] - 1) * PAGE_SIZE, pages[key] * PAGE_SIZE);

  const navigate_ = (key) => { setTab(key); setSidebarOpen(false); setPages(p => ({ ...p, [key]: 1 })); };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-page)', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fas fa-shield-alt" style={{ color: '#fff', fontSize: 22 }} />
      </div>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', maxWidth: 430, margin: '0 auto', position: 'relative' }}>

      {/* ── Sidebar overlay ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* ── Sidebar ── */}
      <div style={{
        position: 'fixed', top: 0, left: sidebarOpen ? 0 : '-280px', width: 272, height: '100%',
        background: '#fff', zIndex: 400, transition: 'left 0.3s cubic-bezier(.4,0,.2,1)',
        boxShadow: sidebarOpen ? '4px 0 32px rgba(0,0,0,0.15)' : 'none',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Sidebar header */}
        <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', padding: '48px 20px 24px', position: 'relative' }}>
          <button onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 50, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: 16 }}>
            ✕
          </button>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <i className="fas fa-shield-alt" style={{ color: '#fff', fontSize: 24 }} />
          </div>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Administration</h2>
          <a href="https://wa.me/237687194830" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2, textDecoration: 'none', display: 'block' }}>payfastjob made by @D.r~ASH</a>
        </div>

        {/* Menu items */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {MENU.map(m => (
            <button
              key={m.key}
              onClick={() => navigate_(m.key)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 20px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: tab === m.key ? m.color + '15' : 'transparent',
                borderLeft: tab === m.key ? `3px solid ${m.color}` : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 9, background: m.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fas ${m.icon}`} style={{ color: m.color, fontSize: 14 }} />
              </div>
              <span style={{ flex: 1, fontWeight: tab === m.key ? 700 : 500, fontSize: 14, color: tab === m.key ? m.color : 'var(--text-dark)' }}>{m.label}</span>
              {(m.badge || 0) > 0 && (
                <span style={{ background: '#FF3B30', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                  {m.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={() => navigate('/')} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
            <i className="fas fa-home" style={{ color: 'var(--primary)' }} />Retour à l'accueil
          </button>
        </div>
      </div>

      {/* ── Top header bar ── */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 200 }}>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative' }}
        >
          <span style={{ display: 'block', width: 18, height: 2, background: '#fff', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 18, height: 2, background: '#fff', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 18, height: 2, background: '#fff', borderRadius: 2 }} />
          {totalBadges > 0 && (
            <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#FF3B30', borderRadius: '50%', border: '1.5px solid #FF9500' }} />
          )}
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
            {MENU.find(m => m.key === tab)?.label || 'Administration'}
          </p>
        </div>
        {/* ── Cloche notifications ── */}
        {(() => {
          const allNotifs = [
            ...depots.filter(d => d.statut === 'en_attente').map(d => ({
              id: `depot-${d.id}`, type: 'depot', icon: 'fa-arrow-down', color: '#FF9500',
              title: 'Dépôt en attente', sub: `${d.nom} · ${fmt(d.montant)} FCFA`, tab: 'depots',
              date: d.date_depot,
            })),
            ...retraits.filter(r => r.statut === 'en_attente').map(r => ({
              id: `retrait-${r.id}`, type: 'retrait', icon: 'fa-hand-holding-usd', color: '#5856D6',
              title: 'Retrait en attente', sub: `${r.nom} · ${fmt(r.montant)} FCFA`, tab: 'retraits',
              date: r.date_demande,
            })),
            ...cadeaux.filter(c => c.statut === 'en_attente').map(c => ({
              id: `cadeau-${c.id}`, type: 'cadeau', icon: 'fa-gift', color: '#34C759',
              title: 'Cadeau VIP réclamé', sub: `${c.nom} · Niveau ${c.niveau}`, tab: 'cadeaux',
              date: c.date_demande,
            })),
            ...posts.filter(p => p.statut === 'en_attente').map(p => ({
              id: `post-${p.id}`, type: 'post', icon: 'fa-newspaper', color: '#FF3B30',
              title: 'Post en attente', sub: p.message?.substring(0, 40) + (p.message?.length > 40 ? '…' : ''), tab: 'posts',
              date: p.date_creation,
            })),
          ].sort((a, b) => new Date(b.date) - new Date(a.date));

          const unseen = allNotifs.filter(n => !notifSeen.includes(n.id));
          const badgeCount = unseen.length;

          const markSeen = () => {
            const ids = allNotifs.map(n => n.id);
            setNotifSeen(ids);
            localStorage.setItem('notif_seen', JSON.stringify(ids));
          };

          return (
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setNotifOpen(o => !o); if (!notifOpen) markSeen(); }}
                style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
              >
                <i className="fas fa-bell" style={{ fontSize: 17 }} />
                {badgeCount > 0 && (
                  <span style={{ position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, background: '#FF3B30', borderRadius: 10, fontSize: 10, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid #FF9500', lineHeight: 1 }}>
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{ position: 'fixed', top: 66, right: 12, width: 300, maxHeight: 420, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 600, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-dark)' }}>Notifications</p>
                    {allNotifs.length > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{allNotifs.length} en attente</span>
                    )}
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {allNotifs.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <i className="fas fa-check-circle" style={{ fontSize: 28, color: '#34C759', marginBottom: 8 }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Tout est traité !</p>
                      </div>
                    ) : allNotifs.map(n => (
                      <div
                        key={n.id}
                        onClick={() => { navigate_(n.tab); setNotifOpen(false); }}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', cursor: 'pointer', borderBottom: '1px solid #F8F8F8', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: n.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <i className={`fas ${n.icon}`} style={{ color: n.color, fontSize: 13 }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.sub}</p>
                          <p style={{ fontSize: 10, color: '#C0C0C0', marginTop: 3 }}>{new Date(n.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <i className="fas fa-chevron-right" style={{ color: '#DDD', fontSize: 10, marginTop: 10, flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: '20px 16px 40px' }}>

        {/* ── Modals ── */}
        {creditModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
              <h3 style={{ fontWeight: 800, marginBottom: 6 }}>Créditer l'utilisateur</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Entrez le montant à ajouter au solde</p>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label>Montant (FCFA)</label>
                <input type="number" placeholder="Ex: 10000" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setCreditModal(null); setCreditAmount(''); }} style={{ flex: 1, padding: '12px', borderRadius: 50, border: '1px solid var(--border-color)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={handleCredit} className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>Créditer</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Action Menu (bottom sheet) ── */}
        {actionMenu && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setActionMenu(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 430, padding: '8px 0 28px', boxShadow: '0 -4px 32px rgba(0,0,0,0.15)' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '10px auto 16px' }} />
              <div style={{ padding: '0 20px 14px', borderBottom: '1px solid #F0F0F0', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: actionMenu.banni ? '#FF3B3020' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{(actionMenu.nom || '?')[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-dark)' }}>{actionMenu.nom}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{actionMenu.telephone}</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{fmt(actionMenu.solde || 0)} FCFA</p>
                  </div>
                </div>
              </div>
              {[
                { icon: 'fa-coins', color: '#FF9500', label: 'Modifier le solde', action: () => openBalanceModal(actionMenu) },
                { icon: 'fa-user-edit', color: '#007AFF', label: 'Informations & Sécurité', action: () => openInfoModal(actionMenu) },
                { icon: actionMenu.role === 'admin' ? 'fa-user-minus' : 'fa-user-shield', color: actionMenu.role === 'admin' ? '#8E8E93' : '#5856D6', label: actionMenu.role === 'admin' ? 'Retirer les droits admin' : 'Nommer administrateur', action: () => handleToggleAdmin(actionMenu) },
                { icon: actionMenu.banni ? 'fa-user-check' : 'fa-ban', color: actionMenu.banni ? '#34C759' : '#FF3B30', label: actionMenu.banni ? 'Débannir l\'utilisateur' : 'Bannir l\'utilisateur', action: () => handleBan(actionMenu) },
                { icon: actionMenu.retrait_bloque ? 'fa-lock-open' : 'fa-lock', color: actionMenu.retrait_bloque ? '#34C759' : '#5856D6', label: actionMenu.retrait_bloque ? 'Débloquer le retrait' : 'Bloquer le retrait', action: () => handleBlockWithdrawal(actionMenu) },
                { icon: 'fa-trash-alt', color: '#FF3B30', label: 'Supprimer l\'utilisateur', action: () => handleDeleteUser(actionMenu) },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fas ${item.icon}`} style={{ color: item.color, fontSize: 15 }} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: i === 5 ? '#FF3B30' : 'var(--text-dark)' }}>{item.label}</span>
                  <i className="fas fa-chevron-right" style={{ marginLeft: 'auto', color: '#CCC', fontSize: 11 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Balance Modal ── */}
        {balanceModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 22, padding: 24, width: '100%', maxWidth: 360 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FF950018', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-coins" style={{ color: '#FF9500', fontSize: 16 }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: 16 }}>Modifier le solde</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{balanceModal.nom} · {fmt(balanceModal.solde || 0)} FCFA</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: '#F5F5F5', borderRadius: 12, padding: 4 }}>
                {[{ key: 'add', label: '+ Ajouter', color: '#34C759' }, { key: 'subtract', label: '− Diminuer', color: '#FF3B30' }, { key: 'set', label: '= Définir', color: '#007AFF' }].map(m => (
                  <button key={m.key} onClick={() => setBalanceMode(m.key)} style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: balanceMode === m.key ? '#fff' : 'transparent', color: balanceMode === m.key ? m.color : '#999', boxShadow: balanceMode === m.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                {balanceMode === 'add' && 'Ajouter ce montant au solde actuel'}
                {balanceMode === 'subtract' && 'Retirer ce montant du solde actuel'}
                {balanceMode === 'set' && 'Définir le solde exactement à ce montant'}
              </div>
              <div className="input-group" style={{ marginBottom: 18 }}>
                <label>Montant (FCFA)</label>
                <input type="number" placeholder="Ex: 5000" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setBalanceModal(null)} style={{ flex: 1, padding: '12px', borderRadius: 50, border: '1px solid var(--border-color)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={handleBalance} className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>Confirmer</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Info Modal ── */}
        {infoModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 430, padding: '8px 0 28px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '10px auto 0' }} />
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #F0F0F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#007AFF18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-user-edit" style={{ color: '#007AFF', fontSize: 15 }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 15 }}>Gestion — {infoModal.nom}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Informations & Sécurité</p>
                    </div>
                  </div>
                  <button onClick={() => setInfoModal(null)} style={{ width: 32, height: 32, borderRadius: 50, border: 'none', background: '#F0F0F0', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 14, background: '#F5F5F5', borderRadius: 12, padding: 4 }}>
                  {[{ key: 'info', label: 'Infos', icon: 'fa-user' }, { key: 'security', label: 'Sécurité', icon: 'fa-shield-alt' }].map(t => (
                    <button key={t.key} onClick={() => setInfoTab(t.key)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: infoTab === t.key ? '#fff' : 'transparent', color: infoTab === t.key ? '#007AFF' : '#999', boxShadow: infoTab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                      <i className={`fas ${t.icon}`} style={{ marginRight: 5 }} />{t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '18px 20px' }}>
                {infoTab === 'info' && (
                  <>
                    {[{ key: 'nom', label: 'Nom complet', placeholder: 'Ex: Jean Dupont' }, { key: 'telephone', label: 'Téléphone', placeholder: '+237600000000' }, { key: 'pays', label: 'Pays', placeholder: 'Cameroun' }].map(f => (
                      <div className="input-group" key={f.key} style={{ marginBottom: 12 }}>
                        <label>{f.label}</label>
                        <input type="text" placeholder={f.placeholder} value={infoForm[f.key]} onChange={e => setInfoForm(p => ({ ...p, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                    <button onClick={handleInfoSave} className="btn btn-primary" style={{ width: '100%', padding: '13px', borderRadius: 50, marginTop: 4 }}>
                      <i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer les informations
                    </button>
                  </>
                )}
                {infoTab === 'security' && (
                  <>
                    <div style={{ background: '#F8F9FA', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        <i className="fas fa-key" style={{ color: '#FF9500', marginRight: 8 }} />Nouveau mot de passe
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Définissez un nouveau mot de passe de connexion pour l'utilisateur</p>
                      <div className="input-group" style={{ marginBottom: 10 }}>
                        <label>Nouveau mot de passe</label>
                        <input type="text" placeholder="Min. 4 caractères" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      </div>
                      <button onClick={handleResetPassword} style={{ width: '100%', padding: '11px', borderRadius: 50, border: 'none', background: '#FF9500', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                        <i className="fas fa-key" style={{ marginRight: 8 }} />Définir le mot de passe
                      </button>
                    </div>
                    <div style={{ background: '#FFF3F3', borderRadius: 14, padding: 16, border: '1px solid #FF3B3020' }}>
                      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#FF3B30' }}>
                        <i className="fas fa-shield-alt" style={{ marginRight: 8 }} />Mot de passe de transaction
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Supprime le mot de passe de transaction actuel. L'utilisateur devra en créer un nouveau.</p>
                      <button onClick={handleResetTxPassword} style={{ width: '100%', padding: '11px', borderRadius: 50, border: 'none', background: '#FF3B30', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                        <i className="fas fa-rotate-left" style={{ marginRight: 8 }} />Réinitialiser le MDP transaction
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {planModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
              <h3 style={{ fontWeight: 800, marginBottom: 20 }}>{planModal === 'new' ? 'Nouveau plan VIP' : 'Modifier le plan'}</h3>
              {[{ key: 'nom', label: 'Nom du plan', type: 'text', placeholder: 'Ex: VIP 1' }, { key: 'prix', label: 'Prix (FCFA)', type: 'number', placeholder: 'Ex: 1000' }, { key: 'duree_jours', label: 'Durée (jours)', type: 'number', placeholder: 'Ex: 30' }, { key: 'rendement_journalier', label: 'Rendement journalier (%)', type: 'number', placeholder: 'Ex: 1.5' }].map(f => (
                <div className="input-group" key={f.key} style={{ marginBottom: 12 }}>
                  <label>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={planForm[f.key]} onChange={e => setPlanForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              {planForm.prix && planForm.rendement_journalier && (
                <p style={{ fontSize: 12, color: '#34C759', marginBottom: 12, fontWeight: 600 }}>
                  Revenu/jour : {fmt(parseFloat(planForm.prix || 0) * parseFloat(planForm.rendement_journalier || 0) / 100)} FCFA
                </p>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPlanModal(null)} style={{ flex: 1, padding: '12px', borderRadius: 50, border: '1px solid var(--border-color)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={savePlan} className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>{planModal === 'new' ? 'Créer' : 'Modifier'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── HOME ─── */}
        {tab === 'home' && stats && (
          <div>
            {/* Stats grid — row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Utilisateurs', value: stats.users.count, icon: 'fa-users', color: '#007AFF', bg: '#007AFF15' },
                { label: 'Plans actifs', value: stats.commandes.count, icon: 'fa-chart-line', color: '#34C759', bg: '#34C75915' },
                { label: 'Dépôts validés', value: fmt(stats.depots.total), sub: 'FCFA', icon: 'fa-arrow-down', color: '#FF9500', bg: '#FF950015' },
                { label: 'Retraits validés', value: fmt(stats.retraits.total), sub: 'FCFA', icon: 'fa-hand-holding-usd', color: '#5856D6', bg: '#5856D615' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 18, padding: '18px 16px', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 16 }} />
                  </div>
                  <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-dark)', lineHeight: 1 }}>{s.value}</p>
                  {s.sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.sub}</p>}
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Stats grid — row 2 (nouvelles sections) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                {
                  label: 'Dépôts en attente',
                  value: stats.depots.en_attente,
                  icon: 'fa-hourglass-half',
                  color: '#FF9500',
                  bg: '#FF950015',
                  action: () => navigate_('depots'),
                },
                {
                  label: 'Retraits en attente',
                  value: stats.retraits.en_attente,
                  icon: 'fa-clock',
                  color: '#FF3B30',
                  bg: '#FF3B3015',
                  action: () => navigate_('retraits'),
                },
                {
                  label: 'Avec investissement',
                  value: stats.users_avec_investissement,
                  icon: 'fa-briefcase',
                  color: '#34C759',
                  bg: '#34C75915',
                  action: () => navigate_('users'),
                },
                {
                  label: 'Total inscrits',
                  value: stats.users.count,
                  icon: 'fa-user-check',
                  color: '#5856D6',
                  bg: '#5856D615',
                  action: () => navigate_('users'),
                },
              ].map(s => (
                <div
                  key={s.label}
                  onClick={s.action}
                  style={{ background: '#fff', borderRadius: 18, padding: '18px 16px', boxShadow: 'var(--shadow-card)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                  {s.value > 0 && (s.label.includes('attente')) && (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: '#FF3B30', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                      {s.value}
                    </span>
                  )}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 16 }} />
                  </div>
                  <p style={{ fontWeight: 800, fontSize: 22, color: s.value > 0 && s.label.includes('attente') ? s.color : 'var(--text-dark)', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Graphique dépôts / retraits */}
            <TransactionChart depots={depots} retraits={retraits} fmt={fmt} />

            {/* ── Versement journalier ── */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '20px 16px', boxShadow: 'var(--shadow-card)', marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#34C75915', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-coins" style={{ color: '#34C759', fontSize: 16 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-dark)' }}>Revenus journaliers</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {dernierVersement
                      ? `Dernier versement : ${new Date(dernierVersement).toLocaleString('fr-FR')}`
                      : 'Automatique chaque jour à 02h00 UTC'}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                Crédite le revenu journalier sur le solde de chaque investisseur ayant un plan actif. Les plans arrivés à échéance sont automatiquement clôturés.
              </p>
              <button
                onClick={handlePayerRevenus}
                disabled={payingRevenu}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                  background: payingRevenu ? '#ccc' : 'linear-gradient(135deg, #34C759, #30b050)',
                  color: '#fff', fontWeight: 800, fontSize: 15, cursor: payingRevenu ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: payingRevenu ? 'none' : '0 4px 15px rgba(52,199,89,0.35)',
                  transition: 'all 0.2s',
                }}
              >
                {payingRevenu
                  ? <><i className="fas fa-spinner fa-spin" /> Versement en cours…</>
                  : <><i className="fas fa-paper-plane" /> Verser les revenus maintenant</>}
              </button>
            </div>
          </div>
        )}

        {/* ─── DÉPÔTS ─── */}
        {tab === 'depots' && (
          <div>
            <SectionHeader icon="fa-arrow-down" title="Dépôts" badge={depots.filter(d => d.statut === 'en_attente').length} />
            {paginated(depots, 'depots').map(d => (
              <div key={d.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 10, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{d.nom}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{d.telephone} · {d.pays}</p>
                    <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 17, marginTop: 4 }}>{fmt(d.montant)} FCFA</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{d.operateur} · {new Date(d.date_depot).toLocaleDateString('fr-FR')}</p>
                    {d.reference && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ color: '#FF9500', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, fontFamily: 'monospace' }}>{d.reference}</span>
                        <button onClick={() => { navigator.clipboard.writeText(d.reference); toast.success('Référence copiée !'); }} style={{ background: '#FF950015', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', color: '#FF9500', fontSize: 10, fontWeight: 700 }}>Copier</button>
                      </div>
                    )}
                  </div>
                  <StatusBadge statut={d.statut} />
                </div>
                {d.statut === 'en_attente' && <ActionBtns onValidate={() => validateDepot(d.id)} onReject={() => rejectDepot(d.id)} />}
              </div>
            ))}
            {depots.length === 0 && <div className="empty-state"><i className="fas fa-inbox" /><p>Aucun dépôt</p></div>}
            <Pagination total={depots.length} page={pages.depots} setPage={v => setPage('depots', v)} />
          </div>
        )}

        {/* ─── RETRAITS ─── */}
        {tab === 'retraits' && (
          <div>
            <SectionHeader icon="fa-hand-holding-usd" title="Retraits" badge={retraits.filter(r => r.statut === 'en_attente').length} />
            {paginated(retraits, 'retraits').map(r => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 10, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{r.nom}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.telephone}</p>
                    <p style={{ color: '#007AFF', fontWeight: 800, fontSize: 17, marginTop: 4 }}>{fmt(r.montant)} FCFA</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{r.methode} · {r.numero_compte} · {new Date(r.date_demande).toLocaleDateString('fr-FR')}</p>
                    {r.reference && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ color: '#007AFF', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, fontFamily: 'monospace' }}>{r.reference}</span>
                        <button onClick={() => { navigator.clipboard.writeText(r.reference); toast.success('Référence copiée !'); }} style={{ background: '#007AFF15', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', color: '#007AFF', fontSize: 10, fontWeight: 700 }}>Copier</button>
                      </div>
                    )}
                  </div>
                  <StatusBadge statut={r.statut} />
                </div>
                {r.statut === 'en_attente' && <ActionBtns onValidate={() => validateRetrait(r.id)} onReject={() => rejectRetrait(r.id)} />}
              </div>
            ))}
            {retraits.length === 0 && <div className="empty-state"><i className="fas fa-inbox" /><p>Aucun retrait</p></div>}
            <Pagination total={retraits.length} page={pages.retraits} setPage={v => setPage('retraits', v)} />
          </div>
        )}

        {/* ─── CADEAUX VIP ─── */}
        {tab === 'cadeaux' && (
          <div>
            <SectionHeader icon="fa-gift" title="Cadeaux VIP" badge={cadeaux.filter(c => c.statut === 'en_attente').length} />
            {paginated(cadeaux, 'cadeaux').map(c => (
              <div key={c.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 10, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{c.nom}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.telephone}</p>
                    <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 17, marginTop: 4 }}>{fmt(c.montant)} FCFA</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>Cadeau VIP {c.niveau} · {new Date(c.date_demande).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <StatusBadge statut={c.statut} />
                </div>
                {c.statut === 'en_attente' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => validateCadeau(c.id)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#34C75915', color: '#34C759', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                      <i className="fas fa-check" style={{ marginRight: 6 }} />Valider & créditer
                    </button>
                    <button onClick={() => rejectCadeau(c.id)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#FF3B3015', color: '#FF3B30', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                      <i className="fas fa-times" style={{ marginRight: 6 }} />Rejeter
                    </button>
                  </div>
                )}
              </div>
            ))}
            {cadeaux.length === 0 && <div className="empty-state"><i className="fas fa-gift" /><p>Aucun cadeau réclamé</p></div>}
            <Pagination total={cadeaux.length} page={pages.cadeaux} setPage={v => setPage('cadeaux', v)} />
          </div>
        )}

        {/* ─── TRANSACTIONS ─── */}
        {tab === 'transactions' && (() => {
          const filtered = transactions.filter(t =>
            (txTypeFilter === 'all' || t.kind === txTypeFilter) &&
            (txStatutFilter === 'all' || t.statut === txStatutFilter)
          );
          return (
            <div>
              <SectionHeader icon="fa-receipt" title="Transactions" />
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={txTypeFilter} onChange={e => { setTxTypeFilter(e.target.value); setPage('transactions', 1); }}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: '#fff', color: 'var(--text-dark)', fontSize: 13 }}>
                  <option value="all">Tous les types</option>
                  <option value="depot">Dépôt</option>
                  <option value="retrait">Retrait</option>
                  <option value="investissement">Investissement</option>
                  <option value="parrainage">Commission parrainage</option>
                  <option value="revenu">Revenu investissement</option>
                  <option value="bonus">Bonus roue</option>
                  <option value="credit_admin">Crédit administrateur</option>
                </select>
                <select value={txStatutFilter} onChange={e => { setTxStatutFilter(e.target.value); setPage('transactions', 1); }}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: '#fff', color: 'var(--text-dark)', fontSize: 13 }}>
                  <option value="all">Tous les statuts</option>
                  <option value="valide">Validé</option>
                  <option value="en_attente">En attente</option>
                  <option value="rejete">Rejeté</option>
                  <option value="actif">Actif</option>
                </select>
              </div>
              {paginated(filtered, 'transactions').map(t => (
                <div key={t.id} style={{ background: '#fff', borderRadius: 16, padding: '12px 16px', marginBottom: 10, boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</p>
                      {t.user && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.user.nom} · {t.user.telephone}</p>}
                      <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{new Date(t.date).toLocaleString('fr-FR')}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, fontSize: 15, color: t.sens === '+' ? '#34C759' : 'var(--text-dark)' }}>{t.sens}{fmt(t.montant)}</p>
                      <StatusBadge statut={t.statut} />
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="empty-state"><i className="fas fa-receipt" /><p>Aucune transaction</p></div>}
              <Pagination total={filtered.length} page={pages.transactions} setPage={v => setPage('transactions', v)} />
            </div>
          );
        })()}

        {/* ─── UTILISATEURS ─── */}
        {tab === 'users' && (
          <div>
            <SectionHeader icon="fa-users" title={`Utilisateurs (${users.length})`} />
            {paginated(users, 'users').map(u => (
              <div key={u.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 10, boxShadow: 'var(--shadow-card)', border: u.banni ? '1.5px solid #FF3B3040' : u.retrait_bloque ? '1.5px solid #5856D640' : 'none', opacity: u.banni ? 0.8 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: u.banni ? '#FF3B30' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{(u.nom || '?')[0].toUpperCase()}</span>
                    {u.banni && <div style={{ position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#FF3B30', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-ban" style={{ color: '#fff', fontSize: 7 }} /></div>}
                    {!u.banni && u.retrait_bloque && <div style={{ position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#5856D6', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-lock" style={{ color: '#fff', fontSize: 7 }} /></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{u.nom}</p>
                      {u.role === 'admin' && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: '#007AFF20', color: '#007AFF', fontWeight: 700 }}>Admin</span>}
                      {u.banni && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: '#FF3B3020', color: '#FF3B30', fontWeight: 700 }}>Banni</span>}
                      {u.retrait_bloque && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: '#5856D620', color: '#5856D6', fontWeight: 700 }}>Retrait bloqué</span>}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 1 }}>{u.telephone} · {u.pays}</p>
                    <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13, marginTop: 1 }}>{fmt(u.solde || 0)} FCFA</p>
                    {(u.lien_parrainage || u.code_parrainage) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                        <span style={{ color: '#5856D6', fontSize: 11, fontWeight: 600, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                          {u.code_parrainage}
                        </span>
                        <button
                          onClick={() => {
                            const ref = u.lien_parrainage || `${window.location.origin}/register?ref=${u.code_parrainage}`;
                            navigator.clipboard.writeText(ref);
                            toast.success('Lien de parrainage copié !');
                          }}
                          style={{ flexShrink: 0, background: '#5856D615', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', color: '#5856D6', fontSize: 10, fontWeight: 700 }}
                        >
                          <i className="fas fa-copy" style={{ marginRight: 3 }} />Copier
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openActionMenu(u)}
                    style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: 1 }}
                  >
                    ⋮
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && <div className="empty-state"><i className="fas fa-users" /><p>Aucun utilisateur</p></div>}
            <Pagination total={users.length} page={pages.users} setPage={v => setPage('users', v)} />
          </div>
        )}

        {/* ─── POSTS ─── */}
        {tab === 'posts' && (
          <div>
            <SectionHeader icon="fa-newspaper" title="Posts" badge={posts.filter(p => p.statut === 'en_attente').length} />
            {paginated(posts, 'posts').map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 10, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, paddingRight: 10 }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{p.nom}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>{p.message}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>{new Date(p.date_creation).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <StatusBadge statut={p.statut} />
                </div>
                {p.statut === 'en_attente' && <ActionBtns onValidate={() => validatePost(p.id)} onReject={() => rejectPost(p.id)} />}
              </div>
            ))}
            {posts.length === 0 && <div className="empty-state"><i className="fas fa-newspaper" /><p>Aucun post</p></div>}
            <Pagination total={posts.length} page={pages.posts} setPage={v => setPage('posts', v)} />
          </div>
        )}

        {/* ─── PLANS VIP ─── */}
        {tab === 'plans' && (
          <div>
            <SectionHeader
              icon="fa-chart-line"
              title={`Plans VIP (${plans.length})`}
              action={
                <button onClick={() => openPlanModal()} style={{ padding: '9px 16px', borderRadius: 50, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-plus" />Ajouter
                </button>
              }
            />
            {paginated(plans, 'plans').map((plan, idx) => {
              const revJ = (plan.prix * plan.rendement_journalier) / 100;
              const COLORS = ['#FF9500', '#007AFF', '#34C759', '#5856D6', '#FF3B30', '#FF9500', '#00C7BE'];
              const color = COLORS[idx % COLORS.length];
              return (
                <div key={plan.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 10, boxShadow: 'var(--shadow-card)', borderLeft: `4px solid ${color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 800, fontSize: 15, color, marginBottom: 6 }}>{plan.nom}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Prix : <strong style={{ color: 'var(--text-dark)' }}>{fmt(plan.prix)} FCFA</strong></span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Durée : <strong style={{ color: 'var(--text-dark)' }}>{plan.duree_jours}j</strong></span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Rend. : <strong style={{ color: '#34C759' }}>{plan.rendement_journalier}%/j</strong></span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>+{fmt(revJ)} FCFA/jour</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openPlanModal(plan)} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: '#007AFF15', color: '#007AFF', cursor: 'pointer' }}>
                        <i className="fas fa-edit" style={{ fontSize: 14 }} />
                      </button>
                      <button onClick={() => deletePlan(plan.id)} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: '#FF3B3015', color: '#FF3B30', cursor: 'pointer' }}>
                        <i className="fas fa-trash" style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {plans.length === 0 && <div className="empty-state"><i className="fas fa-chart-line" /><p>Aucun plan</p></div>}
            <Pagination total={plans.length} page={pages.plans} setPage={v => setPage('plans', v)} />
          </div>
        )}

        {/* ─── AFFICHES ─── */}
        {tab === 'annonces' && (
          <div>
            <SectionHeader icon="fa-image" title="Affiches du dashboard" />

            <div style={{ background: '#fff', borderRadius: 16, padding: 18, marginBottom: 20, boxShadow: 'var(--shadow-card)', border: '2px dashed var(--primary)40' }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-dark)' }}>
                <i className="fas fa-cloud-upload-alt" style={{ color: 'var(--primary)', marginRight: 8 }} />Ajouter une affiche
              </p>
              <div onClick={() => fileRef.current?.click()} style={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-page)', minHeight: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', marginBottom: 14 }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Aperçu" style={{ width: '100%', maxHeight: 240, objectFit: 'cover' }} />
                ) : (
                  <>
                    <i className="fas fa-image" style={{ fontSize: 36, color: 'var(--text-muted)', marginBottom: 8 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cliquez pour choisir une image</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              <div style={{ display: 'flex', gap: 10 }}>
                {imagePreview && (
                  <button onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }} style={{ flex: 1, padding: '12px', borderRadius: 50, border: '1px solid var(--border-color)', background: 'transparent', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    Changer
                  </button>
                )}
                <button onClick={uploadAnnonce} disabled={!imageFile || uploading} className="btn btn-primary" style={{ flex: 1, padding: '12px', opacity: (!imageFile || uploading) ? 0.5 : 1 }}>
                  {uploading ? 'Publication...' : <><i className="fas fa-paper-plane" style={{ marginRight: 6 }} />Publier</>}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {paginated(annonces, 'annonces').map(ann => (
                <div key={ann.id} style={{ borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: 'var(--shadow-card)', opacity: ann.actif ? 1 : 0.5, position: 'relative' }}>
                  {ann.image ? (
                    <img src={`/uploads/${ann.image}`} alt="Affiche" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ height: 130, background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-image" style={{ fontSize: 32, color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 6, left: 6, fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: ann.actif ? 'rgba(52,199,89,0.9)' : 'rgba(0,0,0,0.5)', color: '#fff' }}>
                    {ann.actif ? '● Live' : '● Masqué'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, padding: '8px 8px' }}>
                    <button onClick={() => toggleAnnonce(ann)} style={{ flex: 1, padding: '6px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: ann.actif ? '#FF3B3015' : '#34C75915', color: ann.actif ? '#FF3B30' : '#34C759' }}>
                      <i className={`fas ${ann.actif ? 'fa-eye-slash' : 'fa-eye'}`} /> {ann.actif ? 'Masquer' : 'Afficher'}
                    </button>
                    <button onClick={() => deleteAnnonce(ann.id)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#FF3B3015', color: '#FF3B30', cursor: 'pointer' }}>
                      <i className="fas fa-trash" style={{ fontSize: 12 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {annonces.length === 0 && <div className="empty-state"><i className="fas fa-image" /><p>Aucune affiche</p></div>}
            <Pagination total={annonces.length} page={pages.annonces} setPage={v => setPage('annonces', v)} />
          </div>
        )}

        {/* ─── SALAIRES VIP ─── */}
        {tab === 'salaires' && (
          <div>
            <SectionHeader icon="fa-money-bill-wave" title="Salaires VIP" />

            {/* Niveaux existants */}
            {salaires.map((s, i) => (
              <div key={s.niveau} style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', marginBottom: 14, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#34C75920', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-star" style={{ color: '#34C759', fontSize: 14 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>Niveau VIP {s.niveau}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Configuration du palier</p>
                  </div>
                  <button onClick={() => deleteSalaire(s.niveau)} style={{ width: 32, height: 32, borderRadius: 8, background: '#FF3B3020', border: 'none', color: '#FF3B30', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-trash" style={{ fontSize: 12 }} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div className="input-group">
                    <label>Label (nom affiché)</label>
                    <input type="text" value={s.label || ''} onChange={e => updateSalaire(i, 'label', e.target.value)} placeholder={`VIP ${s.niveau}`} />
                  </div>
                  <div className="input-group">
                    <label>Niveau (numéro)</label>
                    <input type="number" value={s.niveau} disabled style={{ opacity: 0.5 }} />
                  </div>
                  <div className="input-group">
                    <label>Filleuls requis</label>
                    <input type="number" value={s.requis} onChange={e => updateSalaire(i, 'requis', e.target.value)} placeholder="70" />
                  </div>
                  <div className="input-group">
                    <label>Montant cadeau (FCFA)</label>
                    <input type="number" value={s.cadeau} onChange={e => updateSalaire(i, 'cadeau', e.target.value)} placeholder="5000" />
                  </div>
                </div>
                <button onClick={() => saveSalaire(s)} className="btn btn-primary" style={{ padding: '11px', borderRadius: 50 }}>
                  <i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer
                </button>
              </div>
            ))}

            {salaires.length === 0 && (
              <div className="empty-state"><i className="fas fa-money-bill-wave" /><p>Aucun palier configuré</p></div>
            )}

            {/* Ajouter un nouveau niveau */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', marginBottom: 14, boxShadow: 'var(--shadow-card)', border: '2px dashed #34C75940' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#34C75920', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-plus" style={{ color: '#34C759', fontSize: 14 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>Ajouter un palier</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nouveau niveau VIP avec cadeau</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div className="input-group">
                  <label>Numéro de niveau</label>
                  <input type="number" value={newSalaire.niveau} onChange={e => setNewSalaire(s => ({ ...s, niveau: e.target.value }))} placeholder="4" />
                </div>
                <div className="input-group">
                  <label>Label</label>
                  <input type="text" value={newSalaire.label} onChange={e => setNewSalaire(s => ({ ...s, label: e.target.value }))} placeholder="VIP 4" />
                </div>
                <div className="input-group">
                  <label>Filleuls requis</label>
                  <input type="number" value={newSalaire.requis} onChange={e => setNewSalaire(s => ({ ...s, requis: e.target.value }))} placeholder="300" />
                </div>
                <div className="input-group">
                  <label>Montant cadeau (FCFA)</label>
                  <input type="number" value={newSalaire.cadeau} onChange={e => setNewSalaire(s => ({ ...s, cadeau: e.target.value }))} placeholder="15000" />
                </div>
              </div>
              <button onClick={addSalaire} style={{ width: '100%', padding: '12px', borderRadius: 50, background: '#34C759', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 3px 10px rgba(52,199,89,0.35)' }}>
                <i className="fas fa-plus" style={{ marginRight: 8 }} />Ajouter ce palier
              </button>
            </div>
          </div>
        )}

        {/* ─── PARAMÈTRES ─── */}
        {tab === 'settings' && (
          <div>
            <SectionHeader icon="fa-cog" title="Paramètres" />

            {/* ── Retrait ON/OFF ── */}
            {(() => {
              const isOff = settings.retrait_off === '1';
              const toggle = async () => {
                const newVal = isOff ? '0' : '1';
                try {
                  await api.put('/admin/settings', { cle: 'retrait_off', valeur: newVal });
                  setSettings(s => ({ ...s, retrait_off: newVal }));
                  toast.success(newVal === '1' ? '🔴 Retraits suspendus' : '🟢 Retraits réactivés');
                } catch { toast.error('Erreur'); }
              };
              return (
                <div onClick={toggle} style={{
                  background: isOff ? '#FF3B30' : '#34C759',
                  borderRadius: 16, padding: '18px 16px', marginBottom: 14,
                  boxShadow: isOff ? '0 4px 20px rgba(255,59,48,0.35)' : '0 4px 20px rgba(52,199,89,0.25)',
                  cursor: 'pointer', transition: 'all .2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`fas ${isOff ? 'fa-ban' : 'fa-check-circle'}`} style={{ color: '#fff', fontSize: 20 }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>
                        {isOff ? 'Retraits SUSPENDUS' : 'Retraits ACTIFS'}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                        {isOff ? 'Cliquer pour réactiver les retraits' : 'Cliquer pour suspendre tous les retraits'}
                      </p>
                    </div>
                  </div>
                  {/* Toggle switch */}
                  <div style={{
                    width: 52, height: 28, borderRadius: 50,
                    background: isOff ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.4)',
                    position: 'relative', flexShrink: 0,
                  }}>
                    <div style={{
                      position: 'absolute', top: 3,
                      left: isOff ? 3 : 25,
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#fff',
                      transition: 'left .2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                </div>
              );
            })()}

            <div style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', marginBottom: 14, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#FF950020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-arrow-down" style={{ color: 'var(--primary)', fontSize: 14 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>Dépôt minimum</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Montant minimal pour déposer (FCFA)</p>
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 12 }}>
                <label>Montant minimum (FCFA)</label>
                <input type="number" value={settings.min_depot || '500'} onChange={e => setSettings(s => ({ ...s, min_depot: e.target.value }))} placeholder="500" />
              </div>
              <button onClick={saveSettings} className="btn btn-primary" style={{ padding: '12px', borderRadius: 50 }}>
                <i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer
              </button>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', marginBottom: 14, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#4A90E220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-arrow-up" style={{ color: '#4A90E2', fontSize: 14 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>Retrait minimum</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Montant minimal pour retirer (FCFA)</p>
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 12 }}>
                <label>Montant minimum (FCFA)</label>
                <input type="number" value={settings.min_retrait || '2000'} onChange={e => setSettings(s => ({ ...s, min_retrait: e.target.value }))} placeholder="2000" />
              </div>
              <button onClick={saveRetrait} className="btn btn-primary" style={{ padding: '12px', borderRadius: 50 }}>
                <i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer
              </button>
            </div>

            {/* ── Liens service client ── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', marginBottom: 14, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#25D36620', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fab fa-whatsapp" style={{ color: '#25D366', fontSize: 16 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>Liens service client</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Bouton flottant WhatsApp & liens FAQ</p>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 10 }}>
                <label><i className="fab fa-whatsapp" style={{ color: '#25D366', marginRight: 6 }} />WhatsApp service client (bouton flottant)</label>
                <input type="url" value={settings.lien_whatsapp || ''}
                  onChange={e => setSettings(s => ({ ...s, lien_whatsapp: e.target.value }))}
                  placeholder="https://wa.me/237600000000" />
              </div>
              <div className="input-group" style={{ marginBottom: 10 }}>
                <label><i className="fab fa-telegram" style={{ color: '#229ED9', marginRight: 6 }} />Lien chaîne Telegram (page FAQ)</label>
                <input type="url" value={settings.lien_telegram || ''}
                  onChange={e => setSettings(s => ({ ...s, lien_telegram: e.target.value }))}
                  placeholder="https://t.me/votrechaîne" />
              </div>
              <div className="input-group" style={{ marginBottom: 14 }}>
                <label><i className="fab fa-whatsapp" style={{ color: '#25D366', marginRight: 6 }} />Lien groupe WhatsApp (page FAQ)</label>
                <input type="url" value={settings.lien_whatsapp_groupe || ''}
                  onChange={e => setSettings(s => ({ ...s, lien_whatsapp_groupe: e.target.value }))}
                  placeholder="https://chat.whatsapp.com/..." />
              </div>

              <button onClick={async () => {
                try {
                  await Promise.all([
                    api.put('/admin/settings', { cle: 'lien_whatsapp', valeur: settings.lien_whatsapp || '' }),
                    api.put('/admin/settings', { cle: 'lien_telegram', valeur: settings.lien_telegram || '' }),
                    api.put('/admin/settings', { cle: 'lien_whatsapp_groupe', valeur: settings.lien_whatsapp_groupe || '' }),
                  ]);
                  toast.success('Liens sauvegardés ✅');
                } catch { toast.error('Erreur'); }
              }} className="btn btn-primary" style={{ padding: '12px', borderRadius: 50 }}>
                <i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer les liens
              </button>
            </div>

            {/* ── Horaires de retrait ── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', marginBottom: 14, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-clock" style={{ color: '#007AFF', fontSize: 14 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>Horaires & limite de retrait</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Jours, heures et nombre max par utilisateur</p>
                </div>
              </div>

              {/* Jours autorisés */}
              <p style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Jours autorisés</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { num: 1, label: 'Lun' }, { num: 2, label: 'Mar' }, { num: 3, label: 'Mer' },
                  { num: 4, label: 'Jeu' }, { num: 5, label: 'Ven' }, { num: 6, label: 'Sam' }, { num: 0, label: 'Dim' },
                ].map(({ num, label }) => {
                  const jours = (settings.retrait_jours || '1,2,3,4,5,6').split(',').map(d => parseInt(d.trim()));
                  const checked = jours.includes(num);
                  const toggle = () => {
                    const next = checked ? jours.filter(d => d !== num) : [...jours, num].sort((a, b) => a - b);
                    setSettings(s => ({ ...s, retrait_jours: next.join(',') }));
                  };
                  return (
                    <button key={num} onClick={toggle} style={{
                      padding: '7px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      background: checked ? '#007AFF' : '#F0F0F0',
                      color: checked ? '#fff' : '#888',
                      boxShadow: checked ? '0 2px 8px rgba(0,122,255,0.3)' : 'none',
                      transition: 'all .15s',
                    }}>{label}</button>
                  );
                })}
              </div>

              {/* Heures */}
              <p style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Plage horaire (heure GMT)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div className="input-group">
                  <label>Heure de début</label>
                  <input type="number" min="0" max="23" value={settings.retrait_heure_debut ?? '9'}
                    onChange={e => setSettings(s => ({ ...s, retrait_heure_debut: e.target.value }))} placeholder="9" />
                </div>
                <div className="input-group">
                  <label>Heure de fin</label>
                  <input type="number" min="0" max="23" value={settings.retrait_heure_fin ?? '19'}
                    onChange={e => setSettings(s => ({ ...s, retrait_heure_fin: e.target.value }))} placeholder="19" />
                </div>
              </div>

              {/* Max par jour */}
              <p style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Nombre de retraits max par utilisateur / 24h</p>
              <div className="input-group" style={{ marginBottom: 14 }}>
                <input type="number" min="1" value={settings.retrait_max_par_jour ?? '1'}
                  onChange={e => setSettings(s => ({ ...s, retrait_max_par_jour: e.target.value }))} placeholder="1" />
              </div>

              <button onClick={async () => {
                try {
                  await Promise.all([
                    api.put('/admin/settings', { cle: 'retrait_jours', valeur: settings.retrait_jours || '1,2,3,4,5,6' }),
                    api.put('/admin/settings', { cle: 'retrait_heure_debut', valeur: settings.retrait_heure_debut ?? '9' }),
                    api.put('/admin/settings', { cle: 'retrait_heure_fin', valeur: settings.retrait_heure_fin ?? '19' }),
                    api.put('/admin/settings', { cle: 'retrait_max_par_jour', valeur: settings.retrait_max_par_jour ?? '1' }),
                  ]);
                  toast.success('Horaires de retrait sauvegardés ✅');
                } catch { toast.error('Erreur'); }
              }} className="btn btn-primary" style={{ padding: '12px', borderRadius: 50 }}>
                <i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer les horaires
              </button>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', marginBottom: 14, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#34C75920', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-users" style={{ color: '#34C759', fontSize: 14 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>Commissions de parrainage</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Pourcentage versé au parrain (en %)</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[1, 2, 3].map(n => (
                  <div className="input-group" key={n}>
                    <label>Niveau {n} (%)</label>
                    <input type="number" value={settings[`commission_niveau${n}`] ?? (n === 1 ? '10' : n === 2 ? '5' : '2')}
                      onChange={e => setSettings(s => ({ ...s, [`commission_niveau${n}`]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <button onClick={saveCommissions} className="btn btn-primary" style={{ padding: '12px', borderRadius: 50 }}>
                <i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer
              </button>
            </div>

            {/* ── Message de bienvenue popup ── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', marginBottom: 14, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#FF950020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-comment-dots" style={{ color: 'var(--primary)', fontSize: 14 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>Message de bienvenue (popup)</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Affiché aux utilisateurs à chaque connexion sur le tableau de bord</p>
                </div>
              </div>

              {/* Activer/désactiver le popup */}
              {(() => {
                const actif = settings.popup_actif !== '0';
                const toggle = async () => {
                  const newVal = actif ? '0' : '1';
                  try {
                    await api.put('/admin/settings', { cle: 'popup_actif', valeur: newVal });
                    setSettings(s => ({ ...s, popup_actif: newVal }));
                    toast.success(newVal === '1' ? '✅ Popup activé' : '🔕 Popup désactivé');
                  } catch { toast.error('Erreur'); }
                };
                return (
                  <div onClick={toggle} style={{
                    background: actif ? '#34C759' : '#8E8E93',
                    borderRadius: 12, padding: '12px 14px', marginBottom: 14,
                    cursor: 'pointer', transition: 'all .2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className={`fas ${actif ? 'fa-eye' : 'fa-eye-slash'}`} style={{ color: '#fff', fontSize: 16 }} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>
                        {actif ? 'Popup activé' : 'Popup désactivé'}
                      </span>
                    </div>
                    <div style={{ width: 46, height: 24, borderRadius: 50, background: 'rgba(255,255,255,0.3)', position: 'relative', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 2, left: actif ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                );
              })()}

              <div className="input-group" style={{ marginBottom: 14 }}>
                <label>Message de bienvenue</label>
                <textarea
                  rows={4}
                  value={settings.message_bienvenue || ''}
                  onChange={e => setSettings(s => ({ ...s, message_bienvenue: e.target.value }))}
                  placeholder="Ex : Bienvenue ! Rejoignez notre canal Telegram pour suivre les actualités."
                  style={{ width: '100%', borderRadius: 10, border: '1.5px solid #E8E8E8', padding: '10px 12px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
                <i className="fab fa-whatsapp" style={{ color: '#25D366', marginRight: 4 }} />Les boutons WhatsApp et Telegram sont affichés automatiquement si leurs liens sont configurés ci-dessus.
              </p>
              <button onClick={async () => {
                try {
                  await api.put('/admin/settings', { cle: 'message_bienvenue', valeur: settings.message_bienvenue || '' });
                  toast.success('Message de bienvenue sauvegardé ✅');
                } catch { toast.error('Erreur'); }
              }} className="btn btn-primary" style={{ padding: '12px', borderRadius: 50 }}>
                <i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer le message
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
