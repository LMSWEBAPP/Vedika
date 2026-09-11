/**
 * Shared Portal Transition Coordinator
 * Coordinates cross-page dimensional portal arrivals and departures
 * between Home (/), Vedika Chamber (/vedika-chamber), and Vedika Labs (/vedika-labs).
 */

export const AVATAR_PAGES = ['/', '/vedika-chamber', '/vedika-ai', '/vedika-labs'];

export function isAvatarRoute(pathname) {
  if (!pathname) return false;
  if (pathname === '/' || pathname === '/vedika-chamber' || pathname === '/vedika-ai') return true;
  if (pathname === '/vedika-labs' || pathname.startsWith('/vedika-labs/')) return true;
  return false;
}

export function getAvatarPageType(pathname) {
  if (!pathname) return null;
  if (pathname === '/') return 'home';
  if (pathname === '/vedika-chamber' || pathname === '/vedika-ai') return 'chamber';
  if (pathname.startsWith('/vedika-labs')) return 'labs';
  return null;
}

let isNavigatingWithPortal = false;

let sharedAudioCtx = null;

function getSharedAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

/**
 * Play authentic cinematic roaring cosmic suction whoosh (whoooossshhhhh!)
 * Synthesized using swept bandpass pink noise + sub-bass singularity warp + sample layer
 */
export function playDeepCosmicWhoosh(duration = 1.6, intensity = 1.0) {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getSharedAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Organic turbulent noise
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = (Math.random() * 2 - 1) * 0.75;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.1606350;
        b2 = 0.57000 * b2 + white * 0.5626824;
        output[i] = (b0 + b1 + b2) * 0.35;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      // Sweeping resonant bandpass filter: 140Hz -> 1800Hz -> 110Hz (creates iconic WHOOOSH)
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(140, now);
      bandpass.frequency.exponentialRampToValueAtTime(1850, now + duration * 0.42);
      bandpass.frequency.exponentialRampToValueAtTime(110, now + duration);
      bandpass.Q.setValueAtTime(3.4, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.92 * intensity, now + duration * 0.35);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + duration);

      // Deep sub-bass singularity gravity hum
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(55, now);
      subOsc.frequency.exponentialRampToValueAtTime(105, now + duration * 0.38);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + duration);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.exponentialRampToValueAtTime(0.70 * intensity, now + duration * 0.30);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      subOsc.start(now);
      subOsc.stop(now + duration);
    }
  } catch (e) {}

  // Layer with acoustic whoosh sample
  playPortalSound('whoosh');
}

/**
 * Micro whoosh suction sound for individual avatar entering/exiting one by one
 */
export function playAvatarWhoosh(pitch = 1.0) {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getSharedAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      const duration = 0.38;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(250 * pitch, now);
      filter.frequency.exponentialRampToValueAtTime(1600 * pitch, now + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(180, now + duration);
      filter.Q.setValueAtTime(2.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.65, now + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      src.start(now);
      src.stop(now + duration);
    }
  } catch (e) {}
}

/**
 * Play cosmic dimensional portal sound effect
 */
export function playPortalSound(type = 'whoosh') {
  if (typeof window === 'undefined') return;
  try {
    const src = type === 'whoosh'
      ? '/audio/home-landing-audio/Audio-3.mpeg'
      : '/audio/home-landing-audio/Audio-2.mpeg';
    const audio = new Audio(src);
    audio.volume = 0.85;
    audio.playbackRate = type === 'whoosh' ? 1.35 : 1.15;
    const p = audio.play();
    if (p !== undefined) p.catch(() => {});
  } catch (e) {}
}

/**
 * Initiates an animated departure portal on the current page before routing
 */
export function triggerPortalNavigation(router, targetUrl, currentPathname) {
  if (!router || !targetUrl) return;
  if (targetUrl === currentPathname) return;
  if (isNavigatingWithPortal) return;

  const currentType = getAvatarPageType(currentPathname);
  const targetType = getAvatarPageType(targetUrl);

  // If navigating between avatar-enabled pages, trigger the exit portal sequence
  if (currentType && targetType) {
    isNavigatingWithPortal = true;
    playDeepCosmicWhoosh(1.8, 1.0);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('vedika_portal_origin', currentType);
      sessionStorage.setItem('vedika_portal_target', targetType);
      sessionStorage.setItem('vedika_portal_time', String(Date.now()));

      let handled = false;
      const onExitDone = () => {
        if (handled) return;
        handled = true;
        window.removeEventListener('vedika:portal-exit-complete', onExitDone);
        isNavigatingWithPortal = false;
        router.push(targetUrl);
      };

      window.addEventListener('vedika:portal-exit-complete', onExitDone, { once: true });

      // Dispatch exit event for current page 3D engine to animate avatars diving one by one into portal
      const exitEvent = new CustomEvent('vedika:portal-exit', {
        detail: { targetUrl, currentType, targetType }
      });
      window.dispatchEvent(exitEvent);

      // Failsafe timeout in case page component doesn't emit exit-complete (accommodates 1-by-1 sequence)
      setTimeout(onExitDone, 2800);
    }
    return;
  }

  // Standard route transition
  router.push(targetUrl);
}

/**
 * Call when the page's exit portal animation has finished sucking the avatars in
 */
export function notifyPortalExitComplete() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vedika:portal-exit-complete'));
  }
}

/**
 * Check if the page was arrived at through a portal transition
 */
export function checkPortalArrival(currentPathname) {
  if (typeof window === 'undefined') return { fromPortal: false, origin: null };
  const origin = sessionStorage.getItem('vedika_portal_origin');
  const time = parseInt(sessionStorage.getItem('vedika_portal_time') || '0', 10);
  const isRecent = Date.now() - time < 8000; // valid within 8 seconds

  if (origin && isRecent) {
    sessionStorage.removeItem('vedika_portal_origin');
    sessionStorage.removeItem('vedika_portal_time');
    return { fromPortal: true, origin };
  }

  // First time load also triggers portal entrance
  return { fromPortal: true, origin: 'arrival' };
}
