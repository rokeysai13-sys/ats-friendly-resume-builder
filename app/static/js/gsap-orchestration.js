/**
 * GSAP Orchestration System
 * Deep Cinematic Effects for Resume Builder
 * Handles: ScrollTrigger, TextReveal, Parallax, 3D Tilt
 */

import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.2/index.js';
import ScrollTrigger from 'https://cdn.jsdelivr.net/npm/gsap@3.12.2/ScrollTrigger.js';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.4/dist/framer-motion.es.js';

gsap.registerPlugin(ScrollTrigger);

export class CinematicOrchestrator {
  constructor() {
    this.masterTimeline = gsap.timeline();
    this.floatingElements = [];
    this.tiltCards = [];
    this.setupComplete = false;
  }

  /**
   * Initialize all cinematic effects
   */
  async initialize() {
    if (this.setupComplete) return;

    try {
      this.setupFloatingDust();
      this.setupTextReveals();
      this.setupHeaderRiseAndUnmask();
      this.setupCardAnimations();
      this.setupScrollParallax();
      this.setupStarfieldParallax();
      this.setup3DTilt();
      this.setupPanelStagger();
      
      this.setupComplete = true;
      console.log('✨ Cinematic Orchestration Complete');
    } catch (error) {
      console.error('❌ Orchestration Error:', error);
    }
  }

  /**
   * Floating Dust parallax background effect
   * 20 elements moving at 0.1x to 0.4x scroll speed
   */
  setupFloatingDust() {
    const container = document.getElementById('floating-dust-container');
    if (!container) return;

    const dustCount = 20;
    const speeds = [];

    // Generate varied speeds
    for (let i = 0; i < dustCount; i++) {
      speeds.push(0.1 + (i / dustCount) * 0.3); // 0.1 to 0.4
    }

    // Create dust particles
    for (let i = 0; i < dustCount; i++) {
      const dust = document.createElement('div');
      dust.className = 'floating-dust-particle';
      dust.style.cssText = `
        position: absolute;
        width: ${2 + Math.random() * 4}px;
        height: ${2 + Math.random() * 4}px;
        background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%);
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        pointer-events: none;
        opacity: ${0.1 + Math.random() * 0.3};
      `;
      container.appendChild(dust);

      // Scroll-linked parallax animation
      ScrollTrigger.create({
        onUpdate: (self) => {
          const yOffset = self.getVelocity() * speeds[i] * 0.01;
          gsap.to(dust, {
            y: yOffset,
            duration: 0.5,
            overwrite: 'auto'
          });
        }
      });

      // Floating animation (y-axis bobbing)
      gsap.to(dust, {
        y: Math.sin(i) * 20,
        duration: 6 + Math.random() * 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      this.floatingElements.push(dust);
    }
  }

  /**
   * ScrollTrigger Text Reveal for H2 and H3 headers
   * Slide up 30px with opacity: 0 -> 1
   */
  setupTextReveals() {
    const headers = document.querySelectorAll('h2, h3');

    headers.forEach((header, index) => {
      // Initial state
      gsap.set(header, {
        opacity: 0,
        y: 30,
        clipPath: 'inset(0 0 100% 0)'
      });

      // Create ScrollTrigger animation
      ScrollTrigger.create({
        trigger: header,
        start: 'top center+=100',
        end: 'top center-=100',
        onEnter: () => {
          gsap.to(header, {
            opacity: 1,
            y: 0,
            clipPath: 'inset(0 0 0% 0)',
            duration: 0.8,
            delay: index * 0.1,
            ease: 'power2.out'
          });
        },
        once: true
      });
    });
  }

  /**
   * Staggered card reveal animations
   * Used for certification and project cards
   */
  setupCardAnimations() {
    const cards = document.querySelectorAll('.certification-card, .project-card');

    cards.forEach((card, index) => {
      gsap.set(card, {
        opacity: 0,
        y: 40,
        rotateX: 15,
        scale: 0.9
      });

      ScrollTrigger.create({
        trigger: card,
        start: 'top center+=150',
        onEnter: () => {
          gsap.to(card, {
            opacity: 1,
            y: 0,
            rotateX: 0,
            scale: 1,
            duration: 0.8,
            delay: index * 0.15,
            ease: 'back.out(1.5)'
          });
        },
        once: true
      });
    });
  }

  /**
   * Scroll-linked parallax for sections
   */
  setupScrollParallax() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');

    parallaxElements.forEach((element) => {
      const speed = parseFloat(element.dataset.parallax) || 0.5;

      ScrollTrigger.create({
        trigger: element,
        onUpdate: (self) => {
          gsap.to(element, {
            y: self.getVelocity() * speed,
            duration: 0.5,
            overwrite: 'auto'
          });
        }
      });
    });
  }

  /**
   * 3D Tilt effect for interactive cards
   * Uses Framer Motion for smooth cursor tracking
   */
  setup3DTilt() {
    const tiltCards = document.querySelectorAll('[data-tilt]');

    tiltCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      card.addEventListener('mousemove', (e) => {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const rotateX = ((y - centerY) / centerY) * 5; // Max 5deg tilt
        const rotateY = ((x - centerX) / centerX) * -5; // Max -5deg tilt

        gsap.to(card, {
          rotateX,
          rotateY,
          transformPerspective: 1000,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto'
        });

        // Enhanced glow effect following mouse
        const glowElement = card.querySelector('.glow-effect');
        if (glowElement) {
          gsap.to(glowElement, {
            left: `${(x / rect.width) * 100}%`,
            top: `${(y / rect.height) * 100}%`,
            opacity: 0.8,
            duration: 0.2,
            overwrite: 'auto'
          });
        }
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.5,
          ease: 'power2.out'
        });

        const glowElement = card.querySelector('.glow-effect');
        if (glowElement) {
          gsap.to(glowElement, {
            opacity: 0,
            duration: 0.3
          });
        }
      });

      this.tiltCards.push(card);
    });
  }

  /**
   * Staggered panel reveal on page load
   */
  setupPanelStagger() {
    const panels = document.querySelectorAll('.ats-lab-panel, .resume-preview-section');

    gsap.from(panels, {
      opacity: 0,
      y: 60,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out'
    });
  }

  /**
   * Rise and Unmask: H2/H3 headers slide up with clip-path reveal
   * Creates cinematic header entrance on scroll
   */
  setupHeaderRiseAndUnmask() {
    const headers = document.querySelectorAll('#editor-form-panel h2, #editor-form-panel h3, #ats-panel h2, #ats-panel h3');

    headers.forEach((header, index) => {
      // Set initial state: hidden with clip-path
      gsap.set(header, {
        opacity: 0,
        y: 40,
        clipPath: 'inset(0% 0% 100% 0%)',
      });

      // Create scroll trigger for reveal
      ScrollTrigger.create({
        trigger: header,
        start: 'top 85%',
        end: 'top 25%',
        onEnter: () => {
          // Rise and Unmask animation
          gsap.to(header, {
            opacity: 1,
            y: 0,
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.9,
            delay: index * 0.08,
            ease: 'cubic-bezier(0.32, 0.72, 0.36, 1)',
            overwrite: 'auto'
          });
        },
        once: true
      });
    });
  }

  /**
   * Parallax Starfield: Subtle depth effect in background
   * Creates moving stars at different speeds for parallax depth
   */
  setupStarfieldParallax() {
    // Create starfield container if it doesn't exist
    let starfield = document.getElementById('starfield-parallax');
    
    if (!starfield) {
      starfield = document.createElement('div');
      starfield.id = 'starfield-parallax';
      starfield.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        opacity: 0.15;
      `;
      document.body.insertBefore(starfield, document.body.firstChild);
    } else {
      // Clear existing stars
      starfield.innerHTML = '';
    }

    // Generate 60 parallax stars
    const starCount = 60;
    const stars = [];

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      const size = 1 + Math.random() * 1.5;
      const speed = 0.2 + (i / starCount) * 0.4; // Varied depth speeds
      
      star.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 100%);
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        border-radius: 50%;
        opacity: ${0.3 + Math.random() * 0.7};
        box-shadow: 0 0 ${size * 2}px rgba(255,255,255,0.6);
      `;
      
      starfield.appendChild(star);
      stars.push({ element: star, speed });

      // Gentle twinkle animation
      gsap.to(star, {
        opacity: parseFloat(star.style.opacity) * 0.6,
        duration: 3 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }

    // Parallax on scroll
    ScrollTrigger.create({
      onUpdate: (self) => {
        stars.forEach(({ element, speed }) => {
          const offset = self.getVelocity() * speed * 0.05;
          gsap.to(element, {
            y: offset,
            x: offset * 0.5,
            duration: 0.3,
            overwrite: 'auto'
          });
        });
      }
    });

    // Parallax on mouse move for immersion
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;

      stars.forEach(({ element, speed }) => {
        gsap.to(element, {
          x: x * 100 * speed,
          y: y * 100 * speed,
          duration: 0.8,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });
    });
  }

  /**
   * Trigger refresh on window resize
   */
  handleResize() {
    ScrollTrigger.getAll().forEach(trigger => trigger.refresh());
  }

  /**
   * Cleanup method for transitions
   */
  destroy() {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    gsap.killTweensOf(this.floatingElements);
    gsap.killTweensOf(this.tiltCards);
  }
}

// Export for use in other modules
export default CinematicOrchestrator;
