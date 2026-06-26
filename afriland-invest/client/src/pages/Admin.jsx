import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('depots');
  const [depots, setDepots] = useState([]);
  const [retraits, setRetraits] = useState([]);
  const [cadeaux, setCadeaux] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [settings, setSettings] = useState({ min_depot: '500' });
  const [transactions, setTransactions] = useState([]);
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txStatutFilter, setTxStatutFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [creditModal, setCreditModal] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [planModal, setPlanModal] = useState(null);
  const [planForm, setPlanForm] = useState({ nom: '', prix: '', duree_jours: '', rendement_journalier: '' });

  // Upload d'image pour annonces
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const navigate = useNavigate();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [statsRes, depotsRes, retraitsRes, cadeauxRes, usersRes, postsRes, plansRes, annoncesRes, settingsRes, txRes] = await Promise.all([
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
    } catch { toast.error('Erreur de chargement admin'); }
    finally { setLoading(false); }
  };

  // ── Dépôts ──
  const validateDepot = async (id) => {
    try { await api.put(`/admin/depots/${id}/validate`); toast.success('Dépôt validé ✅'); loadAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };
  const rejectDepot = async (id) => {
    try { await api.put(`/admin/depots/${id}/reject`); toast.success('Dépôt rejeté'); loadAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  // ── Retraits ──
  const validateRetrait = async (id) => {
    try { await api.put(`/admin/retraits/${id}/validate`); toast.success('Retrait validé ✅'); loadAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };
  const rejectRetrait = async (id) => {
    try { await api.put(`/admin/retraits/${id}/reject`); toast.success('Retrait rejeté, remboursé'); loadAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  // ── Cadeaux VIP ──
  const validateCadeau = async (id) => {
    try { await api.put(`/admin/cadeaux/${id}/validate`); toast.success('Cadeau validé et crédité ✅'); loadAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };
  const rejectCadeau = async (id) => {
    try { await api.put(`/admin/cadeaux/${id}/reject`); toast.success('Cadeau rejeté'); loadAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  // ── Posts ──
  const validatePost = async (id) => {
    try { await api.put(`/admin/posts/${id}/validate`); toast.success('Post validé'); loadAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };
  const rejectPost = async (id) => {
    try { await api.put(`/admin/posts/${id}/reject`); toast.success('Post rejeté'); loadAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  // ── Crédit ──
  const handleCredit = async () => {
    if (!creditAmount || isNaN(creditAmount)) return toast.error('Montant invalide');
    try {
      await api.put(`/admin/users/${creditModal}/credit`, { montant: parseFloat(creditAmount) });
      toast.success('Crédit effectué ✅'); setCreditModal(null); setCreditAmount(''); loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  // ── Settings ──
  const saveSettings = async () => {
    try {
      await api.put('/admin/settings', { cle: 'min_depot', valeur: settings.min_depot });
      toast.success('Minimum de dépôt sauvegardé ✅');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur — exécutez fixes.sql dans Supabase');
    }
  };

  const saveCommissions = async () => {
    try {
      await Promise.all([
        api.put('/admin/settings', { cle: 'commission_niveau1', valeur: settings.commission_niveau1 ?? '10' }),
        api.put('/admin/settings', { cle: 'commission_niveau2', valeur: settings.commission_niveau2 ?? '5' }),
        api.put('/admin/settings', { cle: 'commission_niveau3', valeur: settings.commission_niveau3 ?? '2' }),
      ]);
      toast.success('Commissions de parrainage sauvegardées ✅');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur — exécutez fixes.sql dans Supabase');
    }
  };

  // ── Plans ──
  const openPlanModal = (plan = null) => {
    if (plan) {
      setPlanForm({ nom: plan.nom, prix: plan.prix, duree_jours: plan.duree_jours, rendement_journalier: plan.rendement_journalier });
      setPlanModal(plan.id);
    } else {
      setPlanForm({ nom: '', prix: '', duree_jours: '', rendement_journalier: '' });
      setPlanModal('new');
    }
  };
  const savePlan = async () => {
    try {
      if (planModal === 'new') {
        await api.post('/admin/plans', planForm); toast.success('Plan créé ✅');
      } else {
        await api.put(`/admin/plans/${planModal}`, planForm); toast.success('Plan modifié ✅');
      }
      setPlanModal(null); loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };
  const deletePlan = async (id) => {
    if (!confirm('Supprimer ce plan ?')) return;
    try { await api.delete(`/admin/plans/${id}`); toast.success('Plan supprimé'); loadAll(); }
    catch { toast.error('Erreur'); }
  };

  // ── Annonces images ──
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Sélectionnez une image');
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const uploadAnnonce = async () => {
    if (!imageFile) return toast.error('Sélectionnez une image');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      await api.post('/admin/annonces', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Affiche publiée ✅');
      setImageFile(null);
      setImagePreview(null);
      if (fileRef.current) fileRef.current.value = '';
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur — exécutez fixes.sql dans Supabase');
    } finally { setUploading(false); }
  };

  const toggleAnnonce = async (ann) => {
    try {
      await api.put(`/admin/annonces/${ann.id}`, { actif: !ann.actif });
      toast.success(ann.actif ? 'Affiche masquée' : 'Affiche visible ✅'); loadAll();
    } catch { toast.error('Erreur'); }
  };

  const deleteAnnonce = async (id) => {
    if (!confirm('Supprimer cette affiche ?')) return;
    try { await api.delete(`/admin/annonces/${id}`); toast.success('Affiche supprimée'); loadAll(); }
    catch { toast.error('Erreur'); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
  const statusColor = { valide: 'green', en_attente: 'yellow', rejete: 'red' };

  const TABS = [
    { key: 'depots', label: 'Dépôts', icon: 'fa-arrow-down', badge: depots.filter(d => d.statut === 'en_attente').length },
    { key: 'retraits', label: 'Retraits', icon: 'fa-hand-holding-usd', badge: retraits.filter(r => r.statut === 'en_attente').length },
    { key: 'cadeaux', label: 'Cadeaux VIP', icon: 'fa-gift', badge: cadeaux.filter(c => c.statut === 'en_attente').length },
    { key: 'transactions', label: 'Transactions', icon: 'fa-receipt' },
    { key: 'users', label: 'Utilisateurs', icon: 'fa-users' },
    { key: 'posts', label: 'Posts', icon: 'fa-newspaper', badge: posts.filter(p => p.statut === 'en_attente').length },
    { key: 'plans', label: 'Plans VIP', icon: 'fa-chart-line' },
    { key: 'annonces', label: 'Affiches', icon: 'fa-image' },
    { key: 'settings', label: 'Paramètres', icon: 'fa-cog' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-dark)' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>

      {/* Modal Crédit */}
      {creditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Créditer l'utilisateur</h3>
            <div className="input-group">
              <label>Montant (FCFA)</label>
              <input type="number" placeholder="Ex: 10000" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn btn-outline" onClick={() => { setCreditModal(null); setCreditAmount(''); }} style={{ flex: 1, padding: '12px' }}>Annuler</button>
              <button className="btn btn-primary" onClick={handleCredit} style={{ flex: 1, padding: '12px' }}>Créditer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Plan */}
      {planModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>{planModal === 'new' ? 'Nouveau plan' : 'Modifier le plan'}</h3>
            {[
              { key: 'nom', label: 'Nom du plan', type: 'text', placeholder: 'Ex: VIP 1' },
              { key: 'prix', label: 'Prix (FCFA)', type: 'number', placeholder: 'Ex: 1000' },
              { key: 'duree_jours', label: 'Durée (jours)', type: 'number', placeholder: 'Ex: 30' },
              { key: 'rendement_journalier', label: 'Rendement journalier (%)', type: 'number', placeholder: 'Ex: 1.5' },
            ].map(f => (
              <div className="input-group" key={f.key} style={{ marginBottom: 12 }}>
                <label>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={planForm[f.key]} onChange={e => setPlanForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            {planForm.prix && planForm.rendement_journalier && (
              <p style={{ fontSize: 12, color: 'var(--green-primary)', marginBottom: 12 }}>
                Revenu/j : {fmt(parseFloat(planForm.prix || 0) * parseFloat(planForm.rendement_journalier || 0) / 100)} FCFA
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setPlanModal(null)} style={{ flex: 1, padding: '12px' }}>Annuler</button>
              <button className="btn btn-primary" onClick={savePlan} style={{ flex: 1, padding: '12px' }}>
                {planModal === 'new' ? 'Créer' : 'Modifier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 22 }}>
            <i className="fas fa-shield-alt" style={{ color: 'var(--blue-primary)', marginRight: 10 }} />Administration
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>GIFETAL PRO</p>
        </div>
        <button onClick={() => navigate('/')} style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <i className="fas fa-home" /> Accueil
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Utilisateurs', value: stats.users.count, icon: 'fa-users', color: 'var(--green-primary)' },
            { label: 'Dépôts validés', value: `${fmt(stats.depots.total)} FCFA`, icon: 'fa-arrow-down', color: 'var(--blue-primary)' },
            { label: 'Retraits validés', value: `${fmt(stats.retraits.total)} FCFA`, icon: 'fa-hand-holding-usd', color: '#f59e0b' },
            { label: 'Plans actifs', value: stats.commandes.count, icon: 'fa-chart-line', color: '#a855f7' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
              <i className={`fas ${s.icon}`} style={{ fontSize: 24, color: s.color, marginBottom: 8 }} />
              <p style={{ fontWeight: 700, fontSize: 16 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, position: 'relative',
            background: tab === t.key ? 'linear-gradient(135deg,var(--green-primary),var(--green-dark))' : 'rgba(0,0,0,0.05)',
            color: tab === t.key ? '#fff' : 'var(--text-muted)',
          }}>
            <i className={`fas ${t.icon}`} style={{ marginRight: 5 }} />{t.label}
            {t.badge > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── DÉPÔTS ─── */}
      {tab === 'depots' && (
        <div>
          {depots.filter(d => d.statut === 'en_attente').length > 0 && (
            <p style={{ color: '#f59e0b', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
              <i className="fas fa-clock" style={{ marginRight: 6 }} />
              {depots.filter(d => d.statut === 'en_attente').length} dépôt(s) en attente
            </p>
          )}
          {depots.map(d => (
            <div key={d.id} className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontWeight: 700 }}>{d.nom} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>• {d.telephone}</span></p>
                  <p style={{ color: 'var(--green-primary)', fontWeight: 700, fontSize: 16 }}>{fmt(d.montant)} FCFA</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{d.pays} • {d.operateur} • {new Date(d.date_depot).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`badge badge-${statusColor[d.statut] || 'yellow'}`}>{d.statut}</span>
              </div>
              {d.statut === 'en_attente' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => validateDepot(d.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'rgba(27,42,107,0.15)', color: 'var(--green-primary)', fontWeight: 600, cursor: 'pointer' }}>
                    <i className="fas fa-check" /> Valider
                  </button>
                  <button onClick={() => rejectDepot(d.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', fontWeight: 600, cursor: 'pointer' }}>
                    <i className="fas fa-times" /> Rejeter
                  </button>
                </div>
              )}
            </div>
          ))}
          {depots.length === 0 && <div className="empty-state"><i className="fas fa-inbox" /><p>Aucun dépôt</p></div>}
        </div>
      )}

      {/* ─── RETRAITS ─── */}
      {tab === 'retraits' && (
        <div>
          {retraits.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontWeight: 700 }}>{r.nom} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>• {r.telephone}</span></p>
                  <p style={{ color: 'var(--blue-primary)', fontWeight: 700, fontSize: 16 }}>{fmt(r.montant)} FCFA</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.methode} • {r.numero_compte} • {new Date(r.date_demande).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`badge badge-${statusColor[r.statut] || 'yellow'}`}>{r.statut}</span>
              </div>
              {r.statut === 'en_attente' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => validateRetrait(r.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'rgba(27,42,107,0.15)', color: 'var(--green-primary)', fontWeight: 600, cursor: 'pointer' }}>
                    <i className="fas fa-check" /> Valider
                  </button>
                  <button onClick={() => rejectRetrait(r.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', fontWeight: 600, cursor: 'pointer' }}>
                    <i className="fas fa-times" /> Rejeter
                  </button>
                </div>
              )}
            </div>
          ))}
          {retraits.length === 0 && <div className="empty-state"><i className="fas fa-inbox" /><p>Aucun retrait</p></div>}
        </div>
      )}

      {/* ─── CADEAUX VIP ─── */}
      {tab === 'cadeaux' && (
        <div>
          {cadeaux.filter(c => c.statut === 'en_attente').length > 0 && (
            <p style={{ color: '#f59e0b', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
              <i className="fas fa-clock" style={{ marginRight: 6 }} />
              {cadeaux.filter(c => c.statut === 'en_attente').length} cadeau(x) en attente
            </p>
          )}
          {cadeaux.map(c => (
            <div key={c.id} className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontWeight: 700 }}>{c.nom} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>• {c.telephone}</span></p>
                  <p style={{ color: 'var(--green-primary)', fontWeight: 700, fontSize: 16 }}>{fmt(c.montant)} FCFA</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Cadeau VIP {c.niveau} • {new Date(c.date_demande).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`badge badge-${statusColor[c.statut] || 'yellow'}`}>{c.statut}</span>
              </div>
              {c.statut === 'en_attente' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => validateCadeau(c.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'rgba(27,42,107,0.15)', color: 'var(--green-primary)', fontWeight: 600, cursor: 'pointer' }}>
                    <i className="fas fa-check" /> Valider & créditer
                  </button>
                  <button onClick={() => rejectCadeau(c.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', fontWeight: 600, cursor: 'pointer' }}>
                    <i className="fas fa-times" /> Rejeter
                  </button>
                </div>
              )}
            </div>
          ))}
          {cadeaux.length === 0 && <div className="empty-state"><i className="fas fa-inbox" /><p>Aucun cadeau réclamé</p></div>}
        </div>
      )}

      {/* ─── TRANSACTIONS ─── */}
      {tab === 'transactions' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select value={txTypeFilter} onChange={e => setTxTypeFilter(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
              <option value="all">Tous les types</option>
              <option value="depot">Dépôt</option>
              <option value="retrait">Retrait</option>
              <option value="investissement">Investissement</option>
              <option value="parrainage">Commission parrainage</option>
              <option value="revenu">Revenu investissement</option>
              <option value="bonus">Bonus roue</option>
              <option value="credit_admin">Crédit administrateur</option>
            </select>
            <select value={txStatutFilter} onChange={e => setTxStatutFilter(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
              <option value="all">Tous les statuts</option>
              <option value="valide">Validé</option>
              <option value="en_attente">En attente</option>
              <option value="rejete">Rejeté</option>
              <option value="actif">Actif</option>
            </select>
          </div>
          {transactions
            .filter(t => (txTypeFilter === 'all' || t.kind === txTypeFilter) && (txStatutFilter === 'all' || t.statut === txStatutFilter))
            .map(t => (
              <div key={t.id} className="card" style={{ marginBottom: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</p>
                    {t.user && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.user.nom} • {t.user.telephone}</p>}
                    <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(t.date).toLocaleString('fr-FR')} • {t.id}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: t.sens === '+' ? 'var(--green-primary)' : 'var(--text-primary)' }}>{t.sens}{fmt(t.montant)}</p>
                    <span className={`badge badge-${statusColor[t.statut] || 'yellow'}`}>{t.statut}</span>
                  </div>
                </div>
              </div>
            ))}
          {transactions.length === 0 && <div className="empty-state"><i className="fas fa-inbox" /><p>Aucune transaction</p></div>}
        </div>
      )}

      {/* ─── UTILISATEURS ─── */}
      {tab === 'users' && (
        <div>
          {users.map(u => (
            <div key={u.id} className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700 }}>{u.nom} {u.role === 'admin' && <span className="badge badge-blue" style={{ marginLeft: 6 }}>Admin</span>}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.telephone} • {u.pays}</p>
                  <p style={{ color: 'var(--green-primary)', fontWeight: 600, fontSize: 13 }}>{fmt(u.solde)} FCFA</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(u.date_inscription).toLocaleDateString('fr-FR')}</p>
                </div>
                <button onClick={() => { setCreditModal(u.id); setCreditAmount(''); }} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(27,42,107,0.15)', color: 'var(--green-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                  <i className="fas fa-plus" /> Créditer
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <div className="empty-state"><i className="fas fa-users" /><p>Aucun utilisateur</p></div>}
        </div>
      )}

      {/* ─── POSTS ─── */}
      {tab === 'posts' && (
        <div>
          {posts.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>{p.nom}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{p.message}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{new Date(p.date_creation).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`badge badge-${statusColor[p.statut] || 'yellow'}`}>{p.statut}</span>
              </div>
              {p.statut === 'en_attente' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => validatePost(p.id)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'rgba(27,42,107,0.15)', color: 'var(--green-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    <i className="fas fa-check" /> Valider
                  </button>
                  <button onClick={() => rejectPost(p.id)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    <i className="fas fa-times" /> Rejeter
                  </button>
                </div>
              )}
            </div>
          ))}
          {posts.length === 0 && <div className="empty-state"><i className="fas fa-newspaper" /><p>Aucun post</p></div>}
        </div>
      )}

      {/* ─── PLANS VIP ─── */}
      {tab === 'plans' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}><i className="fas fa-chart-line" style={{ color: 'var(--green-primary)', marginRight: 8 }} />Plans d'investissement ({plans.length})</p>
            <button onClick={() => openPlanModal()} className="btn btn-primary" style={{ padding: '9px 14px', fontSize: 12 }}>
              <i className="fas fa-plus" /> Ajouter
            </button>
          </div>
          {plans.map((plan, idx) => {
            const revJ = (plan.prix * plan.rendement_journalier) / 100;
            const revTotal = revJ * plan.duree_jours;
            const COLORS = ['#1B2A6B', '#000000', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];
            const color = COLORS[idx % COLORS.length];
            return (
              <div key={plan.id} className="card" style={{ marginBottom: 10, padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color }}>{plan.nom}</p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Prix : <strong style={{ color: 'var(--text-primary)' }}>{fmt(plan.prix)} FCFA</strong></p>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Durée : <strong style={{ color: 'var(--text-primary)' }}>{plan.duree_jours}j</strong></p>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Rend. : <strong style={{ color: 'var(--green-primary)' }}>{plan.rendement_journalier}%/j</strong></p>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      +{fmt(revJ)} FCFA/j • Total : {fmt(revTotal)} FCFA
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openPlanModal(plan)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.15)', color: 'var(--blue-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                      <i className="fas fa-edit" />
                    </button>
                    <button onClick={() => deletePlan(plan.id)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {plans.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-chart-line" />
              <p>Aucun plan — exécutez fixes.sql dans Supabase</p>
            </div>
          )}
        </div>
      )}

      {/* ─── AFFICHES (images) ─── */}
      {tab === 'annonces' && (
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            <i className="fas fa-image" style={{ color: '#f59e0b', marginRight: 8 }} />Affiches du dashboard (images)
          </p>

          {/* Zone upload */}
          <div className="card" style={{ marginBottom: 20, padding: 20, border: '2px dashed rgba(27,42,107,0.4)' }}>
            <p style={{ fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14 }}>
              <i className="fas fa-cloud-upload-alt" style={{ color: 'var(--green-primary)', marginRight: 8 }} />
              Ajouter une nouvelle affiche
            </p>

            {/* Zone de clic pour choisir image */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                borderRadius: 14, border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.03)',
                height: imagePreview ? 'auto' : 140, minHeight: 140,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', marginBottom: 14, transition: 'all 0.2s',
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Aperçu" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 14 }} />
              ) : (
                <>
                  <i className="fas fa-image" style={{ fontSize: 40, color: 'var(--text-muted)', marginBottom: 10 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cliquez pour choisir une image</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>JPG, PNG, GIF — max 10 Mo</p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              {imagePreview && (
                <button onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="btn btn-outline" style={{ flex: 1, padding: '12px' }}>
                  <i className="fas fa-times" /> Changer
                </button>
              )}
              <button
                onClick={uploadAnnonce}
                disabled={!imageFile || uploading}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px', opacity: (!imageFile || uploading) ? 0.5 : 1 }}
              >
                {uploading
                  ? <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, marginRight: 8 }} />Publication...</>
                  : <><i className="fas fa-paper-plane" style={{ marginRight: 8 }} />Publier l'affiche</>
                }
              </button>
            </div>
          </div>

          {/* Liste des affiches */}
          {annonces.length > 0 && (
            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
              {annonces.length} affiche{annonces.length > 1 ? 's' : ''} publiée{annonces.length > 1 ? 's' : ''}
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {annonces.map(ann => (
              <div key={ann.id} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-color)', opacity: ann.actif ? 1 : 0.45, position: 'relative' }}>
                {ann.image ? (
                  <img
                    src={`/uploads/${ann.image}`}
                    alt="Affiche"
                    style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ height: 160, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-image" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
                  </div>
                )}
                {/* Badge statut */}
                <div style={{ position: 'absolute', top: 8, left: 8 }}>
                  <span style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700,
                    background: ann.actif ? 'rgba(27,42,107,0.9)' : 'rgba(0,0,0,0.6)',
                    color: '#fff',
                  }}>
                    {ann.actif ? '● EN DIRECT' : '● Masqué'}
                  </span>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, padding: 8, background: 'var(--bg-card)' }}>
                  <button onClick={() => toggleAnnonce(ann)} style={{
                    flex: 1, padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: ann.actif ? 'rgba(239,68,68,0.1)' : 'rgba(27,42,107,0.15)',
                    color: ann.actif ? 'var(--error)' : 'var(--green-primary)',
                  }}>
                    <i className={`fas ${ann.actif ? 'fa-eye-slash' : 'fa-eye'}`} /> {ann.actif ? 'Masquer' : 'Afficher'}
                  </button>
                  <button onClick={() => deleteAnnonce(ann.id)} style={{ padding: '7px 10px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.08)', color: 'var(--error)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {annonces.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-image" />
              <p>Aucune affiche — uploadez votre première image</p>
            </div>
          )}
        </div>
      )}

      {/* ─── PARAMÈTRES ─── */}
      {tab === 'settings' && (
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            <i className="fas fa-cog" style={{ color: 'var(--blue-primary)', marginRight: 8 }} />Paramètres généraux
          </p>

          <div className="card" style={{ padding: 20, marginBottom: 12 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Dépôt minimum</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Montant minimal qu'un utilisateur peut déposer (en FCFA)</p>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label>Montant minimum (FCFA)</label>
              <input type="number" value={settings.min_depot || '500'} onChange={e => setSettings(s => ({ ...s, min_depot: e.target.value }))} placeholder="500" />
            </div>
            <button className="btn btn-primary" onClick={saveSettings} style={{ padding: '12px 24px' }}>
              <i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer
            </button>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 12 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>
              <i className="fas fa-users" style={{ color: 'var(--green-primary)', marginRight: 8 }} />Commissions de parrainage
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Pourcentage versé au parrain sur chaque investissement de ses filleuls. Les nouvelles valeurs s'appliquent immédiatement à tous les achats suivants.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="input-group">
                <label>Niveau 1 (%)</label>
                <input type="number" min="0" step="0.1" value={settings.commission_niveau1 ?? '10'} onChange={e => setSettings(s => ({ ...s, commission_niveau1: e.target.value }))} placeholder="10" />
              </div>
              <div className="input-group">
                <label>Niveau 2 (%)</label>
                <input type="number" min="0" step="0.1" value={settings.commission_niveau2 ?? '5'} onChange={e => setSettings(s => ({ ...s, commission_niveau2: e.target.value }))} placeholder="5" />
              </div>
              <div className="input-group">
                <label>Niveau 3 (%)</label>
                <input type="number" min="0" step="0.1" value={settings.commission_niveau3 ?? '2'} onChange={e => setSettings(s => ({ ...s, commission_niveau3: e.target.value }))} placeholder="2" />
              </div>
            </div>
            <button className="btn btn-primary" onClick={saveCommissions} style={{ padding: '12px 24px' }}>
              <i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer les commissions
            </button>
          </div>

          <div className="card" style={{ padding: 16, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: '#f87171', marginBottom: 8 }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }} />Requis : exécuter fixes.sql dans Supabase
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Si vous avez une erreur de sauvegarde, c'est que les tables <code>settings</code> et <code>annonces</code> n'existent pas encore. Allez dans <strong>Supabase → SQL Editor</strong> et exécutez le contenu du fichier <code>server/fixes.sql</code>.
            </p>
          </div>

          <div className="card" style={{ padding: 16, marginTop: 12 }}>
            <p style={{ fontWeight: 700, marginBottom: 12 }}>Probabilités de la roue</p>
            {[
              { label: '1 000 FCFA', prob: '0%', color: '#ef4444' },
              { label: '500 FCFA', prob: '0,001%', color: '#f59e0b' },
              { label: '200 FCFA', prob: '0,01%', color: '#a855f7' },
              { label: '100 FCFA', prob: '0,01%', color: '#000000' },
              { label: '50 FCFA', prob: '0,01%', color: '#1B2A6B' },
              { label: '0 FCFA', prob: '~99,96%', color: 'var(--text-muted)' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: 13, color: r.color, fontWeight: 600 }}>{r.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.prob}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
