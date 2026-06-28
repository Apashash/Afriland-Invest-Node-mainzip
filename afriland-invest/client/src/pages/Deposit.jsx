import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';
import { useLanguage, LangToggle } from '../contexts/LanguageContext.jsx';

const MONTANTS_RAPIDES = [1000, 3000, 8000, 15000, 30000, 60000, 80000, 120000, 160000];

const OPERATOR_ICONS = {
  'MTN Mobile Money': '🟡',
  'Orange Money': '🟠',
  'Moov Money': '🔵',
  'Wave': '🌊',
  'Flooz (Moov)': '🔵',
  'T-Money': '🟢',
};

export default function Deposit() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [operators, setOperators] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solde, setSolde] = useState(0);
  const [minDepot, setMinDepot] = useState(500);
  const [tab, setTab] = useState('form');

  const [form, setForm] = useState({ montant: '', pays: '', operateur: '', numero_payeur: '' });
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState('form');
  const [paymentData, setPaymentData] = useState(null);
  const [otp, setOtp] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => () => clearInterval(pollRef.current), []);

  const loadData = async () => {
    try {
      const [opRes, histRes, userRes, settingsRes] = await Promise.all([
        api.get('/deposit/operators'),
        api.get('/deposit/list'),
        api.get('/user/profile'),
        api.get('/settings/public'),
      ]);
      const ops = opRes.data.pays_operateurs;
      setOperators(ops);
      setHistory(histRes.data.depots);
      setSolde(userRes.data.solde || 0);
      setMinDepot(parseFloat(settingsRes.data.min_depot || 500));
      const firstPays = Object.keys(ops)[0];
      if (firstPays) {
        const firstOps = Array.isArray(ops[firstPays]?.operators)
          ? ops[firstPays].operators
          : Object.values(ops[firstPays]?.operators || {});
        setForm(f => ({ ...f, pays: firstPays, operateur: firstOps[0] || '' }));
      }
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const getOpsArray = (paysOps) => {
    if (!paysOps) return [];
    if (Array.isArray(paysOps)) return paysOps;
    if (typeof paysOps === 'object') return Object.values(paysOps);
    return [];
  };

  const handlePaysChange = (e) => {
    const pays = e.target.value;
    const ops = getOpsArray(operators[pays]?.operators);
    setForm({ ...form, pays, operateur: ops[0] || '' });
  };

  const startPolling = (transactionId) => {
    setPolling(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 40) {
        clearInterval(pollRef.current);
        setPolling(false);
        return;
      }
      try {
        const res = await api.get(`/deposit/status/${transactionId}`);
        const st = res.data.status;
        if (st === 'success') {
          clearInterval(pollRef.current);
          setPolling(false);
          setStep('success');
          loadData();
        } else if (st === 'failed') {
          clearInterval(pollRef.current);
          setPolling(false);
          setStep('failed');
        }
      } catch {}
    }, 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.montant || !form.pays || !form.operateur) return toast.error('Remplissez tous les champs');
    if (!form.numero_payeur && form.operateur !== 'Wave') return toast.error('Numéro de téléphone requis');
    if (parseFloat(form.montant) < minDepot) return toast.error(`Minimum: ${fmt(minDepot)} FCFA`);
    setSubmitting(true);
    try {
      const res = await api.post('/deposit/initiate', form);
      const data = res.data;
      setPaymentData(data);

      if (data.type === 'wave') {
        setStep('wave');
        startPolling(data.transaction_id);
      } else if (data.type === 'ussd_push') {
        setStep('ussd_push');
        startPolling(data.transaction_id);
      } else if (data.type === 'otp_sms' || data.type === 'otp_ussd') {
        setStep('otp');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du paiement');
    } finally { setSubmitting(false); }
  };

  const handleOtpSubmit = async () => {
    if (!otp || otp.length < 4) return toast.error('Entrez votre code OTP');
    setOtpSubmitting(true);
    try {
      const res = await api.post('/deposit/otp', {
        depot_id: paymentData.depot_id,
        otp,
        reference: paymentData.reference,
      });
      setPaymentData(prev => ({ ...prev, transaction_id: res.data.transaction_id }));
      setStep('ussd_push');
      startPolling(res.data.transaction_id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'OTP invalide');
    } finally { setOtpSubmitting(false); }
  };

  const resetForm = () => {
    setStep('form');
    setPaymentData(null);
    setOtp('');
    clearInterval(pollRef.current);
    setPolling(false);
    loadData();
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
  const rawOps = operators[form.pays]?.operators;
  const currentOps = Array.isArray(rawOps)
    ? rawOps
    : rawOps && typeof rawOps === 'object'
      ? Object.values(rawOps)
      : [];
  const statusColor = { valide: 'green', en_attente: 'yellow', rejete: 'red' };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F5F1E8' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div className="container" style={{ background: '#F5F1E8', paddingBottom: 80 }}>

      <div style={{
        background: 'linear-gradient(135deg, #FF9500, #FFB347)',
        padding: '50px 16px 24px',
        position: 'relative',
      }}>
        <button onClick={() => step !== 'form' ? resetForm() : navigate('/')} style={{
          position: 'absolute', top: 14, left: 16,
          width: 34, height: 34, borderRadius: 10,
          background: 'rgba(255,255,255,0.25)', border: 'none',
          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="fas fa-arrow-left" />
        </button>
        <LangToggle style={{ position: 'absolute', top: 14, right: 16 }} />
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, textAlign: 'center' }}>
          {t('deposit_center')}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 13, marginTop: 4 }}>
          Paiement Mobile Money instantané
        </p>
      </div>

      {step === 'form' && (
        <>
          <div style={{ margin: '16px 16px 0', display: 'flex', background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {[{ key: 'form', label: t('new_deposit') }, { key: 'history', label: t('history') }].map(tabItem => (
              <button key={tabItem.key} onClick={() => setTab(tabItem.key)} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: tab === tabItem.key ? '#FF9500' : 'transparent',
                color: tab === tabItem.key ? '#fff' : '#999',
                fontWeight: tab === tabItem.key ? 700 : 400, fontSize: 14, transition: 'all 0.25s',
              }}>
                {tabItem.label}
              </button>
            ))}
          </div>

          {tab === 'form' ? (
            <div style={{ padding: '16px' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>{t('my_balance')} :</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#FF9500' }}>{fmt(solde)} FCFA</p>
              </div>

              <div style={{ background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 12 }}>
                  {t('select_amount')}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                  {MONTANTS_RAPIDES.map(m => (
                    <button key={m} onClick={() => setForm({ ...form, montant: String(m) })} style={{
                      padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                      border: form.montant === String(m) ? '2px solid #FF9500' : '1.5px solid #E8E8E8',
                      background: form.montant === String(m) ? '#FFF8F0' : '#F7F7F7',
                      color: form.montant === String(m) ? '#FF9500' : '#1A1A1A',
                      fontWeight: form.montant === String(m) ? 700 : 500,
                      fontSize: 13, textAlign: 'center',
                    }}>
                      {new Intl.NumberFormat('fr-FR').format(m)}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  placeholder={t('other_amount')}
                  value={form.montant}
                  onChange={e => setForm({ ...form, montant: e.target.value })}
                  style={{
                    width: '100%', background: '#F7F7F7', border: '1.5px solid #E8E8E8',
                    borderRadius: 12, padding: '13px 14px', fontSize: 15, color: '#1A1A1A', marginBottom: 14, boxSizing: 'border-box',
                  }}
                />

                <select value={form.pays} onChange={handlePaysChange} style={{
                  width: '100%', background: '#F7F7F7', border: '1.5px solid #E8E8E8',
                  borderRadius: 12, padding: '13px 14px', fontSize: 15, color: '#1A1A1A', marginBottom: 12, boxSizing: 'border-box',
                }}>
                  {Object.keys(operators).map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {currentOps.map((op) => (
                    <button key={op} onClick={() => setForm({ ...form, operateur: op })} style={{
                      flex: '1 1 calc(50% - 4px)', padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                      border: form.operateur === op ? '2px solid #FF9500' : '1.5px solid #E8E8E8',
                      background: form.operateur === op ? '#FFF8F0' : '#F7F7F7',
                      color: form.operateur === op ? '#FF9500' : '#666',
                      fontWeight: form.operateur === op ? 700 : 500, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <span>{OPERATOR_ICONS[op] || '💳'}</span>
                      <span>{op}</span>
                    </button>
                  ))}
                </div>

                {form.operateur !== 'Wave' && (
                  <input
                    type="tel"
                    placeholder={t('payer_number')}
                    value={form.numero_payeur}
                    onChange={e => setForm({ ...form, numero_payeur: e.target.value })}
                    style={{
                      width: '100%', background: '#F7F7F7', border: '1.5px solid #E8E8E8',
                      borderRadius: 12, padding: '13px 14px', fontSize: 15, color: '#1A1A1A', marginBottom: 16, boxSizing: 'border-box',
                    }}
                  />
                )}

                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ marginBottom: 12 }}>
                  {submitting
                    ? <><span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2, marginRight: 8 }} />Traitement...</>
                    : '⚡ Payer maintenant'
                  }
                </button>

                <div style={{ background: '#F0FFF4', borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 12, color: '#22c55e', margin: 0 }}>
                    ✅ Paiement automatique — crédit immédiat après confirmation
                  </p>
                  <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0' }}>
                    Minimum : {fmt(minDepot)} FCFA
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px' }}>
              {history.length === 0 ? (
                <div className="empty-state"><i className="fas fa-history" /><p>{t('no_deposit')}</p></div>
              ) : (
                history.map(d => (
                  <div key={d.id} style={{
                    background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A' }}>{fmt(d.montant)} FCFA</p>
                        <p style={{ color: '#999', fontSize: 12 }}>
                          {d.pays} • {d.operateur}
                          {d.type_paiement === 'automatique' && (
                            <span style={{ marginLeft: 6, background: '#E8F5FF', color: '#007AFF', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>AUTO</span>
                          )}
                        </p>
                        <p style={{ color: '#ccc', fontSize: 11 }}>{new Date(d.date_depot).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <span className={`badge badge-${statusColor[d.statut] || 'yellow'}`}>
                        <span className={`status-dot ${statusColor[d.statut] || 'yellow'}`} />
                        {t(d.statut) || d.statut}
                      </span>
                    </div>
                    {d.reference && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 10px', background: '#FFF8EE', borderRadius: 8 }}>
                        <i className="fas fa-hashtag" style={{ color: '#FF9500', fontSize: 10 }} />
                        <span style={{ flex: 1, color: '#FF9500', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{d.reference}</span>
                        <button onClick={() => { navigator.clipboard.writeText(d.reference); toast.success(t('ref_copied')); }} style={{ background: '#FF9500', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                          {t('copy')}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {step === 'ussd_push' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📱</div>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: '#1A1A1A', marginBottom: 8 }}>
              Confirmez sur votre téléphone
            </h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              Une demande de paiement a été envoyée sur le numéro{' '}
              <strong>{form.numero_payeur}</strong>.<br />
              Composez votre PIN Mobile Money pour confirmer.
            </p>

            <div style={{ background: '#FFF8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#999', margin: 0 }}>Montant</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#FF9500', margin: '4px 0 0' }}>
                {fmt(form.montant)} FCFA
              </p>
              <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>{form.operateur} • {form.pays}</p>
            </div>

            {polling && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#FF9500', fontSize: 13, marginBottom: 16 }}>
                <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                En attente de confirmation…
              </div>
            )}

            <p style={{ fontSize: 12, color: '#ccc' }}>
              Réf : <span style={{ fontFamily: 'monospace' }}>{paymentData?.reference}</span>
            </p>

            <button onClick={resetForm} style={{
              marginTop: 16, background: 'none', border: '1.5px solid #E8E8E8',
              borderRadius: 12, padding: '10px 24px', color: '#999', cursor: 'pointer', fontSize: 14,
            }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {step === 'otp' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🔐</div>
            <h2 style={{ fontWeight: 800, fontSize: 18, color: '#1A1A1A', textAlign: 'center', marginBottom: 8 }}>
              Code OTP requis
            </h2>

            {paymentData?.type === 'otp_ussd' ? (
              <div style={{ background: '#FFF8F0', borderRadius: 12, padding: '14px', marginBottom: 20, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Composez ce code USSD sur votre téléphone :</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#FF9500', fontFamily: 'monospace', letterSpacing: 1 }}>
                  {paymentData?.ussd_code}
                </p>
                <p style={{ fontSize: 12, color: '#999', margin: '8px 0 0' }}>
                  Vous recevrez un SMS avec votre OTP.
                </p>
              </div>
            ) : (
              <div style={{ background: '#F0FFF4', borderRadius: 12, padding: '12px', marginBottom: 20, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#22c55e', margin: 0 }}>
                  📨 Un SMS avec votre code OTP a été envoyé au <strong>{form.numero_payeur}</strong>
                </p>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Entrez votre code OTP :</p>
              <input
                type="number"
                placeholder="Ex : 123456"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                style={{
                  width: '100%', background: '#F7F7F7', border: '2px solid #FF9500',
                  borderRadius: 12, padding: '14px', fontSize: 20, color: '#1A1A1A',
                  textAlign: 'center', letterSpacing: 4, boxSizing: 'border-box',
                }}
              />
            </div>

            <button className="btn btn-primary" onClick={handleOtpSubmit} disabled={otpSubmitting} style={{ marginBottom: 12 }}>
              {otpSubmitting
                ? <><span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2, marginRight: 8 }} />Validation...</>
                : 'Valider le paiement'
              }
            </button>

            <button onClick={resetForm} style={{
              width: '100%', background: 'none', border: '1.5px solid #E8E8E8',
              borderRadius: 12, padding: '10px', color: '#999', cursor: 'pointer', fontSize: 14,
            }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {step === 'wave' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🌊</div>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: '#1A1A1A', marginBottom: 8 }}>
              Payer avec Wave
            </h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
              Cliquez sur le bouton ci-dessous pour ouvrir l'application Wave et confirmer votre paiement de <strong>{fmt(form.montant)} FCFA</strong>.
            </p>

            <a href={paymentData?.wave_url} target="_blank" rel="noopener noreferrer" style={{
              display: 'block', background: '#1D9BF0', color: '#fff', borderRadius: 14,
              padding: '16px', textDecoration: 'none', fontWeight: 700, fontSize: 16, marginBottom: 16,
            }}>
              🌊 Ouvrir Wave
            </a>

            {polling && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#1D9BF0', fontSize: 13, marginBottom: 16 }}>
                <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                En attente de votre confirmation Wave…
              </div>
            )}

            <p style={{ fontSize: 12, color: '#ccc', marginBottom: 16 }}>
              Réf : <span style={{ fontFamily: 'monospace' }}>{paymentData?.reference}</span>
            </p>

            <button onClick={resetForm} style={{
              background: 'none', border: '1.5px solid #E8E8E8',
              borderRadius: 12, padding: '10px 24px', color: '#999', cursor: 'pointer', fontSize: 14,
            }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontWeight: 800, fontSize: 22, color: '#22c55e', marginBottom: 8 }}>
              Paiement confirmé !
            </h2>
            <p style={{ color: '#666', fontSize: 15, marginBottom: 8 }}>
              <strong>{fmt(form.montant)} FCFA</strong> ont été crédités sur votre compte.
            </p>
            <p style={{ color: '#aaa', fontSize: 12, marginBottom: 28 }}>
              Opérateur : {form.operateur} • {form.pays}
            </p>
            <button className="btn btn-primary" onClick={resetForm}>
              Faire un autre dépôt
            </button>
          </div>
        </div>
      )}

      {step === 'failed' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontWeight: 800, fontSize: 22, color: '#ef4444', marginBottom: 8 }}>
              Paiement échoué
            </h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 28 }}>
              Le paiement a été refusé ou a expiré. Vérifiez votre solde Mobile Money et réessayez.
            </p>
            <button className="btn btn-primary" onClick={resetForm}>
              Réessayer
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
