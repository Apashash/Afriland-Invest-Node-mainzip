import React, { useState, useEffect } from 'react';
import Logo from "../components/Logo";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';

const PAYS_METHODES = {
  'Cameroun': ['MTN Mobile Money', 'Orange Money'],
  "Côte d'Ivoire": ['MTN Money', 'Orange Money', 'Moov Money', 'Wave'],
  'Sénégal': ['Orange Money', 'Wave', 'Free Money'],
  'Mali': ['Orange Money', 'Moov Money'],
  'Bénin': ['MTN Money', 'Moov Money'],
  'Burkina Faso': ['Orange Money', 'Moov Money'],
  'Togo': ['T-Money', 'Moov Money'],
};

export default function Wallet() {
  const [form, setForm] = useState({ nom_portefeuille: '', pays: 'Cameroun', methode_paiement: 'MTN Mobile Money', numero_telephone: '' });
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const res = await api.get('/user/wallet');
      setWallets(res.data.wallets);
      if (res.data.wallets.length > 0) {
        const w = res.data.wallets[0];
        setForm({ nom_portefeuille: w.nom_portefeuille, pays: w.pays, methode_paiement: w.methode_paiement, numero_telephone: w.numero_telephone });
      }
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom_portefeuille || !form.numero_telephone) return toast.error('Remplissez tous les champs');
    setSubmitting(true);
    try {
      await api.post('/user/wallet', form);
      toast.success('Portefeuille enregistré');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setSubmitting(false); }
  };

  const methodes = PAYS_METHODES[form.pays] || [];

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/account')}><i className="fas fa-arrow-left" /></button>
        <span className="page-title">Mon portefeuille</span>
        <Logo size="sm" style={{ marginLeft: "auto" }} />
      </div>

      <div style={{ padding: '0 16px' }}>
        {wallets.length > 0 && (
          <div className="card" style={{ background: 'linear-gradient(135deg,rgba(27,42,107,0.15),rgba(0,0,0,0.15))', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#1B2A6B,#000000)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-wallet" style={{ color: '#fff' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700 }}>{wallets[0].nom_portefeuille}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{wallets[0].methode_paiement}</p>
              </div>
            </div>
            <div style={{ paddingTop: 10, borderTop: '1px solid rgba(27,42,107,0.2)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Numéro de retrait</p>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--green-primary)' }}>{wallets[0].numero_telephone}</p>
            </div>
          </div>
        )}

        <div className="card">
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            <i className="fas fa-edit" style={{ marginRight: 8, color: 'var(--green-primary)' }} />
            {wallets.length > 0 ? 'Modifier le portefeuille' : 'Ajouter un portefeuille'}
          </p>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Nom du portefeuille</label>
              <input type="text" placeholder="Ex: Mon compte MTN" value={form.nom_portefeuille}
                onChange={e => setForm({ ...form, nom_portefeuille: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Pays</label>
              <select value={form.pays} onChange={e => {
                const newPays = e.target.value;
                const newMethodes = PAYS_METHODES[newPays] || [];
                setForm({ ...form, pays: newPays, methode_paiement: newMethodes[0] || '' });
              }}>
                {Object.keys(PAYS_METHODES).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Méthode de paiement</label>
              <select value={form.methode_paiement} onChange={e => setForm({ ...form, methode_paiement: e.target.value })}>
                {methodes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Numéro de téléphone</label>
              <input type="tel" placeholder="+237600000000" value={form.numero_telephone}
                onChange={e => setForm({ ...form, numero_telephone: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
                <><i className="fas fa-save" /> Enregistrer</>
              )}
            </button>
          </form>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
