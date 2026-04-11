/**
 * AI Session Stability Manager
 * Prevents login loops, manages token refresh, and provides fallback recovery
 * 
 * Strategy:
 * 1. Auto-refresh tokens 5 minutes before expiry
 * 2. Detect 401/403 errors and prompt login only once per session
 * 3. Cache critical data to localStorage to survive logouts
 * 4. Suppress duplicate login modals within 2-second window
 */

class SessionStabilityManager {
  constructor() {
    this.tokenRefreshInterval = null;
    this.loginModalTimeout = null;
    this.lastLoginPromptTime = 0;
    this.minLoginPromptInterval = 2000; // 2 seconds between prompts
    this.tokenExpiryBuffer = 5 * 60 * 1000; // Refresh 5 min before expiry
    this.isRefreshing = false;
    this.cachedData = {
      personal: null,
      experience: null,
      education: null,
      projects: null,
      skills: null,
      certifications: null,
    };
    
    this.initialize();
  }

  /**
   * Initialize session management
   */
  initialize() {
    console.log('🛡️ Session Stability Manager initializing...');
    
    // Restore cached data from localStorage
    this.restoreCachedData();
    
    // Setup auto-refresh token on page load
    this.scheduleTokenRefresh();
    
    // Intercept all fetch calls to catch 401/403
    this.setupFetchInterceptor();
    
    // Listen for storage changes (logout from another tab)
    window.addEventListener('storage', (e) => this.handleStorageChange(e));
    
    // Monitor network connectivity
    window.addEventListener('offline', () => this.handleOffline());
    window.addEventListener('online', () => this.handleOnline());
    
    console.log('✅ Session Stability initialized');
  }

  /**
   * Schedule token refresh 5 minutes before expiry
   */
  scheduleTokenRefresh() {
    // Get token expiry from localStorage
    const tokenData = this.getTokenInfo();
    if (!tokenData || !tokenData.expiresAt) return;

    const now = Date.now();
    const expiresAt = tokenData.expiresAt;
    const timeUntilExpiry = expiresAt - now;
    const timeUntilRefresh = timeUntilExpiry - this.tokenExpiryBuffer;

    if (timeUntilRefresh > 0) {
      console.log(`⏰ Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000)}s`);
      
      this.tokenRefreshInterval = setTimeout(() => {
        this.refreshToken();
      }, timeUntilRefresh);
    }
  }

  /**
   * Auto-refresh JWT token silently
   */
  async refreshToken() {
    if (this.isRefreshing) return; // Prevent concurrent refreshes
    this.isRefreshing = true;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store new token expiry
        if (data.expires_in) {
          const expiresAt = Date.now() + (data.expires_in * 1000);
          localStorage.setItem('token_expires_at', expiresAt.toString());
        }

        console.log('🔄 Token refreshed successfully');
        
        // Schedule next refresh
        this.scheduleTokenRefresh();
      } else if (response.status === 401 || response.status === 403) {
        console.warn('⚠️ Token refresh failed - prompting login');
        this.promptLogin('Your session expired. Please sign in again.');
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      // In offline mode, suppress login prompt
      if (navigator.onLine) {
        this.promptLogin('Connection lost. Please sign in to reconnect.');
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Intercept fetch calls globally to catch auth errors
   */
  setupFetchInterceptor() {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch.apply(window, args);

        // Detect auth failures
        if (response.status === 401 || response.status === 403) {
          const now = Date.now();
          
          // Suppress if login prompt was shown recently
          if (now - this.lastLoginPromptTime > this.minLoginPromptInterval) {
            this.promptLogin('Your session expired. Please sign in again.');
          }
        }

        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    };
  }

  /**
   * Prompt user to login (rate-limited to prevent loops)
   */
  promptLogin(message) {
    const now = Date.now();
    
    // Rate limit: don't show login modal more than once per 2 seconds
    if (now - this.lastLoginPromptTime < this.minLoginPromptInterval) {
      return;
    }

    this.lastLoginPromptTime = now;

    // Show login modal
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      
      // Update status message
      const statusEl = document.getElementById('login-status');
      if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.color = '#f87171'; // danger color
      }

      console.log('🔐 Login modal shown:', message);
    }
  }

  /**
   * Cache resume data to localStorage for recovery
   */
  cacheResumeData(data) {
    try {
      if (data.personal) this.cachedData.personal = data.personal;
      if (data.experience) this.cachedData.experience = data.experience;
      if (data.education) this.cachedData.education = data.education;
      if (data.projects) this.cachedData.projects = data.projects;
      if (data.skills) this.cachedData.skills = data.skills;
      if (data.certifications) this.cachedData.certifications = data.certifications;

      // Persist to localStorage
      localStorage.setItem('resume_cache', JSON.stringify(this.cachedData));
      console.log('💾 Resume data cached');
    } catch (error) {
      console.warn('Cache error:', error);
    }
  }

  /**
   * Restore cached data on page load
   */
  restoreCachedData() {
    try {
      const cached = localStorage.getItem('resume_cache');
      if (cached) {
        this.cachedData = JSON.parse(cached);
        console.log('📂 Resume cache restored');
      }
    } catch (error) {
      console.warn('Cache restore error:', error);
    }
  }

  /**
   * Get cached resume data (fallback when offline)
   */
  getCachedData() {
    return this.cachedData;
  }

  /**
   * Get token expiry info
   */
  getTokenInfo() {
    try {
      const expiresAt = localStorage.getItem('token_expires_at');
      return {
        expiresAt: expiresAt ? parseInt(expiresAt) : null,
        isExpired: expiresAt ? Date.now() > parseInt(expiresAt) : true,
      };
    } catch (error) {
      return { expiresAt: null, isExpired: true };
    }
  }

  /**
   * Handle storage changes from other tabs
   */
  handleStorageChange(event) {
    if (event.key === 'auth_logout') {
      console.log('👋 Logout detected from another tab');
      this.promptLogin('You were logged out. Please sign in again.');
    }
  }

  /**
   * Handle offline state
   */
  handleOffline() {
    console.log('📡 Offline mode activated');
    const banner = document.createElement('div');
    banner.className = 'fixed bottom-4 left-4 z-[999] flex items-center gap-2 px-4 py-2 rounded-lg bg-danger/20 border border-danger/40 text-danger text-sm';
    banner.innerHTML = `
      <span class="material-symbols-outlined">cloud_off</span>
      <span>You're offline. Using cached data.</span>
    `;
    document.body.appendChild(banner);

    // Remove after 8 seconds
    setTimeout(() => banner.remove(), 8000);
  }

  /**
   * Handle online state
   */
  handleOnline() {
    console.log('📡 Online mode restored');
    this.refreshToken(); // Attempt refresh on reconnect
  }

  /**
   * Cleanup on logout
   */
  destroy() {
    if (this.tokenRefreshInterval) {
      clearTimeout(this.tokenRefreshInterval);
    }
    if (this.loginModalTimeout) {
      clearTimeout(this.loginModalTimeout);
    }
    console.log('🛑 Session Stability Manager destroyed');
  }
}

// Export singleton instance
export const sessionManager = new SessionStabilityManager();
