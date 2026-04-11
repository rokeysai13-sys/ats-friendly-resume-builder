/**
 * Cinematic Refactor - GSAP & Framer Motion Integration
 * Deep UI animations with parallax, scroll triggers, and 3D tilt effects
 */

// ============================================================================
// 1. PARALLAX FLOATING DUST EFFECT
// ============================================================================

function initFloatingDust() {
  const dustContainer = document.getElementById('floating-dust');
  if (!dustContainer) return;

  // Create 20 dust particles
  for (let i = 0; i < 20; i++) {
    const dust = document.createElement('div');
    dust.className = 'dust-particle';
    dust.style.cssText = `
      position: fixed;
      width: ${Math.random() * 4 + 2}px;
      height: ${Math.random() * 4 + 2}px;
      background: radial-gradient(circle, rgba(255,255,255,0.8), rgba(255,255,255,0.2));
      border-radius: 50%;
      left: ${Math.random() * 100}%};
      top: ${Math.random() * 100}%;
      pointer-events: none;
      z-index: 1;
      opacity: ${Math.random() * 0.5 + 0.2};
    `;
    dustContainer.appendChild(dust);

    // Unique scroll multiplier for each particle (0.1x to 0.4x)
    const scrollMultiplier = Math.random() * 0.3 + 0.1;
    const startY = parseFloat(dust.style.top);

    gsap.to(dust, {
      scrollTrigger: {
        trigger: 'body',
        onUpdate: (self) => {
          gsap.set(dust, {
            y: self.getVelocity() * scrollMultiplier * 0.05,
            opacity: Math.random() * 0.5 + 0.2
          });
        }
      }
    });
  }
}

// ============================================================================
// 2. SCROLL TRIGGER TEXT REVEAL (H2 & H3 Headers)
// ============================================================================

function initHeaderReveals() {
  gsap.registerPlugin(ScrollTrigger);

  // Select all H2 and H3 headers
  const headers = document.querySelectorAll('h2, h3');

  headers.forEach((header) => {
    // Wrap text in spans for better animation control
    const text = header.textContent;
    header.innerHTML = text
      .split('')
      .map((char) => `<span class="char-reveal">${char}</span>`)
      .join('');

    // Animate from bottom with opacity reveal
    gsap.fromTo(
      header.querySelectorAll('.char-reveal'),
      {
        opacity: 0,
        y: 30
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.02,
        scrollTrigger: {
          trigger: header,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );
  });
}

// ============================================================================
// 3. INTERACTIVE 3D TILT EFFECT (Certification & Project Cards)
// ============================================================================

function init3DTilt() {
  const tiltCards = document.querySelectorAll('[data-tilt]');

  tiltCards.forEach((card) => {
    let bound = card.getBoundingClientRect();
    let centerX = bound.left + bound.width / 2;
    let centerY = bound.top + bound.height / 2;

    card.addEventListener('mousemove', (e) => {
      const rotateX = ((e.clientY - centerY) / (bound.height / 2)) * 10;
      const rotateY = ((e.clientX - centerX) / (bound.width / 2)) * -10;

      gsap.to(card, {
        rotationX: rotateX,
        rotationY: rotateY,
        transformPerspective: 1000,
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotationX: 0,
        rotationY: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    // Update center point on window resize
    window.addEventListener('resize', () => {
      bound = card.getBoundingClientRect();
      centerX = bound.left + bound.width / 2;
      centerY = bound.top + bound.height / 2;
    });
  });
}

// ============================================================================
// 4. ASYMMETRIC OVERLAP ANIMATION
// ============================================================================

function initAsymmetricLayout() {
  const atsLab = document.getElementById('ats-lab-panels');
  const resumePreview = document.getElementById('resume-preview');

  if (atsLab && resumePreview) {
    // Animate overlap on scroll
    gsap.fromTo(
      atsLab,
      {
        x: -100,
        opacity: 0
      },
      {
        x: 0,
        opacity: 1,
        duration: 1,
        scrollTrigger: {
          trigger: atsLab,
          start: 'top center',
          end: 'top 20%',
          scrub: 1
        }
      }
    );

    // Add slight parallax to resume preview
    gsap.to(resumePreview, {
      y: 50,
      scrollTrigger: {
        trigger: resumePreview,
        start: 'top center',
        end: 'bottom center',
        scrub: 1
      }
    });
  }
}

// ============================================================================
// 5. OBSIDIAN PANEL ENTRANCE ANIMATIONS
// ============================================================================

function initPanelAnimations() {
  const panels = document.querySelectorAll('[data-obsidian-panel]');

  panels.forEach((panel, index) => {
    gsap.fromTo(
      panel,
      {
        opacity: 0,
        y: 30,
        backdropFilter: 'blur(0px)'
      },
      {
        opacity: 1,
        y: 0,
        backdropFilter: 'blur(25px)',
        duration: 0.8,
        delay: index * 0.1,
        scrollTrigger: {
          trigger: panel,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  });
}

// ============================================================================
// 6. SMOOTH SCROLL ANCHOR LINKS
// ============================================================================

function initSmoothScrollAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        gsap.to(window, {
          scrollTo: target,
          duration: 1,
          ease: 'power2.inOut'
        });
      }
    });
  });
}

// ============================================================================
// 7. SCROLL PROGRESS BAR
// ============================================================================

function initScrollProgress() {
  const progressBar = document.getElementById('scroll-progress-bar');
  if (!progressBar) return;

  ScrollTrigger.create({
    onUpdate: (self) => {
      gsap.to(progressBar, {
        width: self.getVelocity() * 0.1 + '%',
        duration: 0.1
      });
    }
  });
}

// ============================================================================
// 8. INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);

  initFloatingDust();
  initHeaderReveals();
  init3DTilt();
  initAsymmetricLayout();
  initPanelAnimations();
  initSmoothScrollAnchors();
  initScrollProgress();

  // Refresh ScrollTrigger after all animations are loaded
  ScrollTrigger.refresh();
});

// Refresh ScrollTrigger on window resize
window.addEventListener('resize', () => {
  ScrollTrigger.refresh();
});
