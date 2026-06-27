import React, { useState, useEffect } from 'react';
import Logo from "../components/Logo";
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import api from '../lib/api';

const FAQS = [
  {
    q: 'Comment déposer de l\'argent ?',
    a: 'Allez dans la section Dépôt, choisissez votre pays et opérateur, envoyez le montant sur notre numéro, puis remplissez le formulaire avec votre numéro payeur. Votre dépôt sera validé sous 24h.',
  },
  {
    q: 'Comment retirer mes gains ?',
    a: 'Configurez d\'abord votre portefeuille dans Compte > Portefeuille. Ensuite, allez dans Retrait et remplissez votre demande. Les retraits sont traités du lundi au samedi de 9h à 19h GMT.',
  },
  {
    q: 'Qu\'est-ce que le programme de parrainage ?',
    a: 'En partageant votre lien de parrainage, vous gagnez des commissions sur les investissements de vos filleuls sur 3 niveaux : 10% (niveau 1), 5% (niveau 2) et 2% (niveau 3).',
  },
  {
    q: 'Comment fonctionnent les plans VIP ?',
    a: 'Achetez un plan VIP avec votre solde. Chaque jour, vous recevez un rendement entre 10.5% et 19.5% du montant investi pendant la durée du plan (125 jours).',
  },
  {
    q: 'Comment fonctionnent les cadeaux VIP ?',
    a: 'En parrainant des personnes qui investissent, vous débloquez des cadeaux uniques : VIP 1 = 70 filleuls ayant investi → cadeau de 5000 FCFA, VIP 2 = 100 filleuls → 8000 FCFA, VIP 3 = 200 filleuls → 10000 FCFA. Cliquez sur « Réclamer un cadeau » ; l\'administrateur confirme avant que le montant soit crédité sur votre solde. Seuls les filleuls ayant effectué un investissement sont comptabilisés.',
  },
  {
    q: 'Comment fonctionne la roue de la fortune ?',
    a: 'Disponible toutes les 48h, la roue vous donne une chance de gagner entre 0 et 1000 FCFA ajoutés directement à votre solde.',
  },
  {
    q: 'Quel est le dépôt minimum ?',
    a: 'Le dépôt minimum est de 500 FCFA.',
  },
  {
    q: 'Quel est le retrait minimum ?',
    a: 'Le retrait minimum est de 2000 FCFA. Vous devez avoir un plan d\'investissement actif pour effectuer un retrait.',
  },
  {
    q: 'Quels pays sont éligibles ?',
    a: 'Cameroun, Côte d\'Ivoire, Sénégal, Mali, Bénin, Burkina Faso et Togo. Les opérateurs Mobile Money (MTN, Orange, Wave, Moov) sont acceptés.',
  },
  {
    q: 'Comment configurer mon mot de passe de transaction ?',
    a: 'Allez dans Compte, puis trouvez la section "Mot de passe de transaction". Entrez un code à 4 chiffres. Ce code est requis pour les retraits et les achats de plans.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(null);
  const [lienTelegram, setLienTelegram] = useState('https://t.me/gifetalpro');
  const [lienWhatsappGroupe, setLienWhatsappGroupe] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/settings/public').then(res => {
      if (res.data.lien_telegram) setLienTelegram(res.data.lien_telegram);
      if (res.data.lien_whatsapp_groupe) setLienWhatsappGroupe(res.data.lien_whatsapp_groupe);
    }).catch(() => {});
  }, []);

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}><i className="fas fa-arrow-left" /></button>
        <span className="page-title">Questions fréquentes</span>
        <Logo size="sm" style={{ marginLeft: "auto" }} />
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(27,42,107,0.1),rgba(0,0,0,0.1))', border: '1px solid var(--border-color)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>
            <i className="fas fa-question-circle" style={{ color: 'var(--green-primary)', marginRight: 8 }} />
            Besoin d'aide ?
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Consultez nos réponses ci-dessous ou contactez notre support.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <a href={lienTelegram} target="_blank" rel="noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              background: 'rgba(34,158,217,0.15)', border: '1px solid rgba(34,158,217,0.3)',
              borderRadius: 8, color: '#229ED9', fontWeight: 600, fontSize: 13, textDecoration: 'none',
            }}>
              <i className="fab fa-telegram" /> Telegram
            </a>
            {lienWhatsappGroupe && (
              <a href={lienWhatsappGroupe} target="_blank" rel="noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)',
                borderRadius: 8, color: '#25D366', fontWeight: 600, fontSize: 13, textDecoration: 'none',
              }}>
                <i className="fab fa-whatsapp" /> WhatsApp
              </a>
            )}
          </div>
        </div>

        {FAQS.map((faq, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 14, marginBottom: 10, overflow: 'hidden',
          }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', padding: '16px', background: 'none', border: 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                color: 'var(--text-primary)', cursor: 'pointer', gap: 12,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, textAlign: 'left', flex: 1 }}>{faq.q}</span>
              <i className={`fas fa-chevron-${open === i ? 'up' : 'down'}`} style={{ color: 'var(--green-primary)', flexShrink: 0 }} />
            </button>
            {open === i && (
              <div style={{ padding: '0 16px 16px', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, borderTop: '1px solid var(--border-color)' }}>
                <p style={{ paddingTop: 12 }}>{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
