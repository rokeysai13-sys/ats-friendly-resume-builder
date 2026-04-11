/**
 * GSAP Cinematic Animations
 * ScrollTrigger text reveals, parallax effects, and interactive 3D tilt
 */

gsap.registerPlugin(ScrollTrigger);

// ========================================
// 1. PARALLAX FLOATING DUST EFFECT
// ========================================
function initFloatingDust() {
  const dustContainer = document.querySelector('.floating-dust-container');
  if (!dustContainer) return;

  const dustParticles = dustContainer.querySelectorAll('.dust-particle');
  const speeds = [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4];

  dustParticles.forEach((particle, index) => {
    const speed = speeds[index % speeds.length];
    
    gsap.to(particle, {
      y: () => window.innerHeight * 2,
      duration: 15 / speed,
      repeat: -1,
      ease: 'none',
      delay: Math.random() * 5,
    });

    gsap.to(particle, {
      x: () => (Math.random() - 0.5) * 100,
      duration: 8 + Math.random() * 4,
      repeat: -1,
      ease: 'sine.inOut',
      yoyo: true,
    });

    gsap.to(particle, {
      opacity: [0, Math.random() * 0.4 + 0.1, 0],
      duration: 6 + Math.random() * 2,
      repeat: -1,
      ease: 'sine.inOut',
    });
  });
}

// ========================================
// 2. SCROLL TRIGGER TEXT REVEAL (Mask Slide)
// ========================================
function initTextReveal() {
  const headers = gsap.utils.toArray('h2, h3');

  headers.forEach((header) => {
    gsap.set(header, { opacity: 0, y: 30 });

    ScrollTrigger.create({
      trigger: header,
      onEnter: () => {
        gsap.to(header, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'cubic.out',
        });
      },
      markers: false,
    });
  });
}

// ========================================
// 3. INTERACTIVE 3D TILT (Cards)
// ========================================
function initCardTilt() {
  const cards = gsap.utils.toArray(
    '.certification-card, .project-card, .skill-group'
  );

  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * 15;
      const rotateY = ((centerX - x) / centerX) * 15;

      gsap.to(card, {
        rotateX,
        rotateY,
        transformOrigin: 'center center',
        transformPerspective: 1000,
        duration: 0.3,
        overwrite: 'auto',
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.4)',
      });
    });
  });
}

// ========================================
// 4. SCROLL-LINKED ANIMATIONS (Panels)
// ========================================
function initScrollLinkedAnimations() {
  // ATS Lab panels scale-in from left
  const atsPanel = document.querySelector('.ats-lab-container');
  if (atsPanel) {
    gsap.set(atsPanel, { opacity: 0, x: -50 });
    ScrollTrigger.create({
      trigger: atsPanel,
      onEnter: () => {
        gsap.to(atsPanel, {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: 'cubic.out',
        });
      },
    });
  }

  // Resume preview scales-in from right
  const resumePreview = document.querySelector('.resume-preview-container');
  if (resumePreview) {
    gsap.set(resumePreview, { opacity: 0, x: 50, scale: 0.95 });
    ScrollTrigger.create({
      trigger: resumePreview,
      onEnter: () => {
        gsap.to(resumePreview, {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 1,
          ease: 'cubic.out',
        });
      },
    });
  }
}

// ========================================
// 5. STAGGERED LIST ANIMATIONS
// ========================================
function initStaggeredLists() {
  const listItems = gsap.utils.toArray(
    '.skill-item, .experience-item, .education-item'
  );

  listItems.forEach((item, index) => {
    gsap.set(item, { opacity: 0, x: 20 });
    ScrollTrigger.create({
      trigger: item,
      onEnter: () => {
        gsap.to(item, {
          opacity: 1,
          x: 0,
          duration: 0.6,
          ease: 'cubic.out',
          delay: index * 0.05,
        });
      },
    });
  });
}

// ========================================
// 6. PULSE & GLOW EFFECTS (CTA Buttons)
// ========================================
function initCtaEffects() {
  const ctaButtons = gsap.utils.toArray('.cta-button, button[type="submit"]');

  ctaButtons.forEach((button) => {
    // Subtle pulse on hover
    button.addEventListener('mouseenter', () => {
      gsap.to(button, {
        scale: 1.05,
        boxShadow:
          '0 0 30px rgba(138, 43, 226, 0.6), 0 0 60px rgba(138, 43, 226, 0.3)',
        duration: 0.3,
        overwrite: 'auto',
      });
    });

    button.addEventListener('mouseleave', () => {
      gsap.to(button, {
        scale: 1,
        boxShadow: '0 0 15px rgba(138, 43, 226, 0.3)',
        duration: 0.3,
      });
    });
  });
}

// ========================================
// 7. PARALLAX SCROLL (Slow panels)
// ========================================
function initParallaxScroll() {
  const parallaxElements = gsap.utils.toArray('[data-parallax]');

  parallaxElements.forEach((element) => {
    const speed = parseFloat(element.dataset.parallax) || 0.5;

    gsap.to(element, {
      y: (index) => -window.innerHeight * speed,
      scrollTrigger: {
        trigger: element,
        scrub: 0.5,
        markers: false,
      },
    });
  });
}

// ========================================
// 8. INITIALIZE ALL ANIMATIONS
// ========================================
function initAllAnimations() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initFloatingDust();
      initTextReveal();
      initCardTilt();
      initScrollLinkedAnimations();
      initStaggeredLists();
      initCtaEffects();
      initParallaxScroll();
    });
  } else {
    initFloatingDust();
    initTextReveal();
    initCardTilt();
    initScrollLinkedAnimations();
    initStaggeredLists();
    initCtaEffects();
    initParallaxScroll();
  }
}

// Start animations
if (typeof gsap !== 'undefined') {
  initAllAnimations();
}

// Expose for manual control
window.CinematicAnimations = {
  initFloatingDust,
  initTextReveal,
  initCardTilt,
  initScrollLinkedAnimations,
  initStaggeredLists,
  initCtaEffects,
  initParallaxScroll,
};
