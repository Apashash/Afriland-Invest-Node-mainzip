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

    /* ── Deposit extra ── */
    deposit_center: 'Centre de Recharge',
    new_deposit: 'Nouveau dépôt',
    history: 'Historique',
    my_balance: 'Mon solde',
    select_amount: 'Sélectionnez ou entrez le montant',
    other_amount: 'Autre montant (FCFA)',
    payer_number: 'Votre numéro payeur',
    continue_btn: 'Continuer',
    validated_24h: 'Validé sous 24h ouvrables',
    no_deposit: "Aucun dépôt pour l'instant",
    copied: 'Copié !',
    minimum: 'Minimum',

    /* ── Withdrawal extra ── */
    available_balance: 'Votre solde disponible',
    new_withdrawal: 'Nouveau retrait',
    withdrawal_conditions: 'Conditions de retrait',
    withdrawal_suspended: 'Retraits suspendus',
    withdrawal_suspended_msg: 'Les retraits sont temporairement indisponibles. Veuillez réessayer plus tard.',
    withdrawal_request: 'Demande de retrait',
    no_withdrawal: 'Aucun retrait',
    withdrawal_requests_here: 'Vos demandes de retrait apparaîtront ici',
    send_request: 'Envoyer la demande',
    one_withdrawal_24h: 'Un seul retrait toutes les 24h',
    max_withdrawals_24h: 'Maximum {n} retraits par 24h',
    active_plan_required: "Plan d'investissement actif requis",
    wallet_required: 'Portefeuille configuré obligatoire',
    day_names: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],

    /* ── Account ── */
    account_title: 'Mon compte',
    logout: 'Déconnexion',
    sign_out: 'Se déconnecter',
    change_pass: 'Changer mot de passe',
    tx_password: 'Mot de passe de transaction',
    tx_password_menu: 'Mot de passe transaction',
    language_label: 'Langue',
    total_deposits: 'Dépôts totaux',
    total_withdrawals: 'Retraits totaux',
    services: 'Services',
    my_investments: 'Mes investissements',
    my_team: 'Mon équipe',
    vip_salary: 'Salaire VIP',
    fortune_wheel: 'Roue de la fortune',
    faq_help: 'FAQ / Aide',
    admin_panel: "Panneau d'administration",
    administrator: 'Administrateur',
    create_tx_password: 'Créer votre mot de passe de transaction',
    modify_password: 'Modifier votre mot de passe',
    pin_label: 'Mot de passe (4 chiffres)',
    old_password: 'Ancien mot de passe',
    new_password: 'Nouveau mot de passe',
    confirm_password: 'Confirmer le nouveau mot de passe',
    save: 'Enregistrer',
    cancel: 'Annuler',
    modify_btn: 'Modifier',
    pass_created: 'Mot de passe créé avec succès',
    pass_modified: 'Mot de passe modifié avec succès',

    /* ── Investment ── */
    all_products: 'Tous les produits',
    activate: 'Activer',
    price: 'Prix',
    gain_per_day: 'Gain / jour',
    duration: 'Durée',
    duration_days: 'jours',
    total_gain: 'Gain total',
    tx_password_required: 'Mot de passe requis',
    tx_password_required_msg: "Vous devez d'abord configurer votre mot de passe de transaction avant de pouvoir investir.",
    configure_now: 'Configurer maintenant',
    confirm_investment: "Confirmer l'investissement",
    tx_pass_4digits: 'Mot de passe de transaction (4 chiffres)',

    /* ── MyOrders ── */
    orders: 'Commandes',
    active_investments: 'investissement(s) actif(s)',
    no_orders: 'Aucune commande',
    invest_to_start: 'Investissez dans un plan VIP pour commencer',
    see_plans: 'Voir les plans',
    invested_amount: 'Montant investi',
    gain_day: 'Gain / jour',
    start: 'Début',
    progress: 'Progression',
    days_remaining: 'jours restants',
    series: 'Série',

    /* ── Referral ── */
    team: 'Équipe',
    invitation_link: "Lien d'invitation",
    total_people: 'Nombre de personnes',
    total_commission: 'Total commission',
    team_level: 'Équipe niveau',
    members: 'membre(s)',
    no_member_level: 'Aucun membre à ce niveau',
    level_short: 'Nv',
    level: 'Niveau',

    /* ── Wallet ── */
    wallet_title: 'Mon portefeuille',
    withdrawal_account: 'Compte de retrait',
    no_wallet: 'Aucun portefeuille',
    add_withdrawal_account: 'Ajoutez votre compte de retrait ci-dessous',
    edit_wallet: 'Modifier le portefeuille',
    add_wallet: 'Ajouter un portefeuille',
    wallet_name: 'Nom du portefeuille',
    country: 'Pays',
    payment_method: 'Méthode de paiement',
    phone_number: 'Numéro de téléphone',
    withdrawal_number: 'Numéro de retrait',
    wallet_saved: 'Portefeuille enregistré',

    /* ── Salary ── */
    vip_gifts: 'Cadeaux VIP',
    invested_referrals: 'Filleuls ayant investi',
    current_level: 'Niveau actuel',
    more_needed: 'Encore {n} filleul(s) investisseur(s) pour atteindre le VIP {lvl}',
    vip_levels_gifts: 'Niveaux VIP & cadeaux',
    gift_received: 'Cadeau reçu',
    pending_confirmation: 'En attente de confirmation',
    claim_gift: 'Réclamer un cadeau',
    claim_again: 'Réclamer un cadeau (à nouveau)',
    still_needed: 'Encore {n} filleul(s) investisseur(s)',
    fcfa_gift: 'FCFA cadeau',
    how_it_works: 'Comment ça marche ?',
    salary_step1: 'Parrainez des personnes avec votre lien de parrainage',
    salary_step2: 'Seuls les filleuls qui effectuent un investissement sont comptabilisés',
    salary_step3: 'Atteignez un palier, puis cliquez sur « Réclamer un cadeau »',
    salary_step4: "L'administrateur confirme, puis le cadeau est crédité sur votre solde",
    referral_program: 'Mon programme de parrainage',
    invested_required: 'filleuls ayant investi',

    /* ── FAQ ── */
    help_center: "Centre d'aide",
    frequent_questions: 'Questions fréquentes',
    need_help: "Besoin d'aide ?",
    contact_support_msg: 'Contactez notre support directement',
    no_answer_found: "Vous n'avez pas trouvé votre réponse ?",
    team_available: 'Notre équipe est disponible pour vous aider.',
    contact_support: 'Contacter le support',
    faq_items: [
      { q: "Comment déposer de l'argent ?", a: "Allez dans la section Dépôt, choisissez votre pays et opérateur, envoyez le montant sur notre numéro, puis remplissez le formulaire avec votre numéro payeur. Votre dépôt sera validé sous 24h.", icon: 'fa-arrow-down', color: '#FF9500' },
      { q: "Comment retirer mes gains ?", a: "Configurez d'abord votre portefeuille dans Compte > Portefeuille. Ensuite, allez dans Retrait et remplissez votre demande.", icon: 'fa-arrow-up', color: '#007AFF' },
      { q: "Qu'est-ce que le programme de parrainage ?", a: "En partageant votre lien de parrainage, vous gagnez des commissions sur les investissements de vos filleuls sur 3 niveaux : 10% (niveau 1), 5% (niveau 2) et 2% (niveau 3).", icon: 'fa-users', color: '#34C759' },
      { q: "Comment fonctionnent les plans VIP ?", a: "Achetez un plan VIP avec votre solde. Chaque jour, vous recevez un rendement entre 10.5% et 19.5% du montant investi pendant la durée du plan.", icon: 'fa-star', color: '#FF9500' },
      { q: "Comment fonctionnent les cadeaux VIP ?", a: "En parrainant des personnes qui investissent, vous débloquez des cadeaux uniques. Cliquez sur « Réclamer un cadeau » ; l'administrateur confirme avant que le montant soit crédité.", icon: 'fa-gift', color: '#FF3B30' },
      { q: "Comment fonctionne la roue de la fortune ?", a: "Disponible toutes les 48h, la roue vous donne une chance de gagner entre 0 et 1000 FCFA ajoutés directement à votre solde.", icon: 'fa-dharmachakra', color: '#5856D6' },
      { q: "Quel est le dépôt minimum ?", a: "Le dépôt minimum est de 500 FCFA.", icon: 'fa-coins', color: '#FF9500' },
      { q: "Quel est le retrait minimum ?", a: "Le retrait minimum est de 2000 FCFA. Vous devez avoir un plan d'investissement actif pour effectuer un retrait.", icon: 'fa-wallet', color: '#34C759' },
      { q: "Quels pays sont éligibles ?", a: "Cameroun, Côte d'Ivoire, Sénégal, Mali, Bénin, Burkina Faso et Togo.", icon: 'fa-globe-africa', color: '#007AFF' },
      { q: "Comment configurer mon mot de passe de transaction ?", a: "Allez dans Compte, puis trouvez la section \"Mot de passe de transaction\". Entrez un code à 4 chiffres.", icon: 'fa-lock', color: '#FF3B30' },
    ],

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

    /* ── Deposit extra ── */
    deposit_center: 'Deposit Center',
    new_deposit: 'New deposit',
    history: 'History',
    my_balance: 'My balance',
    select_amount: 'Select or enter amount',
    other_amount: 'Other amount (FCFA)',
    payer_number: 'Your payer number',
    continue_btn: 'Continue',
    validated_24h: 'Validated within 24 business hours',
    no_deposit: 'No deposits yet',
    copied: 'Copied!',
    minimum: 'Minimum',

    /* ── Withdrawal extra ── */
    available_balance: 'Your available balance',
    new_withdrawal: 'New withdrawal',
    withdrawal_conditions: 'Withdrawal conditions',
    withdrawal_suspended: 'Withdrawals suspended',
    withdrawal_suspended_msg: 'Withdrawals are temporarily unavailable. Please try again later.',
    withdrawal_request: 'Withdrawal request',
    no_withdrawal: 'No withdrawals',
    withdrawal_requests_here: 'Your withdrawal requests will appear here',
    send_request: 'Send request',
    one_withdrawal_24h: 'One withdrawal per 24h',
    max_withdrawals_24h: 'Maximum {n} withdrawals per 24h',
    active_plan_required: 'Active investment plan required',
    wallet_required: 'Configured wallet mandatory',
    day_names: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

    /* ── Account ── */
    account_title: 'My account',
    logout: 'Log out',
    sign_out: 'Log out',
    change_pass: 'Change password',
    tx_password: 'Transaction password',
    tx_password_menu: 'Transaction password',
    language_label: 'Language',
    total_deposits: 'Total deposits',
    total_withdrawals: 'Total withdrawals',
    services: 'Services',
    my_investments: 'My investments',
    my_team: 'My team',
    vip_salary: 'VIP salary',
    fortune_wheel: 'Fortune wheel',
    faq_help: 'FAQ / Help',
    admin_panel: 'Admin panel',
    administrator: 'Administrator',
    create_tx_password: 'Create your transaction password',
    modify_password: 'Change your password',
    pin_label: 'Password (4 digits)',
    old_password: 'Old password',
    new_password: 'New password',
    confirm_password: 'Confirm new password',
    save: 'Save',
    cancel: 'Cancel',
    modify_btn: 'Update',
    pass_created: 'Password created successfully',
    pass_modified: 'Password updated successfully',

    /* ── Investment ── */
    all_products: 'All products',
    activate: 'Activate',
    price: 'Price',
    gain_per_day: 'Gain / day',
    duration: 'Duration',
    duration_days: 'days',
    total_gain: 'Total gain',
    tx_password_required: 'Password required',
    tx_password_required_msg: 'You must first set up your transaction password before investing.',
    configure_now: 'Configure now',
    confirm_investment: 'Confirm investment',
    tx_pass_4digits: 'Transaction password (4 digits)',

    /* ── MyOrders ── */
    orders: 'Orders',
    active_investments: 'active investment(s)',
    no_orders: 'No orders',
    invest_to_start: 'Invest in a VIP plan to get started',
    see_plans: 'See plans',
    invested_amount: 'Invested amount',
    gain_day: 'Gain / day',
    start: 'Start',
    progress: 'Progress',
    days_remaining: 'days remaining',
    series: 'Series',

    /* ── Referral ── */
    team: 'Team',
    invitation_link: 'Invitation link',
    total_people: 'Total people',
    total_commission: 'Total commission',
    team_level: 'Team level',
    members: 'member(s)',
    no_member_level: 'No members at this level',
    level_short: 'Lv',
    level: 'Level',

    /* ── Wallet ── */
    wallet_title: 'My wallet',
    withdrawal_account: 'Withdrawal account',
    no_wallet: 'No wallet',
    add_withdrawal_account: 'Add your withdrawal account below',
    edit_wallet: 'Edit wallet',
    add_wallet: 'Add wallet',
    wallet_name: 'Wallet name',
    country: 'Country',
    payment_method: 'Payment method',
    phone_number: 'Phone number',
    withdrawal_number: 'Withdrawal number',
    wallet_saved: 'Wallet saved',

    /* ── Salary ── */
    vip_gifts: 'VIP Gifts',
    invested_referrals: 'Referrals who invested',
    current_level: 'Current level',
    more_needed: 'Still {n} investing referral(s) needed to reach VIP {lvl}',
    vip_levels_gifts: 'VIP levels & gifts',
    gift_received: 'Gift received',
    pending_confirmation: 'Pending confirmation',
    claim_gift: 'Claim gift',
    claim_again: 'Claim gift (again)',
    still_needed: 'Still {n} investing referral(s) needed',
    fcfa_gift: 'FCFA gift',
    how_it_works: 'How it works?',
    salary_step1: 'Refer people with your referral link',
    salary_step2: 'Only referrals who make an investment are counted',
    salary_step3: 'Reach a milestone, then click "Claim gift"',
    salary_step4: 'The admin confirms, then the gift is credited to your balance',
    referral_program: 'My referral program',
    invested_required: 'investing referrals',

    /* ── FAQ ── */
    help_center: 'Help center',
    frequent_questions: 'Frequently asked questions',
    need_help: 'Need help?',
    contact_support_msg: 'Contact our support directly',
    no_answer_found: "Didn't find your answer?",
    team_available: 'Our team is available to help you.',
    contact_support: 'Contact support',
    faq_items: [
      { q: 'How do I deposit money?', a: 'Go to the Deposit section, choose your country and operator, send the amount to our number, then fill in the form with your payer number. Your deposit will be validated within 24h.', icon: 'fa-arrow-down', color: '#FF9500' },
      { q: 'How do I withdraw my earnings?', a: 'First set up your wallet in Account > Wallet. Then go to Withdrawal and submit your request.', icon: 'fa-arrow-up', color: '#007AFF' },
      { q: 'What is the referral program?', a: "By sharing your referral link, you earn commissions on your referrals' investments over 3 levels: 10% (level 1), 5% (level 2), and 2% (level 3).", icon: 'fa-users', color: '#34C759' },
      { q: 'How do VIP plans work?', a: 'Buy a VIP plan with your balance. Each day, you receive a return between 10.5% and 19.5% of the invested amount.', icon: 'fa-star', color: '#FF9500' },
      { q: 'How do VIP gifts work?', a: 'By referring people who invest, you unlock unique gifts. Click "Claim gift"; the admin confirms before the amount is credited to your balance.', icon: 'fa-gift', color: '#FF3B30' },
      { q: 'How does the fortune wheel work?', a: 'Available every 48h, the wheel gives you a chance to win between 0 and 1000 FCFA added directly to your balance.', icon: 'fa-dharmachakra', color: '#5856D6' },
      { q: 'What is the minimum deposit?', a: 'The minimum deposit is 500 FCFA.', icon: 'fa-coins', color: '#FF9500' },
      { q: 'What is the minimum withdrawal?', a: 'The minimum withdrawal is 2000 FCFA. You must have an active investment plan to make a withdrawal.', icon: 'fa-wallet', color: '#34C759' },
      { q: 'Which countries are eligible?', a: 'Cameroon, Ivory Coast, Senegal, Mali, Benin, Burkina Faso and Togo.', icon: 'fa-globe-africa', color: '#007AFF' },
      { q: 'How do I set up my transaction password?', a: 'Go to Account, then find the "Transaction password" section. Enter a 4-digit code.', icon: 'fa-lock', color: '#FF3B30' },
    ],

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
