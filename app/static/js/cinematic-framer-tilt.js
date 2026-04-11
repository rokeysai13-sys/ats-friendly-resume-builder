/**
 * CINEMATIC FRAMER MOTION TILT
 * Alternative 3D tilt implementation using Framer Motion principles
 * Lightweight, no-dependency version
 */

class CinematicFramerTilt {
  constructor(options = {}) {
    this.options = {
      maxRotation: 10,
      scale: 1.02,
      perspective: 1000,
      glowIntensity: 0.3,
      ...options,
    };

    this.elements = [];
    this.springs = new Map();
    this.animationFrames = new Map();
    this.init();
  }

  /**
   * Initialize framer tilt cards
   */
  init() {
    const cards = document.querySelectorAll('.tiltable-card');
    if (cards.length === 0) {
      console.log(
        'No tiltable cards found. Framer Motion tilt will not initialize.'
      );
      return;
    }

    cards.forEach((card) => {
      this.elements.push(card);
      this.attachListeners(card);
      this.createSpringPhysics(card);
    });

    console.log(`✨ Framer Motion Tilt initialized for ${cards.length} cards`);
  }

  /**
   * Attach mouse listeners to card
   */
  attachListeners(card) {
    card.addEventListener('mousemove', (e) => this.onMouseMove(card, e));
    card.addEventListener('mouseleave', () => this.onMouseLeave(card));
    card.addEventListener('mouseenter', () => this.onMouseEnter(card));
  }

  /**
   * Create spring physics simulation
   */
  createSpringPhysics(card) {
    const spring = {
      rotationX: 0,
      rotationY: 0,
      currentRotationX: 0,
      currentRotationY: 0,
      velocity: { x: 0, y: 0 },
      stiffness: 0.1,
      damping: 0.15,
      mass: 1,
    };

    this.springs.set(card, spring);

    // Start animation loop
    this.animate(card);
  }

  /**
   * Mouse move handler
   */
  onMouseMove(card, event) {
    const rect = card.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;

    const targetRotationX = (y / centerY) * this.options.maxRotation;
    const targetRotationY = (x / centerX) * this.options.maxRotation;

    const spring = this.springs.get(card);
    if (spring) {
      spring.rotationX = -targetRotationX; // Invert for natural feel
      spring.rotationY = targetRotationY;
    }

    // Update glow position
    const mouseXPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const mouseYPercent = ((event.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', `${mouseXPercent}%`);
    card.style.setProperty('--mouse-y', `${mouseYPercent}%`);
  }

  /**
   * Mouse leave handler
   */
  onMouseLeave(card) {
    const spring = this.springs.get(card);
    if (spring) {
      spring.rotationX = 0;
      spring.rotationY = 0;
    }

    // Smooth return to origin
    this.smoothReturn(card);
  }

  /**
   * Mouse enter handler
   */
  onMouseEnter(card) {
    const glow = card.querySelector('.tiltable-card-light');
    if (glow) {
      glow.style.opacity = this.options.glowIntensity;
    }
  }

  /**
   * Spring animation loop
   */
  animate(card) {
    const spring = this.springs.get(card);
    if (!spring) return;

    const inner = card.querySelector('.tiltable-card-inner');
    if (!inner) return;

    // Spring physics
    const accelerationX =
      (spring.rotationX - spring.currentRotationX) * spring.stiffness;
    const accelerationY =
      (spring.rotationY - spring.currentRotationY) * spring.stiffness;

    spring.velocity.x += accelerationX / spring.mass;
    spring.velocity.y += accelerationY / spring.mass;

    spring.velocity.x *= 1 - spring.damping;
    spring.velocity.y *= 1 - spring.damping;

    spring.currentRotationX += spring.velocity.x;
    spring.currentRotationY += spring.velocity.y;

    // Apply transform
    inner.style.transform = `
      perspective(${this.options.perspective}px)
      rotateX(${spring.currentRotationX}deg)
      rotateY(${spring.currentRotationY}deg)
      scale(${this.options.scale})
    `;

    // Continue animation
    const frame = requestAnimationFrame(() => this.animate(card));
    this.animationFrames.set(card, frame);
  }

  /**
   * Smooth return to neutral position
   */
  smoothReturn(card) {
    const spring = this.springs.get(card);
    if (!spring) return;

    const inner = card.querySelector('.tiltable-card-inner');
    if (!inner) return;

    // Use requestAnimationFrame for smooth return
    const returnAnimationFrame = requestAnimationFrame(() => {
      spring.currentRotationX *= 0.92;
      spring.currentRotationY *= 0.92;

      inner.style.transform = `
        perspective(${this.options.perspective}px)
        rotateX(${spring.currentRotationX}deg)
        rotateY(${spring.currentRotationY}deg)
        scale(1)
      `;

      if (
        Math.abs(spring.currentRotationX) > 0.01 ||
        Math.abs(spring.currentRotationY) > 0.01
      ) {
        this.smoothReturn(card);
      }
    });
  }

  /**
   * Destroy tilt instance
   */
  destroy() {
    this.animationFrames.forEach((frameId) =>
      cancelAnimationFrame(frameId)
    );
    this.animationFrames.clear();
    this.springs.clear();
    this.elements = [];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CinematicFramerTilt;
}
