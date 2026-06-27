import React, { createContext, useContext, useState } from 'react';

const LANG_KEY = 'app_lang';

const translations = {
  fr: {
    /* ── Login / Register ── */
    invest_tagline: 'Investissez & Gagnez',
    invest_sub: "Faites fructifier votre argent dès aujourd'hui",
    login_tab: 'Connexion',
    register_tab: 'Inscription',
    phone_placeholder: 'Numéro de téléphone',
    password_placeholder: 'Mot de passe',
    login_btn: 'Connexion',
    name_placeholder: 'Nom complet',
    referral_placeholder: 'Code de parrainage (optionnel)',
    register_btn: 'Créer mon compte',
    fill_all: 'Remplissez tous les champs',
    password_min: 'Mot de passe : 6 caractères minimum',
    login_error: 'Identifiants incorrects',
    register_error: "Erreur d'inscription",

    /* ── Dashboard ── */
    invest_grow: 'Investissez & Gagnez',
    total_balance: 'Solde total',
    recharge: 'Recharger',
    withdraw: 'Retirer',
    revenues: 'Revenus',
    referrals: 'Filleuls',
    share_earn: 'Partager & Gagner',
    invite_now: 'Inviter maintenant',
    service: 'Service',
    lottery: 'Loterie',
    bonus: 'Bonus',
    details: 'Détails',
    best_sellers: 'Meilleures ventes',
    see_all: 'Voir tous les produits',
    active_plans: 'Plans en cours',
    end_date: 'Fin',
    notifications: 'Notifications',
    operations: 'opération(s)',
    no_notif: 'Aucune notification',
    no_notif_sub: 'Vos dépôts, retraits et revenus apparaîtront ici',
    loading_error: 'Erreur de chargement',

    /* ── BottomNav ── */
    nav_home: 'Accueil',
    nav_products: 'Produits',
    nav_orders: 'Commandes',
    nav_team: 'Équipe',
    nav_account: 'Mon compte',

    /* ── Transactions ── */
    transactions: 'Transactions',
    entries: 'Entrées',
    exits: 'Sorties',
    total: 'Total',
    all_types: 'Tous les types',
    all_statuts: 'Tous les statuts',
    no_transaction: 'Aucune transaction',
    no_transaction_sub: 'Vos opérations apparaîtront ici',
    receipt: 'Reçu de transaction',
    close: 'Fermer',
    reference: 'Référence',
    ref_copied: 'Référence copiée !',
    copy: 'Copier',

    /* ── Types transaction ── */
    depot: 'Dépôt',
    retrait: 'Retrait',
    investissement: 'Investissement',
    parrainage: 'Commission parrainage',
    revenu: 'Revenu investissement',
    bonus_roue: 'Bonus roue',
    credit_admin: 'Crédit administrateur',
    cadeau_vip: 'Cadeau VIP',

    /* ── Statuts ── */
    valide: 'Validé',
    en_attente: 'En attente',
    rejete: 'Rejeté',
    actif: 'Actif',
    termine: 'Terminé',
    annule: 'Annulé',
    refuse: 'Refusé',

    /* ── Deposit ── */
    deposit_title: 'Recharger',
    deposit_amount: 'Montant (FCFA)',
    deposit_country: 'Pays',
    deposit_operator: 'Opérateur',
    deposit_payer_num: 'Numéro payeur',
    deposit_submit: 'Envoyer la demande',

    /* ── Withdrawal ── */
    withdrawal_title: 'Retrait',
    withdrawal_amount: 'Montant (FCFA)',
    withdrawal_txpass: 'Mot de passe de transaction',
    withdrawal_submit: 'Envoyer la demande',
    my_wallet: 'Mon portefeuille',
    wallet_sub: 'Compte de réception du retrait',
    modify: 'Modifier',

    /* ── Account ── */
    account_title: 'Mon compte',
    logout: 'Déconnexion',
    change_pass: 'Changer mot de passe',
    tx_password: 'Mot de passe de transaction',
    language_label: 'Langue',

    /* ── Misc ── */
    days_left: 'jours restants',
    profit_day: 'Profit/jour',
    profit_total: 'Profit total',
    invest_btn: 'Investir',
    active_badge: 'Actif',
  },

  en: {
    /* ── Login / Register ── */
    invest_tagline: 'Invest & Earn',
    invest_sub: 'Grow your money starting today',
    login_tab: 'Login',
    register_tab: 'Sign Up',
    phone_placeholder: 'Phone number',
    password_placeholder: 'Password',
    login_btn: 'Login',
    name_placeholder: 'Full name',
    referral_placeholder: 'Referral code (optional)',
    register_btn: 'Create my account',
    fill_all: 'Please fill in all fields',
    password_min: 'Password: minimum 6 characters',
    login_error: 'Invalid credentials',
    register_error: 'Registration error',

    /* ── Dashboard ── */
    invest_grow: 'Invest & Earn',
    total_balance: 'Total balance',
    recharge: 'Deposit',
    withdraw: 'Withdraw',
    revenues: 'Revenue',
    referrals: 'Referrals',
    share_earn: 'Share & Earn',
    invite_now: 'Invite now',
    service: 'Support',
    lottery: 'Lottery',
    bonus: 'Bonus',
    details: 'Details',
    best_sellers: 'Best sellers',
    see_all: 'See all products',
    active_plans: 'Active plans',
    end_date: 'End',
    notifications: 'Notifications',
    operations: 'operation(s)',
    no_notif: 'No notifications',
    no_notif_sub: 'Your deposits, withdrawals and earnings will appear here',
    loading_error: 'Loading error',

    /* ── BottomNav ── */
    nav_home: 'Home',
    nav_products: 'Products',
    nav_orders: 'Orders',
    nav_team: 'Team',
    nav_account: 'Account',

    /* ── Transactions ── */
    transactions: 'Transactions',
    entries: 'Income',
    exits: 'Expenses',
    total: 'Total',
    all_types: 'All types',
    all_statuts: 'All statuses',
    no_transaction: 'No transactions',
    no_transaction_sub: 'Your operations will appear here',
    receipt: 'Transaction receipt',
    close: 'Close',
    reference: 'Reference',
    ref_copied: 'Reference copied!',
    copy: 'Copy',

    /* ── Types transaction ── */
    depot: 'Deposit',
    retrait: 'Withdrawal',
    investissement: 'Investment',
    parrainage: 'Referral commission',
    revenu: 'Investment revenue',
    bonus_roue: 'Wheel bonus',
    credit_admin: 'Admin credit',
    cadeau_vip: 'VIP gift',

    /* ── Statuts ── */
    valide: 'Validated',
    en_attente: 'Pending',
    rejete: 'Rejected',
    actif: 'Active',
    termine: 'Completed',
    annule: 'Cancelled',
    refuse: 'Refused',

    /* ── Deposit ── */
    deposit_title: 'Deposit',
    deposit_amount: 'Amount (FCFA)',
    deposit_country: 'Country',
    deposit_operator: 'Operator',
    deposit_payer_num: 'Payer number',
    deposit_submit: 'Submit request',

    /* ── Withdrawal ── */
    withdrawal_title: 'Withdrawal',
    withdrawal_amount: 'Amount (FCFA)',
    withdrawal_txpass: 'Transaction password',
    withdrawal_submit: 'Submit request',
    my_wallet: 'My wallet',
    wallet_sub: 'Withdrawal receiving account',
    modify: 'Edit',

    /* ── Account ── */
    account_title: 'My account',
    logout: 'Log out',
    change_pass: 'Change password',
    tx_password: 'Transaction password',
    language_label: 'Language',

    /* ── Misc ── */
    days_left: 'days left',
    profit_day: 'Profit/day',
    profit_total: 'Total profit',
    invest_btn: 'Invest',
    active_badge: 'Active',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(LANG_KEY) || 'fr');

  const setLang = (l) => {
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  };

  const t = (key) => translations[lang]?.[key] ?? translations['fr']?.[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

/* ── Petit composant bouton de langue réutilisable ── */
export function LangToggle({ style = {} }) {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
      title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
      style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
        color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
        ...style,
      }}
    >
      {lang === 'fr' ? 'EN' : 'FR'}
    </button>
  );
}
