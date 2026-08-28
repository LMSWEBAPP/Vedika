/**
 * Final Avatar Lab-Specific Voice Player
 *
 * Voices:
 *  - Mowgli   (Physics Lab)   -> /audio/final/mowgli.wav   (Pixar style)
 *  - Belle    (Chemistry Lab) -> /audio/final/belle.wav    (Ghibli style)
 *  - Moana    (Biology Lab)   -> /audio/final/moana.wav    (Pixar style)
 *  - Bagheera (Math Lab)      -> /audio/final/bagheera.wav (Pixar style)
 */

let activeAudio = null;

export function playAvatarGreeting(charId, onStart, onEnd) {
  if (typeof window === 'undefined') return;

  // Stop any currently playing avatar voice immediately
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }

  const audioSrc = `/audio/final/${charId}.wav`;
  const audio = new Audio(audioSrc);
  activeAudio = audio;
  audio.volume = 1.0;

  audio.onplay = () => {
    onStart?.();
  };

  audio.onended = () => {
    if (activeAudio === audio) {
      activeAudio = null;
    }
    onEnd?.();
  };

  audio.onerror = () => {
    if (activeAudio === audio) {
      activeAudio = null;
    }
    onEnd?.();
  };

  const promise = audio.play();
  if (promise !== undefined) {
    promise.catch((err) => {
      console.log('Audio playback deferred/blocked:', err.message);
      onEnd?.();
    });
  }

  return () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (activeAudio === audio) {
      activeAudio = null;
    }
  };
}

export function stopAvatarGreeting() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}
