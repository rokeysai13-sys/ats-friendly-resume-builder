/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/templates/**/*.{html,js}",
    "./app/static/js/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        display: ['Fraunces', 'serif'],
        heading: ['Fraunces', 'serif']
      },
      
      colors: {
        surface: {
          DEFAULT: '#0b0f14',
          50: '#11161d',
          100: '#18212c',
          900: '#030507'
        },
        panel: {
          DEFAULT: '#10161f',
          50: '#151d28',
          100: '#1b2431',
          dark: '#0a0e13'
        },
        paper: '#f7f1e8',
        primary: {
          DEFAULT: '#76d8cf',
          light: '#a3e8e3',
          dark: '#53c2b8',
          darker: '#2d9b8f'
        },
        accent: {
          DEFAULT: '#d8bb79',
          light: '#e8cc99',
          dark: '#b8925a'
        },
        ink: {
          DEFAULT: '#11151b',
          light: '#1a1f27'
        },
        muted: {
          DEFAULT: '#94a3b8',
          light: '#b0bac9',
          dark: '#64748b'
        },
        danger: {
          DEFAULT: '#f87171',
          light: '#fca5a5',
          dark: '#dc2626'
        },
        success: {
          DEFAULT: '#4ade80',
          light: '#86efac',
          dark: '#22c55e'
        },
        cineblack: '#0a0a0a',
        cinewhite: '#f5f5f5'
      },

      backgroundColor: {
        glass: 'rgba(255, 255, 255, 0.05)',
        'glass-dark': 'rgba(0, 0, 0, 0.4)',
        'glass-hover': 'rgba(255, 255, 255, 0.08)',
        'bevel-light': 'rgba(255, 255, 255, 0.08)',
        'bevel-dark': 'rgba(0, 0, 0, 0.3)'
      },

      backdropBlur: {
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px'
      },

      borderColor: {
        'glass-light': 'rgba(255, 255, 255, 0.2)',
        'glass-dark': 'rgba(0, 0, 0, 0.5)',
        'bevel': 'rgba(255, 255, 255, 0.08)'
      },

      boxShadow: {
        ambient: '0 0 54px -18px rgba(118, 216, 207, 0.28)',
        glass: '0 18px 50px rgba(0, 0, 0, 0.38)',
        'glass-hover': '0 24px 64px rgba(118, 216, 207, 0.12)',
        paper: '0 24px 70px rgba(8, 12, 18, 0.28)',
        soft: '0 1px 0 rgba(255, 255, 255, 0.04) inset',
        'bevel-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.24), inset 0 -1px 0 rgba(118, 216, 207, 0.08)',
        'cinematic': '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(130deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 38%, rgba(0, 0, 0, 0.1) 100%)',
        'bevel-gradient': 'linear-gradient(130deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 38%, rgba(0, 0, 0, 0.1) 100%)',
        'aurora': 'radial-gradient(circle at top, rgba(34, 211, 238, 0.05), transparent 30%), radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.03), transparent 28%)'
      },

      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'text-reveal': 'textReveal 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'stagger-fade': 'staggerFade 0.8s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'aurora-drift': 'aurroraDrift 8s ease-in-out infinite',
        '3d-rotate': '3dRotate 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        textReveal: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        staggerFade: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(118, 216, 207, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(118, 216, 207, 0.8)' }
        },
        aurroraDrift: {
          '0%': { transform: 'translateX(0)', opacity: '0.3' },
          '50%': { opacity: '0.6' },
          '100%': { transform: 'translateX(-100%)', opacity: '0.3' }
        },
        '3dRotate': {
          '0%': { opacity: '0', transform: 'rotateX(90deg) rotateY(0deg)' },
          '100%': { opacity: '1', transform: 'rotateX(0deg) rotateY(0deg)' }
        }
      },

      // Asymmetric Grid
      gridTemplateColumns: {
        'asymmetric': 'repeat(12, minmax(0, 1fr))',
        'cinematic': '1fr 2fr 1fr',
        'focal': '1fr 1.5fr'
      },

      gridColumn: {
        'span-7': 'span 7 / span 7',
        'span-8': 'span 8 / span 8',
        'span-9': 'span 9 / span 9',
        'span-10': 'span 10 / span 10'
      },

      transitionDuration: {
        '2000': '2000ms',
        '3000': '3000ms'
      },

      transitionTimingFunction: {
        'cinematic': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'bounce-ease': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      },

      perspective: {
        '1000': '1000px',
        '1200': '1200px'
      },

      transformOrigin: {
        'center-bottom': 'center bottom'
      }
    }
  },
  plugins: [
    require('@tailwindcss/container-queries'),
    // Custom plugin for 3D transforms
    function ({ addUtilities }) {
      addUtilities({
        '.preserve-3d': {
          'transform-style': 'preserve-3d'
        },
        '.perspective-1000': {
          perspective: '1000px'
        },
        '.perspective-1200': {
          perspective: '1200px'
        },
        '.rotate-x-90': {
          transform: 'rotateX(90deg)'
        },
        '.rotate-y-45': {
          transform: 'rotateY(45deg)'
        },
        '.rotate-z-5': {
          transform: 'rotateZ(5deg)'
        }
      })
    }
  ]
}
