/**
 * CINEMATIC INITIALIZATION
 * Master orchestrator for all cinematic animations
 * Dynamically loads GSAP and initializes animation systems
 */

class CinematicMaster {
  constructor(options = {}) {
    this.options = {
      enableGSAP: true,
      enableFramerTilt: true,
      lazyLoad: true,
      ...options,
    };

    this.gsapAnimations = null;
    this.framerTilt = null;
    this.loaded = false;

    if (!this.options.lazyLoad) {
      this.init();
    }
  }

  /**
   * Dynamically load GSAP from CDN
   */
  async loadGSAP() {
    return new Promise((resolve, reject) => {
      if (typeof gsap !== 'undefined') {
        console.log('GSAP already loaded');
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
      script.async = true;

      script.onload = () => {
        // Load ScrollTrigger plugin
        const scrollTriggerScript = document.createElement('script');
        scrollTriggerScript.src =
          'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js';
        scrollTriggerScript.async = true;

        scrollTriggerScript.onload = () => {
          console.log('✨ GSAP and ScrollTrigger loaded');
          resolve();
        };

        scrollTriggerScript.onerror = reject;
        document.head.appendChild(scrollTriggerScript);
      };

      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize all cinematic systems
   */
  async init() {
    try {
      console.log('🎬 Initializing Cinematic Experience...');

      // Load styles
      this.injectStyles();

      // Load GSAP
      if (this.options.enableGSAP) {
        try {
          await this.loadGSAP();

          // Dynamically import GSAP animations
          const gsapModule = await import('./cinematic-gsap.js');
          this.gsapAnimations = new gsapModule.default();
        } catch (error) {
          console.warn('GSAP initialization failed, continuing without GSAP:', error);
        }
      }

      // Initialize Framer Motion tilt
      if (this.options.enableFramerTilt) {
        const framerModule = await import('./cinematic-framer-tilt.js');
        this.framerTilt = new framerModule.default({
          maxRotation: 10,
          scale: 1.02,
        });
      }

      this.loaded = true;
      console.log('✨ Cinematic Experience Ready');

      // Dispatch custom event
      window.dispatchEvent(
        new CustomEvent('cinematicReady', {
          detail: { gsap: this.gsapAnimations, framer: this.framerTilt },
        })
      );
    } catch (error) {
      console.error('Error initializing Cinematic Master:', error);
    }
  }

  /**
   * Inject cinematic CSS into document
   */
  injectStyles() {
    // Check if styles already loaded
    if (document.querySelector('link[href*="cinematic.css"]')) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/static/css/cinematic.css';
    document.head.appendChild(link);
  }

  /**
   * Refresh animations after DOM changes
   */
  refresh() {
    if (this.gsapAnimations?.refresh) {
      this.gsapAnimations.refresh();
    }
  }

  /**
   * Destroy all animations
   */
  destroy() {
    if (this.gsapAnimations?.destroy) {
      this.gsapAnimations.destroy();
    }

    if (this.framerTilt?.destroy) {
      this.framerTilt.destroy();
    }

    this.loaded = false;
  }
}

// Auto-initialize on DOMContentLoaded if lazy loading is enabled
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.cinematicMaster = new CinematicMaster({ lazyLoad: false });
  });
} else {
  window.cinematicMaster = new CinematicMaster({ lazyLoad: false });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CinematicMaster;
}
