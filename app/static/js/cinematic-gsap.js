/**
 * CINEMATIC GSAP ANIMATIONS
 * ScrollTrigger, parallax, text reveals, and advanced scroll effects
 */

class CinematicGSAP {
  constructor(options = {}) {
    this.options = {
      enableScrollTrigger: true,
      enableParallax: true,
      enableTextReveal: true,
      enableTilt: true,
      enableDustParallax: true,
      ...options,
    };

    this.dust = [];
    this.tiltElements = [];
    this.scrollAnimations = [];

    this.init();
  }

  /**
   * Initialize all cinematic animations
   */
  async init() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise((resolve) =>
          document.addEventListener('DOMContentLoaded', resolve)
        );
      }

      // Ensure GSAP is loaded
      if (typeof gsap === 'undefined') {
        console.warn(
          'GSAP not loaded. Cinematic animations will not initialize.'
        );
        return;
      }

      // Register ScrollTrigger plugin
      if (gsap.plugins?.ScrollTrigger && !gsap.plugins.ScrollTrigger.registered) {
        gsap.registerPlugin(gsap.plugins.ScrollTrigger);
      }

      // Initialize animations
      if (this.options.enableParallax) this.initParallaxBackground();
      if (this.options.enableDustParallax) this.initFloatingDust();
      if (this.options.enableTextReveal) this.initTextReveals();
      if (this.options.enableTilt) this.initTiltCards();
      if (this.options.enableScrollTrigger) this.initScrollTriggers();

      console.log('✨ Cinematic GSAP Animations Initialized');
    } catch (error) {
      console.error('Error initializing Cinematic GSAP:', error);
    }
  }

  /**
   * 1. PARALLAX BACKGROUND
   */
  initParallaxBackground() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');

    parallaxElements.forEach((element) => {
      const speed = parseFloat(element.dataset.parallax) || 0.5;

      gsap.to(element, {
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
          markers: false,
        },
        y: (index, target) => {
          const windowHeight = window.innerHeight;
          return windowHeight * speed * 0.5;
        },
        ease: 'none',
      });
    });
  }

  /**
   * 2. FLOATING DUST PARALLAX
   * Creates 20 dust particles with varying parallax speeds
   */
  initFloatingDust() {
    const container = document.querySelector('.parallax-container');
    if (!container) return;

    const speeds = [
      'dust-slow',
      'dust-v-slow',
      'dust-med-slow',
      'dust-medium',
      'dust-med-fast',
      'dust-fast',
      'dust-v-fast',
    ];

    for (let i = 0; i < 20; i++) {
      const dust = document.createElement('div');
      dust.className = `floating-dust ${speeds[i % speeds.length]}`;
      dust.style.left = Math.random() * 100 + '%';
      dust.style.top = Math.random() * 100 + '%';

      const speed = parseFloat(
        getComputedStyle(dust).getPropertyValue('--parallax-speed') || 0.2
      );

      container.appendChild(dust);

      // Animate dust with parallax
      gsap.to(dust, {
        scrollTrigger: {
          trigger: 'body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
          onUpdate: (self) => {
            gsap.set(dust, {
              y: self.progress * window.innerHeight * speed,
              opacity: 0.2 + Math.sin(self.progress * Math.PI * 4) * 0.15,
            });
          },
        },
      });

      // Horizontal drift
      gsap.to(dust, {
        x: (Math.random() - 0.5) * 100,
        duration: 20 + Math.random() * 20,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      this.dust.push(dust);
    }
  }

  /**
   * 3. SCROLLTRIGGER TEXT REVEALS
   * Slide up + fade in for H2 and H3 headers
   */
  initTextReveals() {
    const headers = document.querySelectorAll('h2, h3');

    headers.forEach((header) => {
      // Add mask-reveal class if not present
      if (!header.classList.contains('mask-reveal')) {
        header.classList.add('mask-reveal');
      }

      // Create animation timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: header,
          start: 'top 85%',
          end: 'top 50%',
          scrub: 0.5,
          markers: false,
        },
      });

      tl.from(header, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power2.out',
      });

      // Optional: Stagger children text
      const textSpans = header.querySelectorAll('span');
      if (textSpans.length > 0) {
        tl.from(
          textSpans,
          {
            opacity: 0,
            y: 15,
            stagger: 0.05,
            duration: 0.6,
          },
          0
        );
      }

      this.scrollAnimations.push(tl);
    });
  }

  /**
   * 4. INTERACTIVE 3D TILT
   * Mouse-based tilt for certification and project cards
   */
  initTiltCards() {
    const tiltables = document.querySelectorAll('.tiltable-card');

    tiltables.forEach((card) => {
      const inner = card.querySelector('.tiltable-card-inner');
      if (!inner) return;

      card.addEventListener('mousemove', (e) => {
        this.handleTilt(card, inner, e);
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(inner, {
          rotationX: 0,
          rotationY: 0,
          duration: 0.6,
          ease: 'power2.out',
        });

        // Hide glow
        const glow = card.querySelector('.tiltable-card-light');
        if (glow) {
          gsap.to(glow, { opacity: 0, duration: 0.3 });
        }
      });

      this.tiltElements.push(card);
    });
  }

  /**
   * Handle tilt calculations
   */
  handleTilt(card, inner, event) {
    const rect = card.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;

    const rotateX = (y / centerY) * 10; // Max 10 degree tilt
    const rotateY = (x / centerX) * 10;

    // Update glow position
    const mouseXPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const mouseYPercent = ((event.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', `${mouseXPercent}%`);
    card.style.setProperty('--mouse-y', `${mouseYPercent}%`);

    gsap.to(inner, {
      rotationX: -rotateX,
      rotationY: rotateY,
      duration: 0.2,
      ease: 'power2.out',
    });
  }

  /**
   * 5. SCROLLTRIGGER ADVANCED ANIMATIONS
   * Additional scroll-based effects
   */
  initScrollTriggers() {
    // Obsidian panels entrance animation
    const obsidianPanels = document.querySelectorAll('.obsidian-panel');
    obsidianPanels.forEach((panel, index) => {
      gsap.from(panel, {
        scrollTrigger: {
          trigger: panel,
          start: 'top 80%',
          end: 'top 50%',
          scrub: 0.4,
          markers: false,
        },
        opacity: 0,
        y: 40,
        scale: 0.95,
        duration: 0.8,
        delay: index * 0.1,
        ease: 'power3.out',
      });
    });

    // ATS Labs section overlap animation
    const atsSection = document.querySelector('.ats-labs-section');
    if (atsSection) {
      gsap.from(atsSection, {
        scrollTrigger: {
          trigger: atsSection,
          start: 'top 85%',
          end: 'top 30%',
          scrub: 0.5,
          markers: false,
        },
        x: -100,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      });
    }

    // Resume preview slide-in
    const previewSection = document.querySelector('.resume-preview-section');
    if (previewSection) {
      gsap.from(previewSection, {
        scrollTrigger: {
          trigger: previewSection,
          start: 'top 85%',
          end: 'top 30%',
          scrub: 0.5,
          markers: false,
        },
        x: 100,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      });
    }
  }

  /**
   * Refresh ScrollTrigger (call after dynamic content load)
   */
  refresh() {
    if (gsap.plugins?.ScrollTrigger) {
      gsap.plugins.ScrollTrigger.refresh();
    }
  }

  /**
   * Cleanup and destroy animations
   */
  destroy() {
    if (gsap.plugins?.ScrollTrigger) {
      gsap.plugins.ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    }

    this.scrollAnimations = [];
    this.tiltElements = [];
    this.dust = [];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CinematicGSAP;
}
