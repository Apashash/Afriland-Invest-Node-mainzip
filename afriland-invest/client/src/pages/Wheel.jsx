import React, { useState, useEffect, useRef } from 'react';
import Logo from "../components/Logo";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import BottomNav from '../components/BottomNav';

const SEGMENTS = [
  { label: '0', value: 0, color: '#ef4444' },
  { label: '100', value: 100, color: '#1B2A6B' },
  { label: '200', value: 200, color: '#000000' },
  { label: '500', value: 500, color: '#f59e0b' },
  { label: '1000', value: 1000, color: '#a855f7' },
  { label: '200', value: 200, color: '#000000' },
  { label: '100', value: 100, color: '#1B2A6B' },
  { label: '50', value: 50, color: '#06b6d4' },
];

export default function Wheel() {
  const [canSpin, setCanSpin] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  useEffect(() => { loadStatus(); }, []);

  useEffect(() => {
    drawWheel();
  }, [rotation]);

  useEffect(() => {
    if (!canSpin && remainingTime > 0) {
      const timer = setInterval(() => {
        setRemainingTime(t => Math.max(0, t - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [canSpin, remainingTime]);

  const loadStatus = async () => {
    try {
      const res = await api.get('/posts/spin');
      setCanSpin(res.data.canSpin);
      setRemainingTime(res.data.remainingSeconds);
    } catch {}
    finally { setLoading(false); }
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const segAngle = (2 * Math.PI) / SEGMENTS.length;

    ctx.clearRect(0, 0, size, size);

    SEGMENTS.forEach((seg, i) => {
      const startAngle = (rotation * Math.PI / 180) + i * segAngle;
      const endAngle = startAngle + segAngle;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + segAngle / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(seg.label, radius - 15, 5);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(center, center, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(27,42,107,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#1B2A6B';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('SPIN', center, center + 4);
  };

  const handleSpin = async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);
    try {
      const res = await api.post('/posts/spin');
      const gain = res.data.gain;
      const targetSegIdx = SEGMENTS.findIndex(s => s.value === gain) !== -1
        ? SEGMENTS.findIndex(s => s.value === gain)
        : 0;
      const targetAngle = 360 - (targetSegIdx * (360 / SEGMENTS.length)) - (360 / SEGMENTS.length / 2);
      const fullSpins = 5 * 360;
      const finalRotation = rotation + fullSpins + targetAngle;

      let start = null;
      const duration = 4000;
      const startRot = rotation;
      const totalDelta = finalRotation - rotation;

      const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setRotation(startRot + totalDelta * eased);
        if (progress < 1) requestAnimationFrame(animate);
        else {
          setResult(gain);
          setCanSpin(false);
          setRemainingTime(48 * 3600);
          setSpinning(false);
          if (gain > 0) toast.success(`Félicitations ! Vous avez gagné ${gain} FCFA !`);
          else toast('Pas de chance cette fois...', { icon: '😔' });
        }
      };
      requestAnimationFrame(animate);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
      setSpinning(false);
    }
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}><i className="fas fa-arrow-left" /></button>
        <span className="page-title">Roue de la fortune</span>
        <Logo size="sm" style={{ marginLeft: "auto" }} />
      </div>

      <div style={{ padding: '0 16px', textAlign: 'center' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg,rgba(27,42,107,0.1),rgba(0,0,0,0.1))', marginBottom: 20 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
            Tentez votre chance et gagnez jusqu'à <span style={{ color: '#a855f7', fontWeight: 700 }}>1000 FCFA</span> !
            Disponible toutes les <span style={{ color: 'var(--green-primary)', fontWeight: 700 }}>48 heures</span>.
          </p>
        </div>

        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
          <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
            <div style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '24px solid var(--green-primary)', filter: 'drop-shadow(0 2px 4px rgba(27,42,107,0.5))' }} />
          </div>
          <canvas ref={canvasRef} width={280} height={280} style={{ borderRadius: '50%', boxShadow: '0 0 40px rgba(27,42,107,0.3)', border: '4px solid rgba(27,42,107,0.3)' }} />
        </div>

        {result !== null && (
          <div className="card" style={{ marginBottom: 16, background: result > 0 ? 'rgba(27,42,107,0.15)' : 'rgba(239,68,68,0.1)', borderColor: result > 0 ? 'rgba(27,42,107,0.4)' : 'rgba(239,68,68,0.3)' }}>
            {result > 0 ? (
              <>
                <p style={{ fontSize: 24, marginBottom: 4 }}>🎉</p>
                <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--green-primary)', marginBottom: 4 }}>+{result} FCFA gagnés !</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ajouté à votre solde</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 24, marginBottom: 4 }}>😔</p>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--error)' }}>Pas de gain</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Réessayez dans 48h</p>
              </>
            )}
          </div>
        )}

        {!loading && (
          canSpin ? (
            <button onClick={handleSpin} disabled={spinning} className="btn btn-primary" style={{ fontSize: 16, padding: '16px' }}>
              {spinning ? (
                <><span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Rotation en cours...</>
              ) : (
                <><i className="fas fa-dice" /> Lancer la roue !</>
              )}
            </button>
          ) : (
            <div className="card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <i className="fas fa-clock" style={{ fontSize: 24, color: 'var(--error)', marginBottom: 8 }} />
              <p style={{ fontWeight: 600, color: 'var(--error)', marginBottom: 4 }}>Prochain spin dans</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{formatTime(remainingTime)}</p>
            </div>
          )
        )}
      </div>
      <BottomNav />
    </div>
  );
}
