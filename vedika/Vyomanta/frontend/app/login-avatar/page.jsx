'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, GraduationCap, Lock, Mail } from 'lucide-react';
import anime from 'animejs';
import { login } from '@/lib/frappe';
import { CubeAvatarScene } from './engine/CubeAvatarScene';
import './login-avatar.css';

export default function LoginAvatarPage() {
  const router = useRouter();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 3D Scene container reference
  const canvasContainerRef = useRef(null);
  const sceneRef = useRef(null);

  // SVG Snake path reference
  const pathRef = useRef(null);
  const currentAnimeRef = useRef(null);

  // Initialize Three.js Cube + Mascot Scene
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const scene = new CubeAvatarScene(canvasContainerRef.current);
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Initialize SVG snake path to rest on the username field
  useEffect(() => {
    if (pathRef.current) {
      pathRef.current.style.strokeDashoffset = '0';
      pathRef.current.style.strokeDasharray = '240 600';
    }
  }, []);

  const handleFieldFocus = (offset, dasharray = '240 600') => {
    if (currentAnimeRef.current) {
      currentAnimeRef.current.pause();
    }
    if (!pathRef.current) return;
    currentAnimeRef.current = anime({
      targets: pathRef.current,
      strokeDashoffset: {
        value: offset,
        duration: 700,
        easing: 'easeOutQuart',
      },
      strokeDasharray: {
        value: dasharray,
        duration: 700,
        easing: 'easeOutQuart',
      },
    });
  };

  const handleGoogleLogin = async () => {
    setError('Google Sign-in is disabled for this visual test. Please test with student / 123.');
    if (sceneRef.current) {
      sceneRef.current.triggerFailure();
    }
  };

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setError('');

    const inputUser = email.trim().toLowerCase();
    const isCorrect = (inputUser === 'student' || inputUser === 'student@lms.com') && password.trim() === '123';

    if (isCorrect) {
      setLoading(true);

      // Trigger visual breakout: cube unlocks and 4 avatars zoom forward celebrating!
      if (sceneRef.current) {
        sceneRef.current.triggerSuccess();
      }

      // Smoothly redirect to home page after celebration
      setTimeout(() => {
        router.replace('/');
      }, 1600);
    } else {
      // Trigger visual lock: cube flashes red warning and avatars huddle shaking heads "no"
      if (sceneRef.current) {
        sceneRef.current.triggerFailure();
      }
      setError('Incorrect username or password. (Hint: student / 123)');
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 1800);
    }
  };

  return (
    <div className="la-page-wrapper">
      {/* ── Unified Full-Screen 3D Canvas (Shader Cosmic Particles & Cube across entire screen) ── */}
      <div
        ref={canvasContainerRef}
        className="la-canvas-fullscreen"
        id="cube-avatar-canvas-container"
      />

      <div className="la-split-layout">
        
        {/* ── Left Pane: Transparent Login Form floating directly over the particle cosmos ── */}
        <section className="la-left-pane">
          <div className="la-card">
            {/* Logo and Brand Header */}
            <div className="la-logo-container">
              <div className="la-logo-badge">
                <GraduationCap size={28} color="#ffffff" />
              </div>
              <span className="la-brand-title">AI TUTOR Portal</span>
              <div className="la-headings">
                <h1 className="la-h2">Welcome Back</h1>
                <p className="la-subtitle">Sign in to continue your journey</p>
              </div>
            </div>

            {/* Error Message Notice */}
            {error && (
              <div className="la-error-box" role="alert">
                <span aria-hidden="true">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="la-form">
              
              {/* ── Mikael Ainalem SVG Snake Highlight Container (Username & Password ONLY) ── */}
              <div className="la-snake-form-container">
                {/* SVG Coordinate Overlay (viewBox 0 0 320 145) */}
                <svg className="la-snake-svg" viewBox="0 0 320 145" aria-hidden="true">
                  <defs>
                    <linearGradient
                      id="cyberGreenGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#00FF66" />
                      <stop offset="50%" stopColor="#38EF7D" />
                      <stop offset="100%" stopColor="#00CC55" />
                    </linearGradient>
                  </defs>
                  {/* Subtle cosmic guide track */}
                  <path
                    className="la-snake-track"
                    d="m 40,60 240,0 c 0,0 24.99263,0.79932 25.00016,35.00016 0.008,34.20084 -25.00016,35 -25.00016,35 h -240"
                  />
                  {/* Animated Glowing Cyber Snake Line */}
                  <path
                    ref={pathRef}
                    className="la-snake-path"
                    d="m 40,60 240,0 c 0,0 24.99263,0.79932 25.00016,35.00016 0.008,34.20084 -25.00016,35 -25.00016,35 h -240"
                  />
                </svg>

                {/* 1. Username Field (Bottom baseline at y=60) */}
                <div className="la-snake-field-username">
                  <span className="la-input-icon">
                    <Mail size={15} />
                  </span>
                  <input
                    id="la-email"
                    type="text"
                    placeholder="Enter username (student)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => handleFieldFocus(0, '240 600')}
                    autoComplete="off"
                    required
                    className="la-input"
                  />
                </div>

                {/* 2. Password Field (Bottom baseline at y=130) */}
                <div className="la-snake-field-password">
                  <span className="la-input-icon">
                    <Lock size={15} />
                  </span>
                  <input
                    id="la-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password (123)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => handleFieldFocus(-335, '240 600')}
                    autoComplete="off"
                    required
                    className="la-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="la-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* 3. Repositioned "Forgot password?" Link underneath password field */}
                <div className="la-snake-forgot-row">
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password reset is not configured for this demo.');
                    }}
                    className="la-link-forgot"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* 4. Sign In Submit Button (Independent, clean, no snake intersection) */}
                <button
                  type="submit"
                  id="login-submit-btn"
                  disabled={loading}
                  className="la-btn-submit"
                >
                  {loading ? (
                    <>
                      <div className="la-spinner" aria-hidden="true" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="la-divider-row">
                <div className="la-divider-line" />
                <span className="la-divider-text">or</span>
                <div className="la-divider-line" />
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                id="google-login-btn"
                onClick={handleGoogleLogin}
                className="la-btn-google"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>

            {/* Footer signup link */}
            <div className="la-footer-links">
              <span>Don't have an account?</span>
              <a
                href="#signup"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Registration is not configured for this demo.');
                }}
                className="la-footer-signup"
              >
                Sign Up
              </a>
            </div>
          </div>
        </section>

        {/* ── Right Pane: Transparent area framing the revolving cube ── */}
        <section className="la-right-pane" aria-label="3D Mascot Portal" />

      </div>
    </div>
  );
}
