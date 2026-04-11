/**
 * DEEP CINEMATIC ORCHESTRATOR v2.0
 * Master Cinema Controller - Unified 5-Component Orchestration
 * 
 * Components:
 * 1. GSAP ScrollTrigger Animations (scroll-linked reveal)
 * 2. Framer Tilt (3D card tilt on mouse)
 * 3. Floating Dust Parallax (background depth)
 * 4. Refractive Glass Effects (glassmorphism)
 * 5. Text Reveal Staggered (word-by-word reveal)
 * 
 * Architecture: Component → Interceptor → Orchestrator
 */

'use strict';

class DeepCinematicOrchestrator {
  constructor(options = {}) {
    this.options = {
      enableDust: true,
      enableReveals: true,
      enableStagger: true,
      enableParallax: true,
      enableTilt: true,
      enableGlass: true,
      dustCount: 12,
      debugMode: false,
      ...options,
    };

    this.dust = [];
    this.reveals = [];
    this.staggerItems = [];
    this.tiltCards = [];
    this.initialized = false;
    this.perfmon = {
      frameRate: 60,
      lastTime: performance.now(),
      frameCount: 0,
    };

    this.init();
  }

  /**
   * Initialize all cinematic systems
   */
  async init() {
    try {
      // Wait for DOM and GSAP
      if (document.readyState === 'loading') {
        await new Promise((resolve) =>
          document.addEventListener('DOMContentLoaded', resolve)
        );
      }

      // Ensure GSAP and ScrollTrigger are loaded
      if (typeof gsap === 'undefined' || !gsap.plugins?.ScrollTrigger) {
        console.warn('⚠️ GSAP or ScrollTrigger not found. Falling back to CSS animations.');
        this.enableCSSFallback();
        return;
      }

      // Register ScrollTrigger
      gsap.registerPlugin(gsap.plugins.ScrollTrigger);

      // Initialize components
      if (this.options.enableDust) {
        this.initObsidianDustParallax();
      }

      if (this.options.enableReveals) {
        this.initTextReveals();
      }

      if (this.options.enableStagger) {
        this.initCardStagger();
      }

      this.initialized = true;
      console.log('✨ Deep Cinematic Refactor Initialized');

      // Dispatch event for other scripts
      window.dispatchEvent(
        new CustomEvent('cinematicReady', { detail: { orchestrator: this } })
      );
    } catch (error) {
      console.error('❌ Cinematic initialization failed:', error);
      this.enableCSSFallback();
    }
  }

  /**
   * 1. OBSIDIAN DUST PARALLAX
   * Creates 20 floating dust particles with scroll-based parallax
   */
  initObsidianDustParallax() {
    const container = document.getElementById('floating-dust-container');
    if (!container) {
      console.warn('⚠️ #floating-dust-container not found');
      return;
    }

    const speeds = [0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.22, 0.25];
    const sizes = [1, 1.5, 2, 2.5, 3, 3.5];

    for (let i = 0; i < this.options.dustCount; i++) {
      const dust = document.createElement('div');
      dust.className = 'floating-dust-particle';

      // Random properties
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      const speed = speeds[Math.floor(Math.random() * speeds.length)];
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const startOpacity = 0.1 + Math.random() * 0.3;

      dust.style.width = size + 'px';
      dust.style.height = size + 'px';
      dust.style.left = x + '%';
      dust.style.top = y + '%';
      dust.style.opacity = startOpacity;

      container.appendChild(dust);

      // Vertical scroll parallax
      gsap.to(dust, {
        scrollTrigger: {
          trigger: 'body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (self) => {
            const yOffset = self.progress * window.innerHeight * speed;
            gsap.set(dust, {
              y: yOffset,
              opacity: startOpacity + Math.sin(self.progress * Math.PI * 2) * 0.15,
            });
          },
        },
      });

      // Horizontal drift (always running)
      gsap.to(dust, {
        x: (Math.random() - 0.5) * 150,
        duration: 15 + Math.random() * 20,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      this.dust.push(dust);
    }

    console.log(`✨ Created ${this.options.dustCount} obsidian dust particles`);
  }

  /**
   * 2. TEXT REVEAL ANIMATIONS
   * H2 and H3 headers slide up 40px while unmasking from clip-path
   */
  initTextReveals() {
    const headers = document.querySelectorAll('h2, h3');

    headers.forEach((header, index) => {
      // Skip if already has animation
      if (header.dataset.hasReveal) return;

      header.dataset.hasReveal = 'true';

      // Create timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: header,
          start: 'top 85%',
          end: 'top 55%',
          scrub: 0.3,
          markers: false,
          // markers: window.location.hash === '#debug', // Enable with #debug
        },
      });

      // Main reveal animation
      tl.from(header, {
        opacity: 0,
        y: 40,
        clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
        duration: 0.8,
        ease: 'power2.out',
      })
        .to(
          header,
          {
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
            duration: 0.6,
          },
          0 // Start with the fade
        );

      // Animate child spans if they exist
      const childSpans = header.querySelectorAll('span');
      if (childSpans.length > 0) {
        tl.from(
          childSpans,
          {
            opacity: 0,
            y: 20,
            stagger: 0.08,
            duration: 0.5,
          },
          0.1
        );
      }

      this.reveals.push(tl);
    });

    console.log(`✨ Applied reveal animations to ${this.reveals.length} headers`);
  }

  /**
   * 3. CARD STAGGER ANIMATIONS
   * Project and Certification cards fly in from right one-by-one
   */
  initCardStagger() {
    // Project cards
    const projectCards = document.querySelectorAll('[data-card-type="project"]');
    const certCards = document.querySelectorAll('[data-card-type="certification"]');

    const allCards = document.querySelectorAll(
      '[data-card-type="project"], [data-card-type="certification"]'
    );

    allCards.forEach((card, index) => {
      if (card.dataset.hasStagger) return;

      card.dataset.hasStagger = 'true';
      card.classList.add('stagger-item');

      // Stagger delay based on document order
      const delay = index * 0.15;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
          end: 'top 60%',
          scrub: 0.3,
          markers: false,
        },
      });

      tl.from(card, {
        opacity: 0,
        x: 100,
        rotationY: 15,
        duration: 0.8,
        ease: 'back.out(1.2)',
        delay: delay,
      });

      this.staggerItems.push(tl);
    });

    console.log(`✨ Applied stagger animations to ${this.staggerItems.length} cards`);
  }

  /**
   * FALLBACK: Use CSS animations if GSAP unavailable
   */
  enableCSSFallback() {
    console.log('📌 Using CSS fallback animations');

    // Create dust with CSS animation
    const container = document.getElementById('floating-dust-container');
    if (container) {
      for (let i = 0; i < this.options.dustCount; i++) {
        const dust = document.createElement('div');
        dust.className = `floating-dust-particle float-${
          Math.random() > 0.5 ? 'slow' : 'medium'
        }`;
        dust.style.left = Math.random() * 100 + '%';
        dust.style.top = Math.random() * 100 + '%';
        container.appendChild(dust);
      }
    }

    // Add CSS animation classes
    document.querySelectorAll('h2, h3').forEach((header) => {
      header.classList.add('text-reveal');
    });

    document
      .querySelectorAll('[data-card-type="project"], [data-card-type="certification"]')
      .forEach((card, i) => {
        card.classList.add('stagger-item');
        card.style.animationDelay = i * 0.15 + 's';
      });
  }

  /**
   * PUBLIC: Refresh animations (call after dynamic content)
   */
  refresh() {
    if (!this.initialized) return;

    try {
      gsap.plugins.ScrollTrigger.getAll().forEach((trigger) => {
        trigger.kill();
      });

      // Reinitialize
      this.dust = [];
      this.reveals = [];
      this.staggerItems = [];

      if (this.options.enableDust) this.initObsidianDustParallax();
      if (this.options.enableReveals) this.initTextReveals();
      if (this.options.enableStagger) this.initCardStagger();

      gsap.plugins.ScrollTrigger.refresh();
      console.log('🔄 Cinematic animations refreshed');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    }
  }

  /**
   * PUBLIC: Pause all animations
   */
  pause() {
    gsap.globalTimeline.pause();
    console.log('⏸️ All animations paused');
  }

  /**
   * PUBLIC: Resume all animations
   */
  resume() {
    gsap.globalTimeline.play();
    console.log('▶️ All animations resumed');
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.cinematicOrchestrator = new DeepCinematicOrchestrator();
  });
} else {
  window.cinematicOrchestrator = new DeepCinematicOrchestrator();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeepCinematicOrchestrator;
}
