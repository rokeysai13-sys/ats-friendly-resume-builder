/**
 * Cinematic Scroll Experience
 * Advanced scroll animations with GSAP ScrollTrigger, Parallax, and 3D effects
 * Dependencies: gsap, gsap/ScrollTrigger, three.js
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
import gsap from 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
import ScrollTrigger from 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js';

/** Register ScrollTrigger plugin */
gsap.registerPlugin(ScrollTrigger);

/**
 * Parallax Background (Starfield)
 */
class ParallaxStarfield {
  constructor() {
    this.canvas = document.getElementById('parallax-starfield');
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.camera.position.z = 5;

    this.createStarfield();
    this.setupScrollParallax();
    this.animate();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = (Math.random() - 0.5) * 200;
      positions[i + 2] = (Math.random() - 0.5) * 100;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6
    });

    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  setupScrollParallax() {
    // Move starfield at 0.2x scroll speed
    gsap.to(this.stars.position, {
      z: -500,
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
        markers: false
      }
    });

    // Gentle rotation
    gsap.to(this.stars.rotation, {
      z: Math.PI * 2,
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        markers: false
      }
    });
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.stars.rotation.x += 0.0001;
    this.renderer.render(this.scene, this.camera);
  }
}

/**
 * Text Reveal Animation
 * Headers rise into view as they enter the viewport
 */
class TextRevealAnimator {
  constructor() {
    this.setupTextReveals();
  }

  setupTextReveals() {
    const textElements = document.querySelectorAll('[data-text-reveal]');
    
    textElements.forEach((el, index) => {
      // Split text into lines/words
      const text = el.textContent;
      el.innerHTML = text.split('').map((char, i) => 
        `<span class="inline-block" style="opacity: 0; transform: translateY(20px);" data-char="${i}">${char}</span>`
      ).join('');

      // Animate each character
      gsap.to(el.querySelectorAll('[data-char]'), {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.02,
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
          end: 'center center',
          scrub: false,
          once: true
        }
      });
    });
  }
}

/**
 * Stagger Fade Animation
 * Projects fade in from right with stagger
 */
class StaggerFadeAnimator {
  constructor() {
    this.setupStaggerFades();
  }

  setupStaggerFades() {
    const staggerContainers = document.querySelectorAll('[data-stagger-fade]');
    
    staggerContainers.forEach(container => {
      const items = container.querySelectorAll('[data-stagger-item]');
      
      gsap.to(items, {
        opacity: 1,
        x: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 70%',
          end: 'center center',
          scrub: false,
          once: true
        }
      });

      // Initial state for items
      items.forEach(item => {
        gsap.set(item, { opacity: 0, x: 30 });
      });
    });
  }
}

/**
 * 3D Tilt/Rotation Animation
 * Cards rotate in 3D space on scroll
 */
class 3DTiltAnimator {
  constructor() {
    this.setupTiltCards();
  }

  setupTiltCards() {
    const tiltCards = document.querySelectorAll('[data-3d-tilt]');
    
    tiltCards.forEach(card => {
      gsap.to(card, {
        rotationY: 5,
        rotationX: -2,
        z: 50,
        duration: 1.2,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: card,
          start: 'top 60%',
          end: 'center center',
          scrub: 0.5,
          once: false
        }
      });

      // Set initial state
      gsap.set(card, {
        transformStyle: 'preserve-3d',
        perspective: '1200px'
      });
    });

    // Mouse tilt effect on desktop
    this.setupMouseTilt(tiltCards);
  }

  setupMouseTilt(cards) {
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const rotationX = ((e.clientY - centerY) / (rect.height / 2)) * 10;
        const rotationY = ((centerX - e.clientX) / (rect.width / 2)) * 10;

        gsap.to(card, {
          rotationX,
          rotationY,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotationX: 0,
          rotationY: 0,
          duration: 0.5,
          ease: 'back.out(1.7)'
        });
      });
    });
  }
}

/**
 * Glassmorphism Panels
 * Interactive panel animations with hover effects
 */
class GlassmorphismPanel {
  constructor() {
    this.setupPanels();
  }

  setupPanels() {
    const panels = document.querySelectorAll('[data-glass-panel]');
    
    panels.forEach(panel => {
      // Hover animation
      panel.addEventListener('mouseenter', () => {
        gsap.to(panel, {
          y: -8,
          boxShadow: '0 24px 64px rgba(118, 216, 207, 0.24)',
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      panel.addEventListener('mouseleave', () => {
        gsap.to(panel, {
          y: 0,
          boxShadow: '0 18px 50px rgba(0, 0, 0, 0.38)',
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      // Entrance animation
      gsap.set(panel, { opacity: 0, y: 20 });
      gsap.to(panel, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: panel,
          start: 'top 85%',
          end: 'top 30%',
          scrub: false,
          once: true
        }
      });
    });
  }
}

/**
 * Scroll Progress Indicator
 */
class ScrollProgress {
  constructor() {
    this.progressBar = document.querySelector('[data-scroll-progress]');
    if (!this.progressBar) return;

    gsap.to(this.progressBar, {
      scaleX: 1,
      transformOrigin: 'left center',
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        onUpdate: (self) => {
          this.progressBar.style.width = (self.progress * 100) + '%';
        }
      }
    });
  }
}

/**
 * Initialize all cinematic effects on DOM ready
 */
function initCinematicExperience() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new ParallaxStarfield();
      new TextRevealAnimator();
      new StaggerFadeAnimator();
      new 3DTiltAnimator();
      new GlassmorphismPanel();
      new ScrollProgress();
    });
  } else {
    new ParallaxStarfield();
    new TextRevealAnimator();
    new StaggerFadeAnimator();
    new 3DTiltAnimator();
    new GlassmorphismPanel();
    new ScrollProgress();
  }
}

// Auto-initialize
initCinematicExperience();

// Export for manual initialization if needed
window.CinematicExperience = {
  ParallaxStarfield,
  TextRevealAnimator,
  StaggerFadeAnimator,
  '3DTiltAnimator': 3DTiltAnimator,
  GlassmorphismPanel,
  ScrollProgress
};
