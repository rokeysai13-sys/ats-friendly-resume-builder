/**
 * DEEP CINEMATIC REFACTOR - GSAP Orchestration v2
 * ScrollTrigger Text Reveal • Card Stagger • Parallax Dust • 3D Tilt
 * 
 * Implementation guide:
 * - Load gsap-core.js first (basic GSAP + ScrollTrigger loader)
 * - Then load this file for advanced orchestration
 */

(function() {
  'use strict';

  class CinematicOrchestrator {
    constructor() {
      this.gsap = null;
      this.ScrollTrigger = null;
      this.masterTimeline = null;
      this.dustParticles = [];
      this.tiltCards = [];
      this.initialized = false;
    }

    /**
     * Wait for GSAP to load, then initialize
     */
    async init() {
      if (this.initialized) return Promise.resolve();

      return new Promise((resolve) => {
        const checkGSAP = setInterval(() => {
          if (window.gsap && window.ScrollTrigger) {
            clearInterval(checkGSAP);
            this.gsap = window.gsap;
            this.ScrollTrigger = window.ScrollTrigger;
            this.gsap.registerPlugin(this.ScrollTrigger);
            this.masterTimeline = this.gsap.timeline();
            
            this.setup();
            this.initialized = true;
            resolve();
          }
        }, 50);

        // Timeout after 5s
        setTimeout(() => {
          clearInterval(checkGSAP);
          console.warn('⚠️ GSAP failed to load within 5s');
          resolve();
        }, 5000);
      });
    }

    /**
     * Main setup - orchestrate all cinematic effects
     */
    setup() {
      try {
        this.setupFloatingDust();
        this.setupTextReveals();
        this.setupCardStagger();
        this.setupScrollParallax();
        this.setup3DTilt();
        console.log('✨ Cinematic Orchestration v2 Active');
      } catch (error) {
        console.error('❌ Orchestration Error:', error);
      }
    }

    /**
     * 1. FLOATING DUST PARALLAX
     * 20 particles moving at different speeds (0.1x to 0.4x scroll velocity)
     */
    setupFloatingDust() {
      const container = document.getElementById('floating-dust-container');
      if (!container) return;

      const dustCount = 20;
      const speeds = [];

      // Generate speed distribution
      for (let i = 0; i < dustCount; i++) {
        speeds.push(0.1 + (i / dustCount) * 0.3); // 0.1 to 0.4
      }

      // Create dust particles
      for (let i = 0; i < dustCount; i++) {
        const dust = document.createElement('div');
        dust.className = 'floating-dust-particle';
        const size = 2 + Math.random() * 4;
        dust.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
          opacity: ${0.15 + Math.random() * 0.35};
          pointer-events: none;
          z-index: 1;
        `;
        container.appendChild(dust);

        // Floating bobbing animation
        this.gsap.to(dust, {
          y: Math.sin(i) * 24,
          duration: 5 + Math.random() * 3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });

        // Parallax on scroll
        this.ScrollTrigger.create({
          onUpdate: (self) => {
            const velocity = self.getVelocity();
            const parallaxOffset = velocity * speeds[i] * 0.015;
            
            this.gsap.to(dust, {
              y: parallaxOffset,
              duration: 0.5,
              overwrite: 'auto'
            });
          }
        });

        this.dustParticles.push(dust);
      }
    }

    /**
     * 2. GSAP SCROLLTRIGGER TEXT REVEAL
     * H2 and H3 headers slide up 40px while unmasking via clip-path
     */
    setupTextReveals() {
      const headers = document.querySelectorAll('h2, h3');
      
      headers.forEach((header) => {
        // Skip if already animated
        if (header.classList.contains('text-reveal')) return;

        header.classList.add('text-reveal');

        this.ScrollTrigger.create({
          trigger: header,
          start: 'top 80%',
          end: 'top 20%',
          onEnter: () => {
            this.gsap.fromTo(
              header,
              {
                opacity: 0,
                clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
                y: 40
              },
              {
                opacity: 1,
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                y: 0,
                duration: 0.8,
                ease: 'power2.out'
              }
            );
          },
          once: true
        });
      });
    }

    /**
     * 3. STAGGER ANIMATIONS FOR CARDS
     * Project and Certification cards fly in from right, one-by-one
     */
    setupCardStagger() {
      const projectCards = document.querySelectorAll('.project-card');
      const certCards = document.querySelectorAll('.certification-card');
      const allCards = [...projectCards, ...certCards];

      allCards.forEach((card, index) => {
        if (card.classList.contains('stagger-item')) return;
        
        card.classList.add('stagger-item');
        
        // Set initial state
        this.gsap.set(card, {
          opacity: 0,
          x: 80,
          rotateY: 15
        });

        // Animate in on scroll trigger
        this.ScrollTrigger.create({
          trigger: card,
          start: 'top 75%',
          onEnter: () => {
            const delay = index * 0.15; // 150ms stagger
            
            this.gsap.to(card, {
              opacity: 1,
              x: 0,
              rotateY: 0,
              duration: 0.8,
              delay,
              ease: 'power3.out'
            });
          },
          once: true
        });
      });
    }

    /**
     * 4. SCROLL PARALLAX
     * Background moves slower than foreground
     */
    setupScrollParallax() {
      const parallaxElements = document.querySelectorAll('[data-parallax]');
      
      parallaxElements.forEach((el) => {
        const speed = parseFloat(el.getAttribute('data-parallax')) || 0.3;

        this.ScrollTrigger.create({
          onUpdate: (self) => {
            this.gsap.to(el, {
              y: self.getVelocity() * speed * 0.02,
              duration: 0.5,
              overwrite: 'auto',
              ease: 'sine.out'
            });
          }
        });
      });
    }

    /**
     * 5. 3D TILT EFFECT
     * Tilt cards toward mouse cursor using vanilla JS (no Vanilla-tilt library)
     */
    setup3DTilt() {
      const tiltCards = document.querySelectorAll('.tilt-card');

      tiltCards.forEach((card) => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          // Calculate rotation angles (max ±15 degrees)
          const rotateX = ((y / rect.height) - 0.5) * -30;
          const rotateY = ((x / rect.width) - 0.5) * 30;

          this.gsap.to(card, {
            '--rx': `${rotateX}deg`,
            '--ry': `${rotateY}deg`,
            duration: 0.6,
            ease: 'sine.out'
          });
        });

        card.addEventListener('mouseleave', () => {
          this.gsap.to(card, {
            '--rx': '0deg',
            '--ry': '0deg',
            duration: 0.6,
            ease: 'sine.out'
          });
        });
      });
    }

    /**
     * Refresh ScrollTrigger on window resize
     */
    onWindowResize() {
      if (this.ScrollTrigger) {
        this.ScrollTrigger.refresh();
      }
    }

    /**
     * Kill all animations (cleanup)
     */
    destroy() {
      if (this.gsap && this.masterTimeline) {
        this.masterTimeline.kill();
        this.ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        this.dustParticles = [];
        this.tiltCards = [];
        this.initialized = false;
      }
    }
  }

  // Global instance
  window.CinematicOrchestrator = CinematicOrchestrator;

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.cinematicOrch = new CinematicOrchestrator();
      window.cinematicOrch.init();
    });
  } else {
    window.cinematicOrch = new CinematicOrchestrator();
    window.cinematicOrch.init();
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    if (window.cinematicOrch) {
      window.cinematicOrch.onWindowResize();
    }
  });

  // Cleanup on page unload
  window.addEventListener('unload', () => {
    if (window.cinematicOrch) {
      window.cinematicOrch.destroy();
    }
  });
})();
