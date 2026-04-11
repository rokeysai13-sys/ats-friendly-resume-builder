import { Editor } from './editor.js?v=13';
import { sessionManager } from './session-stability.js';

function init() {
    // Initialize Session Stability (token refresh, login retry prevention)
    console.log('🛡️ Session stability manager loaded');
    
    // Initialize the Editor UI (Tabs, Preview, 3D Tilt)
    window.appEditor = new Editor();
    console.log("✅ Digital Obsidian Editor Initialized");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
