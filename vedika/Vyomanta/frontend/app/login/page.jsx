'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Eye, EyeOff, GraduationCap, Lock, Mail } from 'lucide-react';
import anime from 'animejs';
import { T } from '@/lib/lms-data';
import { login } from '@/lib/frappe';
import './login.css';

const ThreeDAvatar = dynamic(() => import('@/components/ThreeDAvatar'), { ssr: false });

// ── Canonical Avatars in User-Specified Peeking Positions ──
const AVATAR_SIZE = 124;

const PEEK_AVATARS = [
  {
    id: 'mowgli',
    name: 'Mowgli',
    index: 0,
    textureUrl: '/avatar_1_purple.webp',
    glowColor: '#39FF14',
    modelColor: '#39FF14',
    helloAudio: '/audio/login/mowgli_hello.wav',
    correctAudio: '/audio/login/mowgli_correct.wav',
    wrongAudio: '/audio/login/mowgli_wrong.wav',
    side: 'left',
    // 1. Upper-left alongside Email field
    style: {
      top: '28%',
      left: -90,
    },
    baseTilt: -9,
    baseRotY: -0.05,
    delay: '0.12s',
  },
  {
    id: 'belle',
    name: 'Belle',
    index: 1,
    textureUrl: '/avatar_2_lime.webp',
    glowColor: '#FF6EFF',
    modelColor: '#FF6EFF',
    helloAudio: '/audio/login/belle_hello.wav',
    correctAudio: '/audio/login/belle_correct.wav',
    wrongAudio: '/audio/login/belle_wrong.wav',
    side: 'right',
    // 2. Top-right corner / upper edge
    style: {
      top: '5%',
      right: -90,
    },
    baseTilt: 9,
    baseRotY: 0.05,
    delay: '0.28s',
  },
  {
    id: 'moana',
    name: 'Moana',
    index: 2,
    textureUrl: '/avatar_3_red.webp',
    glowColor: '#FF3131',
    modelColor: '#FF3131',
    helloAudio: '/audio/login/moana_hello.wav',
    correctAudio: '/audio/login/moana_correct.wav',
    wrongAudio: '/audio/login/moana_wrong.wav',
    side: 'right',
    // 3. Mid-lower right alongside Sign In button
    style: {
      top: '60%',
      right: -90,
    },
    baseTilt: 8,
    baseRotY: 0.05,
    delay: '0.45s',
  },
  {
    id: 'bhageera',
    name: 'Bhageera',
    index: 3,
    textureUrl: '/avatar_4_blue.webp',
    glowColor: '#FF5C00',
    modelColor: '#FF5C00',
    helloAudio: '/audio/login/bhageera_hello.wav',
    correctAudio: '/audio/login/bhageera_correct.wav',
    wrongAudio: '/audio/login/bhageera_wrong.wav',
    side: 'left',
    // 4. Lower-left alongside Continue with Google button
    style: {
      top: '76%',
      left: -90,
    },
    baseTilt: -10,
    baseRotY: -0.05,
    delay: '0.62s',
  },
];

// ── Companion Gaze Angles (Where each avatar looks to see another) ──
const COMPANION_LOOK_ANGLES = {
  // Mowgli (0: Upper-Left)
  0: {
    1: { x: -0.15, y: 0.52, z: 0.06 }, // Look at Belle (top-right)
    2: { x: 0.28, y: 0.48, z: 0.05 },  // Look at Moana (mid-right)
    3: { x: 0.42, y: 0.02, z: -0.05 }, // Look at Bhageera (bottom-left)
  },
  // Belle (1: Top-Right)
  1: {
    0: { x: 0.18, y: -0.52, z: -0.06 }, // Look at Mowgli (upper-left)
    2: { x: 0.40, y: -0.08, z: 0.05 },  // Look at Moana (mid-right)
    3: { x: 0.48, y: -0.42, z: -0.04 }, // Look at Bhageera (bottom-left)
  },
  // Moana (2: Mid-Right)
  2: {
    0: { x: -0.22, y: -0.48, z: -0.04 }, // Look at Mowgli
    1: { x: -0.38, y: -0.05, z: -0.05 }, // Look at Belle
    3: { x: 0.24, y: -0.45, z: 0.05 },   // Look at Bhageera
  },
  // Bhageera (3: Lower-Left)
  3: {
    0: { x: -0.42, y: 0.04, z: 0.05 },  // Look at Mowgli
    1: { x: -0.42, y: 0.42, z: 0.06 },  // Look at Belle
    2: { x: -0.18, y: 0.44, z: 0.04 },  // Look at Moana
  },
};

// ── Single Peekaboo Avatar Component with Autonomous Behaviors ──
function PeekAvatar({ av, isVisible, mouseOffset, activeSpeaker }) {
  const [hovered, setHovered] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [duckX, setDuckX] = useState(0);
  const [gaze, setGaze] = useState({ x: 0, y: 0, z: 0 });
  const [expr, setExpr] = useState('idle');
  const audioRef = useRef(null);
  const cycleTimeoutRef = useRef(null);
  const isLeft = av.side === 'left';

  const isGlobalSpeaker = activeSpeaker?.idx === av.index;
  const isAnotherSpeaking = activeSpeaker && !isGlobalSpeaker;

  // ── Autonomous Non-Synchronized Behavior Cycle ──
  useEffect(() => {
    if (!isVisible) return;

    let isMounted = true;

    const scheduleNextAction = (delayMs) => {
      if (!isMounted) return;
      cycleTimeoutRef.current = setTimeout(runRandomAction, delayMs);
    };

    const runRandomAction = () => {
      if (!isMounted || hovered || activeSpeaker) {
        scheduleNextAction(2000);
        return;
      }

      // Randomly pick one of 3 activities:
      // 1. Look at companion (40%)
      // 2. Look around / quizzical glance (30%)
      // 3. Duck inside behind card and pop back out (30%)
      const roll = Math.random();

      if (roll < 0.40) {
        // Look at another companion
        const others = [0, 1, 2, 3].filter((i) => i !== av.index);
        const targetBuddy = others[Math.floor(Math.random() * others.length)];
        const targetAngles = COMPANION_LOOK_ANGLES[av.index]?.[targetBuddy] || { x: 0, y: 0, z: 0 };
        setGaze(targetAngles);
        setExpr(Math.random() > 0.4 ? 'happy' : 'idle');
        const holdTime = 2200 + Math.random() * 2000;
        scheduleNextAction(holdTime);
      } else if (roll < 0.70) {
        // Look around curiously
        const rx = (Math.random() - 0.5) * 0.40;
        const ry = (Math.random() - 0.5) * 0.45;
        const rz = (Math.random() - 0.5) * 0.12;
        setGaze({ x: rx, y: ry, z: rz });
        setExpr(Math.random() > 0.5 ? 'thinking' : 'idle');
        const holdTime = 2000 + Math.random() * 1800;
        scheduleNextAction(holdTime);
      } else {
        // Duck inside behind card and come out again!
        const hideOffset = isLeft ? 68 : -68;
        setDuckX(hideOffset);
        setGaze({ x: 0, y: 0, z: 0 });
        setExpr('idle');

        // Stay hidden for 1.4s to 2.2s
        const hideDuration = 1400 + Math.random() * 800;
        cycleTimeoutRef.current = setTimeout(() => {
          if (!isMounted) return;
          // Pop back out with a spring overshoot!
          setDuckX(isLeft ? -12 : 12);
          setExpr('happy');

          // Settle back to 0 after overshoot
          setTimeout(() => {
            if (!isMounted) return;
            setDuckX(0);
            setGaze({ x: 0, y: 0, z: 0 });
            scheduleNextAction(2500 + Math.random() * 2500);
          }, 360);
        }, hideDuration);
      }
    };

    // Stagger initial start so all 4 never fire simultaneously
    const initialDelay = 1000 + av.index * 1300 + Math.random() * 1200;
    cycleTimeoutRef.current = setTimeout(runRandomAction, initialDelay);

    return () => {
      isMounted = false;
      if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
    };
  }, [isVisible, av.index, isLeft, hovered, activeSpeaker]);

  // When another avatar is speaking, socially look at that avatar
  useEffect(() => {
    if (isAnotherSpeaking && activeSpeaker) {
      const targetAngles = COMPANION_LOOK_ANGLES[av.index]?.[activeSpeaker.idx];
      if (targetAngles) {
        setGaze(targetAngles);
        setDuckX(0); // make sure it's out watching
        setExpr(activeSpeaker.type === 'correct' ? 'happy' : 'thinking');
      }
    } else if (!activeSpeaker && !hovered) {
      setGaze({ x: 0, y: 0, z: 0 });
    }
  }, [isAnotherSpeaking, activeSpeaker, av.index, hovered]);

  // Hover Interaction: Say "Hello!"
  const handleEnter = () => {
    setHovered(true);
    setDuckX(0); // immediately emerge if ducking
    setGaze({ x: 0, y: 0, z: 0 });
    if (localSpeaking || activeSpeaker) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(av.helloAudio);
      audio.volume = 0.95;
      audioRef.current = audio;
      audio.play().then(() => {
        setLocalSpeaking(true);
      }).catch(() => {});
      audio.onended = () => {
        setLocalSpeaking(false);
        audioRef.current = null;
      };
    } catch (e) {}
  };

  const handleLeave = () => {
    setHovered(false);
  };

  // Transform calculation
  let currentX = duckX;
  let currentScale = 1.0;
  let tiltOffset = 0;

  if (hovered) {
    currentX = isLeft ? -12 : 12;
    currentScale = 1.06;
    tiltOffset = isLeft ? -3 : 3;
  } else if (isGlobalSpeaker) {
    currentX = isLeft ? -16 : 16;
    currentScale = activeSpeaker.type === 'correct' ? 1.18 : 1.08;
    tiltOffset = activeSpeaker.type === 'correct' ? (isLeft ? -6 : 6) : (isLeft ? 6 : -6);
  }

  const effectiveTransform = `translate(${currentX}px, 0px) rotate(${av.baseTilt + tiltOffset}deg) scale(${currentScale})`;

  // Determine speaking state & expression
  const isSpeakingNow = isGlobalSpeaker || localSpeaking;
  const currentExpression = isGlobalSpeaker
    ? (activeSpeaker.type === 'correct' ? 'happy' : 'thinking')
    : (hovered ? 'happy' : expr);

  const effectiveRotX = (av.baseRotX || 0) + gaze.x;
  const effectiveRotY = (av.baseRotY || 0) + gaze.y;
  const effectiveRotZ = (av.baseRotZ || 0) + gaze.z;

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        position: 'absolute',
        ...av.style,
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        transform: effectiveTransform,
        transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: 'pointer',
        animation: isVisible
          ? `${isLeft ? 'funnyPopLeft' : 'funnyPopRight'} 0.72s cubic-bezier(0.34, 1.56, 0.64, 1) ${av.delay} both`
          : 'none',
        zIndex: 4, // Behind the login card (card is zIndex 10), so back portion is tucked
        pointerEvents: 'auto',
      }}
    >
      {/* 3D Mascot Avatar with dynamic eye tracking and autonomous rotation */}
      <ThreeDAvatar
        expression={currentExpression}
        glowColor={av.glowColor}
        modelColor={av.modelColor}
        textureUrl={av.textureUrl}
        size={AVATAR_SIZE}
        mouseOffset={hovered ? mouseOffset : { x: 0, y: 0 }}
        isSpeaking={isSpeakingNow}
        baseRotX={effectiveRotX}
        baseRotY={effectiveRotY}
        baseRotZ={effectiveRotZ}
      />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarsVisible, setAvatarsVisible] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [activeSpeaker, setActiveSpeaker] = useState(null); // { idx, type: 'correct' | 'wrong' }
  const cardWrapperRef = useRef(null);
  const dialogueAudioRef = useRef(null);
  const pathRef = useRef(null);
  const currentAnimeRef = useRef(null);

  // Initialize SVG snake path to rest on the email field
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
    currentAnimeRef.current = anime({
      targets: pathRef.current,
      strokeDashoffset: {
        value: offset,
        duration: 650,
        easing: 'easeOutQuart',
      },
      strokeDasharray: {
        value: dasharray,
        duration: 650,
        easing: 'easeOutQuart',
      },
    });
  };

  // Stagger funny avatar pop-out after card renders
  useEffect(() => {
    const t = setTimeout(() => setAvatarsVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    localStorage.removeItem('frappe_user');
    localStorage.removeItem('frappe_sid');
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err === 'oauth_failed') setError('Google sign-in was unsuccessful. Please try again.');
      else if (err === 'invalid_token') setError('Invalid login token. Please sign in again.');
      else if (err === 'server_error') setError('Internal server error during authentication.');
    }
  }, []);

  const handleMouseMove = (e) => {
    if (!cardWrapperRef.current) return;
    const rect = cardWrapperRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
    setMouseOffset({ x: nx, y: ny });
  };

  const playAvatarDialogue = (type) => {
    // Pick any random avatar from 0 to 3
    const luckyIdx = Math.floor(Math.random() * 4);
    const av = PEEK_AVATARS[luckyIdx];
    const audioSrc = type === 'correct' ? av.correctAudio : av.wrongAudio;

    setActiveSpeaker({ idx: luckyIdx, type });

    try {
      if (dialogueAudioRef.current) {
        dialogueAudioRef.current.pause();
        dialogueAudioRef.current.currentTime = 0;
      }
      const audio = new Audio(audioSrc);
      audio.volume = 1.0;
      dialogueAudioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => {
        if (type !== 'correct') {
          setActiveSpeaker(null);
          dialogueAudioRef.current = null;
        }
      };
    } catch (e) {}

    return luckyIdx;
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://vedika-backend-s576.onrender.com';
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const res = await fetch(`${frappeUrl}/api/method/lms.lms.api.get_google_auth_url?redirect_to=${encodeURIComponent(redirectUrl)}`);
      if (!res.ok) throw new Error('Failed to retrieve Google OAuth authorization URL from backend.');
      const data = await res.json();
      if (!data.message) throw new Error('Invalid response from backend Google OAuth initializer.');
      window.location.href = data.message;
    } catch (err) {
      playAvatarDialogue('wrong');
      setError(err.message || 'Could not initiate Google Sign-in. Please try again.');
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      localStorage.setItem('frappe_user', JSON.stringify(user));

      // Play "Yayyy! You are in!" excited dialogue randomly
      playAvatarDialogue('correct');

      // Allow audio excitement to cheer before redirecting
      setTimeout(() => {
        if (user.role === 'Administrator') router.replace('/admin');
        else router.replace('/');
      }, 1600);
    } catch (err) {
      // Play "Oops! Wrong one!" sarcastic dialogue randomly
      playAvatarDialogue('wrong');
      setError(err.message || 'Invalid email or password.');
      setLoading(false);
    }
  };

  return (
    <div onMouseMove={handleMouseMove} className="login-page-root">
      <div className="login-card-container">
        {/* Card wrapper — overflow visible so avatars peek organically from behind edges */}
        <div ref={cardWrapperRef} className="login-card-wrapper">
          {/* Peekaboo avatars distributed around the login box */}
          {PEEK_AVATARS.map((av) => (
            <PeekAvatar
              key={av.id}
              av={av}
              isVisible={avatarsVisible}
              mouseOffset={mouseOffset}
              activeSpeaker={activeSpeaker}
            />
          ))}

          {/* Main login card */}
          <div className="login-card">
            {/* Ambient glows */}
            <div className="login-ambient-top" />
            <div className="login-ambient-bottom" />

            {/* Logo & Header */}
            <div className="login-header">
              <div className="login-logo-badge">
                <GraduationCap size={26} color="#fff" />
              </div>
              <span className="login-brand-title">AI TUTOR Portal</span>
              <div className="login-headings">
                <h2 className="login-h2">Welcome Back</h2>
                <p className="login-subtitle">Sign in to continue your journey</p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="login-error-box">
                <span>⚠️</span>
                <span style={{ flex: 1 }}>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="login-form">
              {/* Mikael Ainalem SVG Snake Highlight Container */}
              <div className="login-snake-container">
                <svg className="login-snake-svg" viewBox="0 0 320 145" aria-hidden="true">
                  <defs>
                    <linearGradient
                      id="codepenSnakeGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#ff00ff" />
                      <stop offset="100%" stopColor="#ff0000" />
                    </linearGradient>
                  </defs>
                  {/* Subtle cosmic guide track */}
                  <path
                    className="login-snake-track"
                    d="m 40,60 240,0 c 0,0 24.99263,0.79932 25.00016,35.00016 0.008,34.20084 -25.00016,35 -25.00016,35 h -240"
                  />
                  {/* Animated Glowing CodePen Snake Line */}
                  <path
                    ref={pathRef}
                    className="login-snake-path"
                    d="m 40,60 240,0 c 0,0 24.99263,0.79932 25.00016,35.00016 0.008,34.20084 -25.00016,35 -25.00016,35 h -240"
                  />
                </svg>

                {/* 1. Email Field */}
                <div className="login-field-email">
                  <span className="login-input-icon">
                    <Mail size={15} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => handleFieldFocus(0, '240 600')}
                    autoComplete="off"
                    required
                    className="login-input"
                  />
                </div>

                {/* 2. Password Field */}
                <div className="login-field-password">
                  <span className="login-input-icon">
                    <Lock size={15} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => handleFieldFocus(-335, '240 600')}
                    autoComplete="off"
                    required
                    className="login-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* 3. Repositioned "Forgot password?" Link underneath password field */}
                <div className="login-forgot-row">
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password reset is not configured for this demo.');
                    }}
                    className="login-forgot-link"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* 4. Sign In Submit Button */}
                <button
                  type="submit"
                  id="login-submit-btn"
                  disabled={loading}
                  className="login-submit-btn"
                >
                  {loading ? (
                    <>
                      <div className="login-spinner" aria-hidden="true" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="login-divider-row">
                <div className="login-divider-line" />
                <span className="login-divider-text">or</span>
                <div className="login-divider-line" />
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                id="google-login-btn"
                onClick={handleGoogleLogin}
                className="login-google-btn"
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
            <div className="login-footer-row">
              <span>Don't have an account?</span>
              <a
                href="#signup"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Registration is not configured for this demo.');
                }}
                className="login-signup-link"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>

        {/* Footer copyright */}
        <div className="login-copyright">
          © 2026 AI TUTOR Platform. All rights reserved.
        </div>
      </div>
    </div>
  );
}
