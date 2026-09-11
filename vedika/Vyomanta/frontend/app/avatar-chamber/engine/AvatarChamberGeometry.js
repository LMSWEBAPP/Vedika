import * as THREE from 'three';
import gsap from 'gsap';
import { ShaderPedestal } from './ShaderPedestal';

export function getCarouselSlot(offset, navDir = 1) {
  switch (offset) {
    case 0:
      // Middle Highlighted: Center stage, brought a little bit more below, enlarged scale (1.18), golden pattern open
      return {
        x: 0.0,
        y: -0.92,
        z: 2.4,
        scale: 1.18,
        shadow: 0.0,
        patternOpen: true,
        visible: true,
      };
    case -1:
      // Left 1 (Visible): Equidistantly spaced on the left, stays on original baseline position
      return {
        x: -7.2,
        y: -0.30,
        z: -2.6,
        scale: 0.76,
        shadow: 0.78,
        patternOpen: false,
        visible: true,
      };
    case 1:
      // Right 1 (Visible): Equidistantly spaced on the right, stays on original baseline position
      return {
        x: 7.2,
        y: -0.30,
        z: -2.6,
        scale: 0.76,
        shadow: 0.78,
        patternOpen: false,
        visible: true,
      };
    default:
      // 4th Avatar in background: Deep in the background and NOT visible to the user
      return {
        x: navDir > 0 ? -11.5 : 11.5,
        y: -1.20,
        z: -10.0,
        scale: 0.001,
        shadow: 1.0,
        patternOpen: false,
        visible: false,
      };
  }
}

export const CHAMBERS_DATA = [
  {
    id: 'ask',
    index: 0,
    name: 'Ask Vedika',
    tag: 'AI Learning Companion',
    subtitle: 'Your curious learning buddy for questions & explanations',
    description: 'Ask any concept across programming, science, and math with instant friendly guidance.',
    route: '/vedika-ai/ask',
    colorHex: '#39FF14', // Neon Green
    bodyColor: '#39FF14',
    themeColor: '#39FF14',
    emissiveHex: '#146604',
    lightColor: '#6eff52',
    features: ['Adaptive Q&A', 'Step-by-Step Concepts', 'Voice Interaction'],
  },
  {
    id: 'code',
    index: 1,
    name: 'Code with Vedika',
    tag: 'Pair Programming Mentor',
    subtitle: 'Your AI pair programmer & coding mentor',
    description: 'Write, debug, and optimize real-world code with live syntax guidance and architectural hints.',
    route: '/vedika-ai/code',
    colorHex: '#FF6EFF', // Neon Pink
    bodyColor: '#FF6EFF',
    themeColor: '#FF6EFF',
    emissiveHex: '#7a1b7a',
    lightColor: '#ffa3ff',
    features: ['Live Pair Coding', 'Smart Debugging', 'Multi-Language'],
  },
  {
    id: 'puzzles',
    index: 2,
    name: 'Code Puzzles',
    tag: 'Logic & Algorithm Arena',
    subtitle: 'Interactive logic & algorithmic challenges',
    description: 'Tackle brain-teasing coding puzzles, data structure riddles, and speed challenges.',
    route: '/vedika-ai/puzzle',
    colorHex: '#FF3131', // Neon Red
    bodyColor: '#FF3131',
    themeColor: '#FF3131',
    emissiveHex: '#800f0f',
    lightColor: '#ff7575',
    features: ['Daily Challenges', 'Algorithm Trees', 'Earn Badges'],
  },
  {
    id: 'viva',
    index: 3,
    name: 'Viva and Interview',
    tag: 'Mock Interview Coach',
    subtitle: 'Real-time voice & technical mock interviews',
    description: 'Practice high-pressure technical interviews and viva exams with instant actionable feedback.',
    route: '/viva-interview',
    colorHex: '#FF5C00', // Neon Orange
    bodyColor: '#FF5C00',
    themeColor: '#FF5C00',
    emissiveHex: '#7a2b00',
    lightColor: '#ffa066',
    features: ['Real-Time Audio', 'Mock Scorecard', 'Interview Readiness'],
  },
];

export class AvatarChamber {
  constructor({ id, index, name, colorHex, emissiveHex, lightColor }) {
    this.id = id;
    this.index = index;
    this.name = name;
    this.primaryColor = new THREE.Color(colorHex);
    this.emissiveColor = new THREE.Color(emissiveHex);
    this.lightColor = new THREE.Color(lightColor || colorHex);

    this.group = new THREE.Group();

    // Default to initial slot based on index (0 = middle, 1 = right, 3 = left, 2 = hidden in background)
    const initialOffset = index === 0 ? 0 : (index === 1 ? 1 : (index === 3 ? -1 : 2));
    this.setSlot(getCarouselSlot(initialOffset, 1), 0, false);
  }

  setSlot(slot, duration = 0.85, animate = true) {
    // Cancel any active tweens on this chamber to avoid race conditions and ghost onComplete calls
    gsap.killTweensOf(this.group.position);
    gsap.killTweensOf(this.group.scale);

    if (!animate || duration <= 0) {
      this.group.position.set(slot.x, slot.y, slot.z);
      this.group.scale.setScalar(slot.scale);
      this.group.visible = slot.visible;
      return;
    }

    if (slot.visible) {
      // Must be visible immediately when assigned to a visible slot
      if (!this.group.visible || this.group.scale.x < 0.05) {
        const enterX = slot.x > 1.0 ? 11.0 : (slot.x < -1.0 ? -11.0 : 0.0);
        this.group.position.set(enterX, slot.y - 0.3, -8.0);
        this.group.scale.setScalar(0.001);
      }
      this.group.visible = true;

      gsap.to(this.group.position, {
        x: slot.x,
        y: slot.y,
        z: slot.z,
        duration,
        ease: 'power3.out',
      });
      gsap.to(this.group.scale, {
        x: slot.scale,
        y: slot.scale,
        z: slot.scale,
        duration,
        ease: 'power3.out',
      });
    } else {
      // Retires into the background
      const exitX = this.group.position.x < -1.0 ? -11.0 : 11.0;
      gsap.to(this.group.position, {
        x: exitX,
        y: slot.y,
        z: -10.0,
        duration: duration * 0.75,
        ease: 'power2.in',
      });
      gsap.to(this.group.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: duration * 0.75,
        ease: 'power2.in',
        onComplete: () => {
          this.group.visible = false;
        },
      });
    }
  }

  update(time) {}

  dispose() {
    this.group.traverse((child) => {
      if (child.isMesh || child.isLight) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}

export function createAvatarChamberStations() {
  return CHAMBERS_DATA.map((d) => new AvatarChamber(d));
}
