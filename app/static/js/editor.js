import { store } from './store.js?v=1';
import { ImmersiveScene3D } from './immersive3d.js';

let Editor;

try {

let lastFailedAction = null;

function setLastFailedAction(action) {
    lastFailedAction = typeof action === 'function' ? action : null;
}

function getModalElement(id) {
    return document.getElementById(id);
}

function blurAppShell(shouldBlur) {
    const appShellSelectors = ['#global-header', '#sidebar-root', 'main'];
    appShellSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (!element) return;
        element.classList.toggle('blur-sm', shouldBlur);
        element.classList.toggle('pointer-events-none', shouldBlur);
        element.classList.toggle('select-none', shouldBlur);
    });
}

function showLoginModal(retryAction = null) {
    if (retryAction) {
        setLastFailedAction(retryAction);
    }

    const modal = getModalElement('login-modal');
    const status = getModalElement('login-status');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    blurAppShell(true);

    if (status) {
        status.textContent = 'Session expired. Sign in to continue.';
    }

    const emailInput = getModalElement('login-email');
    if (emailInput && !emailInput.value) {
        emailInput.focus();
    }
}

function hideLoginModal() {
    const modal = getModalElement('login-modal');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    blurAppShell(false);
}

async function login(email, password) {
    const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || data.error || 'Login failed');
    }

    hideLoginModal();

    if (lastFailedAction) {
        const retryAction = lastFailedAction;
        setLastFailedAction(null);
        setTimeout(() => retryAction(), 0);
    }

    return data;
}

function handleAuthFailure() {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

/**
 * Central API Request Helper.
 * Handles 401 responses consistently and can capture a retry action for the login modal.
 */
async function apiRequest(url, options = {}) {
    const { retryAction = null, ...fetchOptions } = options;
    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
        if (retryAction) {
            setLastFailedAction(retryAction);
        }
        handleAuthFailure();
    }

    return response;
}

window.authApi = { login, apiRequest, showLoginModal, hideLoginModal };

/**
 * Debounce utility to limit the rate of function execution
 */
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

/**
 * Editor UI Handler
 * Re-architected for maximum stability and fail-safe DOM interactions.
 */
Editor = class Editor {
    constructor() {
        console.log("Editor.js initialized");
        this.resumeId = null;
        
        // Configuration: Define all expected selectors and their purpose
        this.selectors = {
            sections: '.form-section',
            navButtons: 'button[data-section]',
            previewContainer: 'resume-pdf-content',
            templateSelect: 'resume-template-select',
            markersContainer: 'floating-markers-container',
            viewTabs: '.view-tab',
            aside: '#editor-sidebar',
            formPanel: '#editor-form-panel',
            atsPanel: 'ats-panel',
            atsSidebar: 'ats-sidebar',
            atsScoreCircle: 'ats-score-circle',
            atsScoreText: 'ats-score-text',
            btnExportPdf: 'btn-export-pdf'
        };

        this.elements = {};
        this.immersive3D = null;
        this.motionProfile = 'subtle';
        this.motionArtifacts = [];
        this.lastAtsScore = 0;
        this.counterAnimMap = new Map();
        this.validateAndCollectElements();
        
        this.init();
    }

    /**
     * Safely collects elements and warns if any are missing.
     */
    validateAndCollectElements() {
        // Collect Multi-elements
        this.elements.sections = document.querySelectorAll(this.selectors.sections);
        this.elements.navButtons = document.querySelectorAll(this.selectors.navButtons);
        this.elements.viewTabs = document.querySelectorAll(this.selectors.viewTabs);

        if (this.elements.sections.length === 0) console.warn(`Missing: No elements found for selector "${this.selectors.sections}" (Form Sections)`);
        if (this.elements.navButtons.length === 0) console.warn(`Missing: No elements found for selector "${this.selectors.navButtons}" (Navigation Tabs)`);
        if (this.elements.viewTabs.length === 0) console.warn(`Missing: No elements found for selector "${this.selectors.viewTabs}" (View Mode Tabs)`);

        // Collect Single ID-based elements
        const idElements = [
            { key: 'previewContainer', id: this.selectors.previewContainer },
            { key: 'templateSelect', id: this.selectors.templateSelect },
            { key: 'markersContainer', id: this.selectors.markersContainer },
            { key: 'atsPanel', id: this.selectors.atsPanel },
            { key: 'atsSidebar', id: this.selectors.atsSidebar },
            { key: 'atsScoreCircle', id: this.selectors.atsScoreCircle },
            { key: 'atsScoreText', id: this.selectors.atsScoreText },
            { key: 'btnExportPdf', id: this.selectors.btnExportPdf }
        ];

        idElements.forEach(item => {
            const el = document.getElementById(item.id);
            if (!el) {
                console.warn(`Missing: DOM element with ID "${item.id}" (Target: ${item.key})`);
            }
            this.elements[item.key] = el;
        });

        // Collect Single Selector-based elements
        const selectorElements = [
            { key: 'aside', selector: this.selectors.aside },
            { key: 'formPanel', selector: this.selectors.formPanel }
        ];

        selectorElements.forEach(item => {
            const el = document.querySelector(item.selector);
            if (!el) {
                console.warn(`Missing: DOM element with selector "${item.selector}" (Target: ${item.key})`);
            }
            this.elements[item.key] = el;
        });
    }

    init() {
        try {
            this.setupLoginModal();
            this.setupTabs();
            this.setupViewTabs();
            this.setupLivePreview();
            this.setupTemplateSelector();
            this.setup3DTilt();
            this.setupImmersiveExperience();
            this.setupScrollMotion();
            this.setupMotionControls();
            this.updateProgressCounters();
            this.setupPdfExport();
            this.setupSummaryGenerator();
            this.bindInitialState();
            this.setupATSAnalyzer();
            
            // Final Task: Initial Data Load
            this.fetchInitialData();
            
            console.log("System Ready");
        } catch (e) {
            console.error("Error during Editor initialization:", e);
        }
    }

    setupImmersiveExperience() {
        try {
            this.immersive3D = new ImmersiveScene3D({
                bgHostId: 'threejs-bg',
                torusHostId: 'ats-score-3d',
                scoreTextId: 'ats-score-text',
                depthSelectors: ['#editor-form-panel', '#ats-panel', '#live-preview-panel']
            });
            this.immersive3D.init();
        } catch (error) {
            console.error('3D immersive initialization failed:', error);
        }
    }

    setupScrollMotion() {
        const gsapLib = window.gsap;
        const scrollTriggerLib = window.ScrollTrigger;
        if (!gsapLib || !scrollTriggerLib) {
            console.warn('GSAP ScrollTrigger unavailable; skipping scroll motion setup.');
            return;
        }

        gsapLib.registerPlugin(scrollTriggerLib);

        this.motionArtifacts.forEach((artifact) => {
            if (artifact?.scrollTrigger) artifact.scrollTrigger.kill();
            if (artifact?.kill) artifact.kill();
        });
        this.motionArtifacts = [];

        const profile = this.motionProfile === 'dramatic'
            ? { slide: 72, textY: 34, dotDepth: 1.65, curtainStart: 'bottom 84%', curtainEnd: 'bottom 8%' }
            : { slide: 34, textY: 18, dotDepth: 0.9, curtainStart: 'bottom 74%', curtainEnd: 'bottom 18%' };

        const dotHost = document.getElementById('parallax-dots-3d');
        const intro = document.getElementById('zen-intro');
        const workspaceStage = document.getElementById('workspace-stage');
        const curtain = document.getElementById('curtain-reveal');
        const progressFill = document.getElementById('scroll-progress-fill');

        // Build a small, fixed pool of floating dots for the scrubbed 3D parallax effect.
        if (dotHost && dotHost.children.length === 0) {
            const dotCount = 28;
            for (let i = 0; i < dotCount; i += 1) {
                const dot = document.createElement('span');
                dot.className = 'parallax-dot';
                dot.style.left = `${Math.random() * 100}%`;
                dot.style.top = `${Math.random() * 100}%`;
                dot.dataset.depth = (18 + Math.random() * 100).toFixed(1);
                dot.dataset.drift = (Math.random() * 2 - 1).toFixed(3);
                dotHost.appendChild(dot);
            }
        }

        if (dotHost) {
            const dots = Array.from(dotHost.querySelectorAll('.parallax-dot'));
            const dotTrigger = scrollTriggerLib.create({
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: true,
                onUpdate: (self) => {
                    const p = self.progress;
                    dots.forEach((dot, index) => {
                        const depth = Number(dot.dataset.depth || 32);
                        const drift = Number(dot.dataset.drift || 0);
                        const depthScale = profile.dotDepth;
                        const x = (p - 0.5) * depth * depthScale * (0.16 + Math.abs(drift));
                        const y = (0.5 - p) * depth * depthScale * 0.22 + index * 0.02;
                        const z = (p - 0.5) * depth * depthScale;
                        const scale = 0.7 + depth / 220;
                        dot.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`;
                        dot.style.opacity = `${0.2 + (1 - Math.abs(p - 0.5)) * 0.7}`;
                    });
                }
            });
            this.motionArtifacts.push(dotTrigger);
        }

        if (intro && workspaceStage && curtain) {
            const curtainAnim = gsapLib.fromTo(
                curtain,
                { yPercent: 0, opacity: 1 },
                {
                    yPercent: -110,
                    opacity: 0,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: intro,
                        start: profile.curtainStart,
                        end: profile.curtainEnd,
                        scrub: true
                    }
                }
            );
            this.motionArtifacts.push(curtainAnim);

            const stageAnim = gsapLib.fromTo(
                workspaceStage,
                { y: 34, opacity: 0.72 },
                {
                    y: 0,
                    opacity: 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: intro,
                        start: 'bottom 74%',
                        end: 'bottom 16%',
                        scrub: true
                    }
                }
            );
            this.motionArtifacts.push(stageAnim);
        }

        if (progressFill && workspaceStage) {
            const progressAnim = gsapLib.fromTo(
                progressFill,
                { scaleX: 0 },
                {
                    scaleX: 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: workspaceStage,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true
                    }
                }
            );
            this.motionArtifacts.push(progressAnim);
        }

        gsapLib.utils.toArray('[data-reveal-text]').forEach((node) => {
            const textAnim = gsapLib.fromTo(
                node,
                { y: profile.textY, opacity: 0, clipPath: 'inset(0 100% 0 0)' },
                {
                    y: 0,
                    opacity: 1,
                    clipPath: 'inset(0 0% 0 0)',
                    duration: 0.95,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: node,
                        start: 'top 88%'
                    }
                }
            );
            this.motionArtifacts.push(textAnim);
        });

        gsapLib.utils.toArray('.reveal-left').forEach((node) => {
            const leftAnim = gsapLib.fromTo(
                node,
                { x: -profile.slide, opacity: 0 },
                {
                    x: 0,
                    opacity: 1,
                    duration: 0.82,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: node,
                        start: 'top 84%'
                    }
                }
            );
            this.motionArtifacts.push(leftAnim);
        });

        gsapLib.utils.toArray('.reveal-right').forEach((node) => {
            const rightAnim = gsapLib.fromTo(
                node,
                { x: profile.slide, opacity: 0 },
                {
                    x: 0,
                    opacity: 1,
                    duration: 0.82,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: node,
                        start: 'top 84%'
                    }
                }
            );
            this.motionArtifacts.push(rightAnim);
        });

        const staggerCards = gsapLib.utils.toArray('.stagger-card');
        if (staggerCards.length) {
            gsapLib.fromTo(
                staggerCards,
                { y: 24, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.65,
                    stagger: 0.14,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: staggerCards[0].parentElement || staggerCards[0],
                        start: 'top 84%'
                    }
                }
            );
        }

        gsapLib.utils.toArray('[data-counter-target]').forEach((counterNode) => {
            const target = Number(counterNode.dataset.counterTarget || 0);
            const counterObj = { value: 0 };

            gsapLib.to(counterObj, {
                value: target,
                duration: 1.2,
                ease: 'power2.out',
                snap: { value: 1 },
                onUpdate: () => {
                    counterNode.textContent = String(Math.round(counterObj.value));
                },
                scrollTrigger: {
                    trigger: counterNode,
                    start: 'top 86%',
                    toggleActions: 'play none none none'
                }
            });
        });
    }

    setupMotionControls() {
        const modeButtons = Array.from(document.querySelectorAll('[data-motion-mode]'));
        if (!modeButtons.length) return;

        const setMode = (mode) => {
            this.motionProfile = mode === 'dramatic' ? 'dramatic' : 'subtle';
            modeButtons.forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.motionMode === this.motionProfile);
            });
            this.setupScrollMotion();
            if (window.ScrollTrigger) {
                window.ScrollTrigger.refresh();
            }
        };

        modeButtons.forEach((button) => {
            button.addEventListener('click', () => setMode(button.dataset.motionMode || 'subtle'));
        });
    }

    animateNumericCounter(elementId, targetValue) {
        const node = document.getElementById(elementId);
        if (!node) return;

        const clampedTarget = Math.max(0, Math.min(100, Math.round(targetValue)));
        const gsapLib = window.gsap;

        if (!gsapLib) {
            node.textContent = String(clampedTarget);
            node.dataset.currentValue = String(clampedTarget);
            return;
        }

        const existingAnim = this.counterAnimMap.get(elementId);
        if (existingAnim?.kill) existingAnim.kill();

        const tracker = { value: Number(node.dataset.currentValue || 0) };
        const tween = gsapLib.to(tracker, {
            value: clampedTarget,
            duration: 0.75,
            ease: 'power2.out',
            snap: { value: 1 },
            onUpdate: () => {
                const current = Math.round(tracker.value);
                node.textContent = String(current);
                node.dataset.currentValue = String(current);
            }
        });
        this.counterAnimMap.set(elementId, tween);
    }

    updateProgressCounters() {
        const s = store.state;
        const personalFields = [s.personal?.fullName, s.personal?.email, s.personal?.phone, s.personal?.location, s.personal?.linkedin];
        const personalScore = Math.round((personalFields.filter((v) => (v || '').toString().trim()).length / personalFields.length) * 100);
        const summaryScore = ((s.summary || '').trim().length > 40) ? 100 : ((s.summary || '').trim().length > 0 ? 50 : 0);
        const experienceScore = Array.isArray(s.experience) && s.experience.some((e) => (e?.companyName || '').trim() && (e?.role || '').trim()) ? 100 : 0;
        const projectsScore = Array.isArray(s.projects) && s.projects.some((p) => (p?.title || '').trim()) ? 100 : 0;
        const skillsScore = ((s.skillsString || '').split(',').map((v) => v.trim()).filter(Boolean).length >= 3) ? 100 : (((s.skillsString || '').trim().length > 0) ? 50 : 0);

        const composite = Math.round((personalScore + summaryScore + experienceScore + projectsScore + skillsScore) / 5);

        this.animateNumericCounter('counter-resume-completeness', composite);
        this.animateNumericCounter('counter-ats-live', this.lastAtsScore || 0);

        const sectionMap = {
            'progress-personal': personalScore,
            'progress-summary': summaryScore,
            'progress-experience': experienceScore,
            'progress-projects': projectsScore,
            'progress-skills': skillsScore,
        };

        Object.entries(sectionMap).forEach(([id, val]) => {
            const node = document.getElementById(id);
            if (node) node.textContent = `${val}%`;
        });
    }

    setupLoginModal() {
        const modal = document.getElementById('login-modal');
        const loginButton = document.getElementById('btn-do-login');
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');

        if (!modal || !loginButton || !emailInput || !passwordInput) return;

        const submitLogin = async () => {
            const status = document.getElementById('login-status');
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                if (status) status.textContent = 'Enter both email and password.';
                return;
            }

            loginButton.disabled = true;
            loginButton.textContent = 'Signing in...';

            try {
                if (status) status.textContent = 'Signing in...';
                await login(email, password);
                if (status) status.textContent = 'Signed in successfully.';
            } catch (error) {
                if (status) status.textContent = error.message || 'Login failed.';
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = 'Sign In';
            }
        };

        loginButton.addEventListener('click', submitLogin);
        passwordInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitLogin();
            }
        });

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                showLoginModal();
            }
        });
    }

    /**
     * Data Persistence: resolve active resume and load full detail.
     */
    async fetchInitialData() {
        this.updateSaveStatus("Fetching data...");
        try {
            const listRes = await apiRequest('/api/v1/resumes', {
                headers: { 'Content-Type': 'application/json' },
                retryAction: () => this.fetchInitialData()
            });

            if (listRes.status === 401) {
                console.log("Auth failed, using local dummy data");
                this.updateSaveStatus("Offline • Local Session");
                return;
            }

            if (!listRes.ok) {
                throw new Error('Failed to load resume list');
            }

            const listData = await listRes.json().catch(() => ({}));
            let activeResume = Array.isArray(listData.data) && listData.data.length > 0 ? listData.data[0] : null;

            if (!activeResume) {
                const createRes = await apiRequest('/api/v1/resumes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'My Resume', template_id: 1 }),
                    retryAction: () => this.fetchInitialData()
                });

                if (!createRes.ok) {
                    throw new Error('Unable to create initial resume');
                }

                activeResume = await createRes.json();
            }

            this.resumeId = activeResume.id;

            const res = await apiRequest(`/api/v1/resumes/${this.resumeId}`, {
                headers: { 'Content-Type': 'application/json' },
                retryAction: () => this.fetchInitialData()
            });

            if (res.ok) {
                const data = await res.json();
                this.mapBackendToStore(data);
                this.updateSaveStatus("All changes saved");
                this.renderPreview(store.state);
                this.bindInitialState();
                this.updateProgressCounters();
            } else {
                throw new Error("Resume not found");
            }
        } catch (e) {
            console.error("Fetch failed:", e);
            console.log("Auth failed, using local dummy data");
            this.updateSaveStatus("Offline • Local Session");
        }
    }

    /**
     * Map backend schema response to internal store structure
     */
    mapBackendToStore(data) {
        // Personal mapping
        store.update('personal.fullName', data.personal_name || "");
        store.update('personal.email', data.personal_email || "");
        store.update('personal.phone', data.personal_phone || "");
        store.update('personal.location', data.personal_location || "");
        store.update('personal.linkedin', data.personal_linkedin || "");
        store.update('summary', data.summary || "");

        // Lists mapping
        if (data.education) {
            const mappedEdu = data.education.map(e => ({
                school: e.school,
                degree: e.degree,
                startYear: e.start_year,
                endYear: e.end_year
            }));
            store.update('education', mappedEdu);
        }

        if (data.experience) {
            const mappedExp = data.experience.map(e => ({
                companyName: e.company,
                role: e.role,
                startDate: e.start_date,
                endDate: e.end_date,
                description: e.description
            }));
            store.update('experience', mappedExp);
        }

        if (data.skills) {
            const skillStrings = data.skills.map(s => s.name || s.skill_name).filter(Boolean);
            store.update('skillsString', skillStrings.join(', '));
        }

        if (data.projects) {
            const mappedProjects = data.projects.map(p => ({
                title: p.title,
                techStack: p.tech_stack,
                description: p.description,
                githubLink: p.github_link,
                demoLink: p.demo_link,
                createdDate: p.created_date
            }));
            store.update('projects', mappedProjects);
        }

        if (data.certificates) {
            const mappedCerts = data.certificates.map(c => ({
                name: c.name,
                issuingOrganization: c.issuer,
                issueDate: c.year,
                expirationDate: '',
                credentialUrl: ''
            }));
            store.update('certifications', mappedCerts);
        }
    }

    /**
     * Auto-Save Engine: PUT /api/v1/resumes/:id[/section]
     */
    async saveSectionData(path) {
        if (!this.resumeId) return;
        this.updateSaveStatus("Saving...");
        
        let endpoint = `/api/v1/resumes/${this.resumeId}`;
        let payload = {};

        // Route: Personal / Metadata
        if (path.startsWith('personal.') || path === 'summary') {
            const s = store.state.personal;
            payload = {
                personal_name: s.fullName,
                personal_email: s.email,
                personal_phone: s.phone,
                personal_location: s.location,
                personal_linkedin: s.linkedin,
                summary: store.state.summary
            };
        } 
        // Route: Education List
        else if (path.startsWith('education')) {
            endpoint += '/education';
            payload = store.state.education.map(e => ({
                school: e.school,
                degree: e.degree,
                start_year: e.startYear,
                end_year: e.endYear
            }));
        }
        // Route: Experience List
        else if (path.startsWith('experience')) {
            endpoint += '/experience';
            payload = store.state.experience.map(e => ({
                company: e.companyName,
                role: e.role,
                start_date: e.startDate,
                end_date: e.endDate,
                description: e.description
            }));
        }
        // Route: Skills
        else if (path === 'skillsString') {
            endpoint += '/skills';
            const skillNames = store.state.skillsString.split(',').map(s => s.trim()).filter(s => s);
            payload = skillNames.map(name => ({
                name: name,
                category: "Technical" 
            }));
        }
        // Route: Projects List
        else if (path.startsWith('projects')) {
            endpoint += '/projects';
            payload = (store.state.projects || []).filter(p => (p?.title || '').trim()).map(p => ({
                title: p.title,
                description: p.description,
                tech_stack: p.techStack,
                github_link: p.githubLink,
                demo_link: p.demoLink,
                created_date: p.createdDate
            }));
        }
        // Route: Certifications List
        else if (path.startsWith('certifications')) {
            endpoint += '/certificates';
            payload = (store.state.certifications || []).filter(c => (c?.name || '').trim()).map(c => ({
                name: c.name,
                issuer: c.issuingOrganization,
                year: c.issueDate
            }));
        }

        try {
            const res = await apiRequest(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                retryAction: () => this.saveSectionData(path)
            });
            if (res.ok) {
                this.updateSaveStatus("All changes saved");
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error("Save failed:", errData);
                this.updateSaveStatus("Save error • Retrying...");
            }
        } catch (e) {
            console.error("Auto-save network error:", e);
            this.updateSaveStatus("Connection lost • Retrying...");
        }
    }

    /**
     * UI Feedback: Update version/status text in Global Header
     */
    updateSaveStatus(status) {
        const statusSpan = document.getElementById('save-status');
        if (statusSpan) {
            statusSpan.innerText = `Version 2.1 • ${status}`;
        }
    }

    /**
     * Set up the ATS Analyzer button listener
     */
    setupATSAnalyzer() {
        const editBtn = document.getElementById('edit-target-role');
        const editInlineBtn = document.getElementById('edit-target-role-inline');
        const editHeroBtn = document.getElementById('btn-edit-target-role-hero');
        const startBtn = document.getElementById('btn-start-ai-analysis');
        const editAgainBtn = document.getElementById('btn-edit-jd-again');
        const jumpSummaryBtn = document.getElementById('btn-jump-summary');
        const quickEngineModeSelect = document.getElementById('ats-engine-mode-quick');
        const mainEngineModeSelect = document.getElementById('ats-engine-mode');
        console.log("ATS Button Found", startBtn);

        const setATSPanelState = (state) => {
            const welcomeState = document.getElementById('ats-welcome-state');
            const editState = document.getElementById('ats-edit-state');
            const resultsState = document.getElementById('ats-results-state');

            if (welcomeState) welcomeState.classList.add('hidden');
            if (editState) editState.classList.add('hidden');
            if (resultsState) resultsState.classList.add('hidden');

            if (state === 'edit' && editState) editState.classList.remove('hidden');
            if (state === 'results' && resultsState) resultsState.classList.remove('hidden');
            if (state === 'welcome' && welcomeState) welcomeState.classList.remove('hidden');

            if (state === 'edit') {
                const jdInput = document.getElementById('job-description-input');
                if (jdInput) jdInput.focus();
            }
        };

        const syncEngineModeSelects = (mode) => {
            const normalized = ['auto', 'local', 'api'].includes(mode) ? mode : 'auto';
            if (quickEngineModeSelect) quickEngineModeSelect.value = normalized;
            if (mainEngineModeSelect) mainEngineModeSelect.value = normalized;
        };

        syncEngineModeSelects(mainEngineModeSelect?.value || quickEngineModeSelect?.value || 'auto');

        if (quickEngineModeSelect) {
            quickEngineModeSelect.addEventListener('change', (event) => {
                syncEngineModeSelects(String(event.target?.value || 'auto').toLowerCase());
            });
        }

        if (mainEngineModeSelect) {
            mainEngineModeSelect.addEventListener('change', (event) => {
                syncEngineModeSelects(String(event.target?.value || 'auto').toLowerCase());
            });
        }
        
        if (editBtn) {
            editBtn.addEventListener('click', () => setATSPanelState('edit'));
        }

        if (editInlineBtn) {
            editInlineBtn.addEventListener('click', () => setATSPanelState('edit'));
        }

        if (editHeroBtn) {
            editHeroBtn.addEventListener('click', () => setATSPanelState('edit'));
        }

        if (editAgainBtn) {
            editAgainBtn.addEventListener('click', () => setATSPanelState('edit'));
        }

        if (jumpSummaryBtn) {
            jumpSummaryBtn.addEventListener('click', () => {
                document.querySelector('button[data-view="editor"]')?.click();
                document.querySelector('button[data-section="summary"]')?.click();
            });
        }
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.runAtsAnalysis());
        }
    }

    setupSummaryGenerator() {
        const generateBtn = document.getElementById('btn-generate-summary');
        if (!generateBtn) return;

        generateBtn.addEventListener('click', () => this.generateSummary());
    }

    async generateSummary() {
        if (!this.resumeId) {
            alert('Resume is still loading. Please try again in a moment.');
            return;
        }

        const button = document.getElementById('btn-generate-summary');
        const summaryInput = document.querySelector('[data-bind="summary"]');
        if (!button || !summaryInput) return;

        const originalText = button.innerHTML;
        button.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Generating...';
        button.disabled = true;

        try {
            const jdInput = document.getElementById('job-description-input');
            const jobDescription = jdInput ? jdInput.value.trim() : '';

            const response = await apiRequest(`/api/v1/resumes/${this.resumeId}/summary-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_description: jobDescription }),
                retryAction: () => this.generateSummary()
            });

            if (response.status === 401) {
                handleAuthFailure();
                return;
            }

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to generate summary');
            }

            const generatedSummary = (data.summary || '').trim();
            if (!generatedSummary) {
                throw new Error('AI did not return a summary. Please try again.');
            }

            summaryInput.value = generatedSummary;
            store.update('summary', generatedSummary);
            this.saveSectionData('summary');
            this.updateSaveStatus('Summary generated and saved');
        } catch (error) {
            console.error('Error generating summary:', error);
            alert(`Error: ${error.message}`);
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    /**
     * Run AI-Powered ATS Analysis
     */
    async runAtsAnalysis() {
        const jdTextarea = document.getElementById('job-description-input');
        const jdText = jdTextarea ? jdTextarea.value.trim() : '';

        if (!jdText) {
            alert("Please paste a Job Description first!");
            return;
        }

        const analyzeBtn = document.getElementById('btn-start-ai-analysis');
        const originalBtnText = analyzeBtn ? analyzeBtn.innerHTML : 'Start AI Analysis';
        
        if (analyzeBtn) {
            analyzeBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Loading...';
            analyzeBtn.disabled = true;
        }

        try {
            if (!this.resumeId) {
                throw new Error('No resume loaded for ATS analysis');
            }

            const engineModeSelect = document.getElementById('ats-engine-mode');
            const quickEngineModeSelect = document.getElementById('ats-engine-mode-quick');
            const engineMode = (engineModeSelect?.value || quickEngineModeSelect?.value || 'auto').trim().toLowerCase();

            const response = await apiRequest(`/api/v1/resumes/${this.resumeId}/ats-analyze`, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    job_description: jdText,
                    engine_mode: engineMode,
                }),
            });

            if (response.status === 401) {
                const sidebarTargetRole = document.querySelector('#ats-sidebar .glass-card p.line-clamp-3');
                if (sidebarTargetRole) {
                    sidebarTargetRole.textContent = 'Authentication required. Please log in again to run ATS analysis.';
                }
                handleAuthFailure();
                return;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));

                if (errData.error === 'RESUME_EMPTY') {
                    const sidebarTargetRole = document.querySelector('#ats-sidebar .glass-card p.line-clamp-3');
                    if (sidebarTargetRole) {
                        sidebarTargetRole.textContent = 'Add your name, summary, and at least one experience or skill, then run ATS Match again.';
                    }

                    throw new Error('Your resume is empty. Please add profile details in Content Editor first.');
                }

                if (errData.error === 'LLM_UNAVAILABLE') {
                    const sidebarTargetRole = document.querySelector('#ats-sidebar .glass-card p.line-clamp-3');
                    if (sidebarTargetRole) {
                        sidebarTargetRole.textContent = 'AI service is temporarily unavailable. Please retry in a moment.';
                    }

                    throw new Error(errData.message || 'AI service is unavailable right now. Please try again shortly.');
                }

                throw new Error(errData.message || errData.error || 'ATS Analysis failed');
            }

            const data = await response.json();
            const bestKeywords = data.best_keywords || {};
            const foundKeywords = Array.isArray(bestKeywords.found) ? bestKeywords.found : (data.found_keywords || []);
            const missingKeywords = Array.isArray(bestKeywords.missing) ? bestKeywords.missing : (data.missing_keywords || []);

            // 1. Update score using the existing animation method
            this.animateATSScore(data.score || 0);

            // 2. Clear Found/Missing containers and render new Tailwind badges
            const foundContainer = document.querySelector('#found-keywords') || document.querySelector('.found-keywords-container');
            const missingContainer = document.querySelector('#missing-keywords') || document.querySelector('.missing-keywords-container');
            const renderKeywordChips = (container, keywords, chipClass, overflowClass) => {
                if (!container) return;

                container.innerHTML = '';

                const filteredKeywords = (keywords || [])
                    .filter(kw => typeof kw === 'string' && kw.trim())
                const visibleKeywords = filteredKeywords
                    .slice(0, 6);
                const overflowCount = Math.max(0, filteredKeywords.length - visibleKeywords.length);

                visibleKeywords.forEach(kw => {
                    const pill = document.createElement('span');
                    pill.className = chipClass;
                    pill.textContent = kw;
                    container.appendChild(pill);
                });

                if (overflowCount > 0) {
                    const overflow = document.createElement('span');
                    overflow.className = overflowClass;
                    overflow.textContent = `+${overflowCount} more`;
                    container.appendChild(overflow);
                }
            };
            
            renderKeywordChips(
                foundContainer,
                foundKeywords,
                'inline-block bg-success/20 text-success text-[10px] font-bold px-2 py-1 rounded border border-success/30 mr-1 mb-1',
                'inline-block bg-white/5 text-slate-300 text-[10px] font-bold px-2 py-1 rounded border border-white/10 mr-1 mb-1'
            );

            renderKeywordChips(
                missingContainer,
                missingKeywords,
                'inline-block bg-danger/20 text-danger text-[10px] font-bold px-2 py-1 rounded border border-danger/30 mr-1 mb-1',
                'inline-block bg-white/5 text-slate-300 text-[10px] font-bold px-2 py-1 rounded border border-white/10 mr-1 mb-1'
            );

            const score = Number(data.score || 0);
            this.lastAtsScore = score;
            this.updateProgressCounters();
            const resultHeadline = document.getElementById('ats-result-headline');
            const resultSubcopy = document.getElementById('ats-result-subcopy');
            const foundList = document.getElementById('ats-top-found');
            const missingList = document.getElementById('ats-top-missing');
            const suggestionList = document.getElementById('ats-suggestion-list');

            if (resultHeadline) {
                if (score >= 85) resultHeadline.textContent = 'Excellent fit. You are near submission-ready.';
                else if (score >= 65) resultHeadline.textContent = 'Strong base. A few targeted upgrades needed.';
                else resultHeadline.textContent = 'Needs alignment. Add role-specific signals.';
            }

            if (resultSubcopy) {
                resultSubcopy.textContent = `Current ATS score: ${score}. Improve the missing terms and strengthen impact statements to raise match confidence.`;
            }

            const renderInsightList = (container, items, emptyText, bulletClass = 'text-slate-300') => {
                if (!container) return;
                container.innerHTML = '';
                const listItems = (items || []).slice(0, 5);

                if (listItems.length === 0) {
                    const li = document.createElement('li');
                    li.className = 'text-on-surface-variant italic';
                    li.textContent = emptyText;
                    container.appendChild(li);
                    return;
                }

                listItems.forEach(item => {
                    const li = document.createElement('li');
                    li.className = bulletClass;
                    li.textContent = `• ${item}`;
                    container.appendChild(li);
                });
            };

            renderInsightList(foundList, foundKeywords, 'No matched keywords yet.');
            renderInsightList(missingList, missingKeywords, 'No missing keywords detected.');
            renderInsightList(suggestionList, data.suggestions, 'No suggestions were returned.', 'text-on-surface-variant');

            const engineBreakdown = data.engine_breakdown || {};
            const localEngine = engineBreakdown.local || {};
            const apiEngine = engineBreakdown.api || {};

            const localScoreEl = document.getElementById('ats-local-engine-score');
            const localSummaryEl = document.getElementById('ats-local-engine-summary');
            const apiScoreEl = document.getElementById('ats-api-engine-score');
            const apiSummaryEl = document.getElementById('ats-api-engine-summary');

            if (localScoreEl) {
                localScoreEl.textContent = `Score: ${Number(localEngine.score || 0)} (${localEngine.status || 'ok'})`;
            }
            if (localSummaryEl) {
                localSummaryEl.textContent = localEngine.analysis_summary || 'No local engine summary returned.';
            }
            if (apiScoreEl) {
                apiScoreEl.textContent = `Score: ${Number(apiEngine.score || 0)} (${apiEngine.status || 'unavailable'})`;
            }
            if (apiSummaryEl) {
                if (apiEngine.analysis_summary) {
                    apiSummaryEl.textContent = apiEngine.analysis_summary;
                } else if (apiEngine.error) {
                    apiSummaryEl.textContent = `API unavailable: ${apiEngine.error}`;
                } else {
                    apiSummaryEl.textContent = 'No API engine summary returned.';
                }
            }

            // 3. Update 'AI Suggestion' tooltip
            const tooltip = document.getElementById('tooltip-ai-suggestion');
            if (tooltip && data.suggestions && data.suggestions.length > 0) {
                const suggestionText = tooltip.querySelector('p.text-on-surface-variant');
                if (suggestionText) {
                    suggestionText.textContent = data.suggestions[0];
                }
                tooltip.classList.remove('hidden');
            }

            // 4. Show populated ATS results state to avoid an empty workspace.
            const welcomeState = document.getElementById('ats-welcome-state');
            const editState = document.getElementById('ats-edit-state');
            const resultsState = document.getElementById('ats-results-state');
            if (editState) editState.classList.add('hidden');
            if (welcomeState) welcomeState.classList.add('hidden');
            if (resultsState) resultsState.classList.remove('hidden');

            // Optional: update the target role text in the left sidebar
            const sidebarTargetRole = document.querySelector('#ats-sidebar .glass-card p.line-clamp-3');
            if (sidebarTargetRole) {
                const bestEngine = (data.best_engine || 'local').toUpperCase();
                const selectedMode = (data.selected_engine_mode || engineMode).toUpperCase();
                sidebarTargetRole.textContent = `Analysis complete. Mode: ${selectedMode}. Best keyword set selected from ${bestEngine} engine.`;
            }

        } catch (error) {
            console.error('Error during ATS Analysis:', error);
            alert(`Error: ${error.message}`);
        } finally {
            if (analyzeBtn) {
                analyzeBtn.innerHTML = originalBtnText;
                analyzeBtn.disabled = false;
            }
        }
    }

    /**
     * Top-level View Switching (Editor vs ATS Match)
     * Bulletproof Fix: Ensures form sections are hidden in ATS mode.
     */
    setupViewTabs() {
        try {
            const viewTabs = this.elements.viewTabs;
            const editorSidebar = this.elements.aside;
            const editorPanel = this.elements.formPanel;
            const atsSidebar = this.elements.atsSidebar;
            const atsPanel = this.elements.atsPanel;

            if (!viewTabs || viewTabs.length === 0) return;

            // ==========================================
            // 1. Global Tab Navigation Logic
            // ==========================================
            viewTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    try {
                        const view = e.currentTarget.dataset.view;
                        if (!view || view === 'cover-letter') return;

                        // Update global tabs active styling
                        viewTabs.forEach(t => {
                            t.classList.remove('bg-primary', 'text-on-primary', 'shadow-ambient');
                            t.classList.add('text-on-surface-variant');
                        });
                        if (e.currentTarget && e.currentTarget.classList) {
                            e.currentTarget.classList.remove('text-on-surface-variant');
                            e.currentTarget.classList.add('bg-primary', 'text-on-primary', 'shadow-ambient');
                        }

                        // Toggle sidebars and panels visibility SAFELY
                        if (view === 'editor') {
                            if (editorSidebar && editorSidebar.classList) editorSidebar.classList.remove('hidden');
                            if (editorPanel && editorPanel.classList) editorPanel.classList.remove('hidden');
                            
                            if (atsSidebar && atsSidebar.classList) atsSidebar.classList.add('hidden');
                            if (atsPanel && atsPanel.classList) atsPanel.classList.add('hidden');
                            
                            // Show whatever the active editor section was
                            const activeTab = document.querySelector('button[data-section].tab-active');
                            if (activeTab) {
                                const sectionName = activeTab.dataset.section;
                                const sectionEl = document.getElementById(`section-${sectionName}`);
                                if (sectionEl && sectionEl.classList) sectionEl.classList.remove('hidden');
                            }
                            
                            this.hideATSAnimations();
                            
                        } else if (view === 'ats') {
                            if (editorSidebar && editorSidebar.classList) editorSidebar.classList.add('hidden');
                            if (editorPanel && editorPanel.classList) editorPanel.classList.add('hidden');
                            
                            // BULLETPROOF FIX: Forcefully hide every single form section
                            const allFormSections = document.querySelectorAll('.form-section');
                            allFormSections.forEach(section => {
                                if (section && section.classList) section.classList.add('hidden');
                            });
                            
                            if (atsSidebar && atsSidebar.classList) atsSidebar.classList.remove('hidden');
                            if (atsPanel && atsPanel.classList) atsPanel.classList.remove('hidden');
                            
                            this.triggerATSAnimations();
                        }
                    } catch (errInner) {
                        console.error("Error setting up view tab click:", errInner);
                    }
                });
            });
        } catch (errOuter) {
            console.error("Error setting up view tabs globally:", errOuter);
        }
    }

    /**
     * Triggers all ATS Match view animations (Score circle and Markers)
     */
    triggerATSAnimations() {
        this.animateATSScore(75);
        this.renderMarkers();
    }

    /**
     * Hides all floating markers when exiting ATS view
     */
    hideATSAnimations() {
        this.clearMarkers();
    }

    /**
     * Setup left sidebar tab navigation for resume sections.
     * Fixed: Added correct ID matching and explicit section toggling.
     */
    setupTabs() {
        try {
            const btns = this.elements.navButtons;
            const sections = this.elements.sections;

            btns.forEach(btn => {
                btn?.addEventListener('click', () => {
                    try {
                        const targetSectionSlug = btn.getAttribute('data-section');
                        const targetId = `section-${targetSectionSlug}`;

                        // 1. Reset all tabs styling
                        btns.forEach(b => {
                            if (b && b.classList) {
                                b.classList.remove('tab-active', 'text-primary', 'bg-white/5');
                                b.classList.add('text-on-surface-variant');
                            }
                        });

                        // 2. Hide all form sections
                        sections?.forEach(section => {
                            if (section && section.classList) {
                                section.classList.add('hidden');
                            }
                        });

                        // 3. Activate selected tab
                        if (btn && btn.classList) {
                            btn.classList.add('tab-active', 'text-primary', 'bg-white/5');
                            btn.classList.remove('text-on-surface-variant');
                        }

                        // 4. Show targeted section
                        const activeSection = document.getElementById(targetId);
                        if (activeSection && activeSection.classList) {
                            activeSection.classList.remove('hidden');
                            activeSection.classList.add('animate-fade-in');
                        }
                    } catch (errInner) {
                        console.error("Error clicking section tab:", errInner);
                    }
                });
            });
        } catch (errOuter) {
            console.error("Error setting up tabs:", errOuter);
        }
    }

    /**
     * Initialize the live preview engine with debounced data binding.
     */
    setupLivePreview() {
        const updateStore = (keyPath, value) => store.update(keyPath, value);
        const debouncedUpdate = debounce(updateStore, 300);
        
        // Debounced Save Trigger
        const debouncedSave = debounce(this.saveSectionData.bind(this), 1000);

        // Bind all interactive inputs to the global store
        document.querySelectorAll('[data-bind]').forEach(input => {
            input?.addEventListener('input', (e) => {
                const key = input.getAttribute('data-bind');
                if (key) debouncedUpdate(key, e.target.value);
            });
            
            // Explicitly trigger save on blur for extra safety
            input?.addEventListener('blur', (e) => {
                const key = input.getAttribute('data-bind');
                if (key) this.saveSectionData(key);
            });
        });

        // NEW: Function to manually sync all inputs to the preview
        const syncAllToPreview = () => {
            const allInputs = document.querySelectorAll('[data-bind]');
            allInputs.forEach(input => {
                const key = input.getAttribute('data-bind');
                if (key) {
                    // Update state immediately for initial sync
                    updateStore(key, input.value);
                }
            });
        };

        // Trigger initial sync after a small delay to ensure DOM and DB data are ready
        setTimeout(syncAllToPreview, 500);

        // Update preview pane whenever store state changes
        store.subscribe('*', (state, changedPath) => {
            this.renderPreview(state);
            this.updateProgressCounters();
            // Only trigger auto-save if a specific path was changed (ignore initial mass updates)
            if (changedPath) debouncedSave(changedPath);
        });
        
        // Initial sync
        this.renderPreview(store.state);
    }

    /**
     * Mouse-Tracked 3D Tilt Effect
     */
    setup3DTilt() {
        const card = this.elements.previewContainer;
        const markers = this.elements.markersContainer;
        if (!card) return;

        let rafId = null;

        const handleMove = (e) => {
            if (rafId) cancelAnimationFrame(rafId);

            rafId = requestAnimationFrame(() => {
                const rect = card.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = (e.clientX - cx) / (rect.width / 2);
                const dy = (e.clientY - cy) / (rect.height / 2);
                const maxTilt = 6;

                const transform = `perspective(1000px) scale(0.78) rotateX(${-dy * maxTilt}deg) rotateY(${dx * maxTilt}deg) translateZ(12px)`;
                card.style.transform = transform;
                if (markers) markers.style.transform = transform;
            });
        };

        const handleLeave = () => {
            if (rafId) cancelAnimationFrame(rafId);
            const transform = 'perspective(1000px) scale(0.78) rotateX(0deg) rotateY(0deg) translateZ(0px)';
            card.style.transform = transform;
            if (markers) markers.style.transform = transform;
        };

        const parent = card.parentElement;
        if (parent) {
            parent.addEventListener('mousemove', handleMove);
            parent.addEventListener('mouseleave', handleLeave);
        }
    }

    /**
     * Frontend PDF Generation Flow
     */
    setupPdfExport() {
        const btn = this.elements.btnExportPdf;
        const target = this.elements.previewContainer;
        const markers = this.elements.markersContainer;
        
        if (!btn || !target) return;

        btn.addEventListener('click', async () => {
            console.log("Starting PDF Export...");
            
            // 1. UI Feedback
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> Generating...';
            btn.disabled = true;

            // 2. Prepare for snapshot: Hide floating 3D markers and tooltips
            if (markers) markers.style.display = 'none';
            document.querySelectorAll('#tooltip-verified-match, #tooltip-ai-suggestion').forEach(el => el.classList.add('hidden'));

            // 3. Reset 3D tilt and scale for a clean, full-size snapshot
            const originalTransform = target.style.transform;
            const originalBoxShadow = target.style.boxShadow;
            
            target.style.transform = 'perspective(1000px) scale(1.0) rotateX(0deg) rotateY(0deg) translateZ(0px)';
            target.style.boxShadow = 'none';

            // 4. PDF Options
            const opt = {
                margin: 0,
                filename: 'My_AI_Resume.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    letterRendering: true,
                    backgroundColor: '#ffffff'
                },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            try {
                // 5. Generate and Download
                await html2pdf().set(opt).from(target).save();
            } catch (err) {
                console.error("PDF Export failed:", err);
            } finally {
                // 6. Restore UI state
                target.style.transform = originalTransform;
                target.style.boxShadow = originalBoxShadow;
                if (markers) markers.style.display = 'block';
                
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    /**
     * ATS Score Animation
     */
    animateATSScore(target) {
        const circle = this.elements.atsScoreCircle;
        const text = this.elements.atsScoreText;
        if (!text) return;

        if (this.immersive3D) {
            this.immersive3D.triggerScoreSpin(target);
        }

        if (!circle) {
            text.innerText = String(target);
            return;
        }

        const fullDash = 264;
        const offset = fullDash - (target / 100) * fullDash;
        
        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
            
            let current = 0;
            const interval = setInterval(() => {
                if (current >= target) {
                    text.innerText = target;
                    clearInterval(interval);
                } else {
                    current++;
                    text.innerText = current;
                }
            }, 1000 / target);
        }, 300);
    }

    /**
     * Template selector binding
     */
    setupTemplateSelector() {
        const selector = this.elements.templateSelect;
        if (!selector) return;

        selector.value = store.state.template || 'modern';
        selector.addEventListener('change', () => {
            const selected = selector.value || 'modern';
            store.update('template', selected);
            this.renderPreview(store.state);
        });

        store.subscribe('template', (value) => {
            if (selector.value !== value) {
                selector.value = value || 'modern';
            }
        });
    }

    /**
     * Floating Markers logic
     */
    renderMarkers() {
        const container = this.elements.markersContainer;
        if (!container) return;
        
        const markers = [
            { top: '30%', left: '80%', type: 'ai', text: 'AI SUGGESTION: ADD "KUBERNETES"', icon: 'psychology' },
            { top: '15%', left: '15%', type: 'verified', text: 'VERIFIED MATCH', icon: 'verified' }
        ];

        container.innerHTML = markers.map(m => `
            <div class="floating-marker marker-${m.type} flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black text-white" style="top: ${m.top}; left: ${m.left}; transform: translateZ(50px);">
                <span class="material-symbols-outlined text-[14px]">${m.icon}</span>
                <span class="tracking-widest uppercase">${m.text}</span>
            </div>
        `).join('');
    }

    clearMarkers() {
        const container = this.elements.markersContainer;
        if (container) container.innerHTML = '';
    }

    /**
     * Helper to set initial values
     */
    bindInitialState() {
        const state = store.state;
        document.querySelectorAll('[data-bind]').forEach(input => {
            const dataBind = input.getAttribute('data-bind');
            if (!dataBind) return;

            const path = dataBind.split('.');
            let val = state;
            for (const key of path) {
                if (val && val[key] !== undefined) val = val[key];
                else { val = ''; break; }
            }
            input.value = val;
        });
    }

    /**
     * Preview Rendering Engine
     */
    renderPreview(state) {
        const container = this.elements.previewContainer;
        if (!container) return;
        const template = state.template || 'modern';

        const skillsArr = state.skillsString ? state.skillsString.split(',').map(s => s.trim()).filter(s => s) : [];
        const skillsHtml = skillsArr
            .map(s => `<span class="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700 mr-1 mb-1">${s}</span>`)
            .join('');

        const contactParts = [
            state.personal?.location,
            state.personal?.email,
            state.personal?.linkedin,
        ].filter(Boolean);

        const summaryBlock = state.summary ? `
            <section class="space-y-2">
                <div class="flex items-center gap-2">
                    <span class="h-px flex-1 bg-slate-200"></span>
                    <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Summary</span>
                    <span class="h-px flex-1 bg-slate-200"></span>
                </div>
                <p class="text-[12px] leading-7 text-slate-700 text-pretty">${state.summary}</p>
            </section>
        ` : '';

        const experienceBlock = state.experience?.length ? `
            <section class="space-y-4">
                <div class="flex items-center gap-2">
                    <span class="h-px flex-1 bg-slate-200"></span>
                    <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Experience</span>
                    <span class="h-px flex-1 bg-slate-200"></span>
                </div>
                <div class="space-y-4">
                    ${state.experience.map(exp => `
                        <div class="space-y-1.5">
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <h3 class="text-sm font-bold text-slate-900">${exp.companyName || 'Company'}</h3>
                                    <p class="text-[11px] italic text-slate-600">${exp.role || 'Role'}</p>
                                </div>
                                <span class="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">${exp.startDate || ''} — ${exp.endDate || 'Present'}</span>
                            </div>
                            ${exp.description ? `<p class="text-[11px] leading-6 text-slate-700 whitespace-pre-wrap text-pretty">${exp.description}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </section>
        ` : '';

        const educationBlock = state.education?.length ? `
            <section class="space-y-4">
                <div class="flex items-center gap-2">
                    <span class="h-px flex-1 bg-slate-200"></span>
                    <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Education</span>
                    <span class="h-px flex-1 bg-slate-200"></span>
                </div>
                <div class="space-y-3">
                    ${state.education.map(edu => `
                        <div class="space-y-1">
                            <div class="flex items-start justify-between gap-4">
                                <h3 class="text-sm font-bold text-slate-900">${edu.school || 'Institution'}</h3>
                                <span class="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">${edu.startYear || ''} — ${edu.endYear || ''}</span>
                            </div>
                            ${edu.degree ? `<p class="text-[11px] italic text-slate-600">${edu.degree}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </section>
        ` : '';

        const skillsBlock = skillsHtml ? `
            <section class="space-y-4">
                <div class="flex items-center gap-2">
                    <span class="h-px flex-1 bg-slate-200"></span>
                    <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Skills</span>
                    <span class="h-px flex-1 bg-slate-200"></span>
                </div>
                <div class="flex flex-wrap">${skillsHtml}</div>
            </section>
        ` : '';

        const projectsBlock = state.projects?.length && state.projects.some(p => (p?.title || '').trim()) ? `
            <section class="space-y-4">
                <div class="flex items-center gap-2">
                    <span class="h-px flex-1 bg-slate-200"></span>
                    <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Projects</span>
                    <span class="h-px flex-1 bg-slate-200"></span>
                </div>
                <div class="space-y-4">
                    ${state.projects.filter(p => (p?.title || '').trim()).map(proj => `
                        <div class="space-y-1.5">
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <h3 class="text-sm font-bold text-slate-900">${proj.title}</h3>
                                    ${proj.techStack ? `<p class="text-[10px] font-medium text-slate-500 uppercase tracking-[0.12em]">${proj.techStack}</p>` : ''}
                                </div>
                                ${proj.createdDate ? `<span class="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">${proj.createdDate}</span>` : ''}
                            </div>
                            ${proj.description ? `<p class="text-[11px] leading-6 text-slate-700 whitespace-pre-wrap text-pretty">${proj.description}</p>` : ''}
                            ${(proj.githubLink || proj.demoLink) ? `
                                <div class="flex gap-3 text-[10px] text-slate-500">
                                    ${proj.githubLink ? `<a href="${proj.githubLink}" class="underline">GitHub</a>` : ''}
                                    ${proj.demoLink ? `<a href="${proj.demoLink}" class="underline">Demo</a>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </section>
        ` : '';

        const certificationsBlock = state.certifications?.length && state.certifications.some(c => (c?.name || '').trim()) ? `
            <section class="space-y-4">
                <div class="flex items-center gap-2">
                    <span class="h-px flex-1 bg-slate-200"></span>
                    <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Certifications</span>
                    <span class="h-px flex-1 bg-slate-200"></span>
                </div>
                <div class="space-y-3">
                    ${state.certifications.filter(c => (c?.name || '').trim()).map(cert => `
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <h3 class="text-sm font-bold text-slate-900">${cert.name}</h3>
                                ${cert.issuingOrganization ? `<p class="text-[11px] italic text-slate-600">${cert.issuingOrganization}</p>` : ''}
                            </div>
                            ${cert.issueDate ? `<span class="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">${cert.issueDate}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </section>
        ` : '';

        const contactHtml = contactParts.length ? `
            <div class="mt-3 flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                ${contactParts.map(part => `<span>${part}</span>`).join('<span class="text-slate-300">·</span>')}
            </div>
        ` : '';

        if (template === 'classic') {
            container.innerHTML = `
                <div class="space-y-7">
                    <header class="pb-6 border-b-2 border-slate-300/80 text-center">
                        <h1 class="text-3xl font-bold tracking-wide text-slate-900 uppercase">${state.personal?.fullName || 'Your Name'}</h1>
                        ${contactHtml}
                    </header>
                    ${summaryBlock}
                    ${experienceBlock}
                    ${projectsBlock}
                    ${educationBlock}
                    ${skillsBlock}
                    ${certificationsBlock}
                </div>
            `;
            return;
        }

        if (template === 'compact') {
            container.innerHTML = `
                <div class="space-y-5">
                    <header class="pb-4 border-b border-slate-300/90">
                        <div class="flex items-end justify-between gap-4">
                            <h1 class="text-3xl font-extrabold tracking-tight text-slate-900">${state.personal?.fullName || 'Your Name'}</h1>
                            <span class="text-[9px] uppercase tracking-[0.24em] text-slate-500">Compact Profile</span>
                        </div>
                        ${contactHtml}
                    </header>
                    ${summaryBlock}
                    ${skillsBlock}
                    ${experienceBlock}
                    ${projectsBlock}
                    ${educationBlock}
                    ${certificationsBlock}
                </div>
            `;
            return;
        }

        if (template === 'minimal') {
            container.innerHTML = `
                <div class="space-y-6 text-slate-900">
                    <header class="space-y-2">
                        <h1 class="text-4xl font-light tracking-tight">${state.personal?.fullName || 'Your Name'}</h1>
                        ${contactHtml}
                    </header>
                    <div class="h-px bg-slate-200"></div>
                    ${summaryBlock}
                    ${experienceBlock}
                    ${projectsBlock}
                    ${skillsBlock}
                    ${educationBlock}
                    ${certificationsBlock}
                </div>
            `;
            return;
        }

        if (template === 'executive') {
            container.innerHTML = `
                <div class="space-y-6">
                    <header class="rounded-2xl bg-slate-900 px-6 py-5 text-white">
                        <p class="text-[10px] uppercase tracking-[0.32em] text-slate-300 mb-1">Executive Resume</p>
                        <h1 class="text-3xl font-semibold tracking-tight">${state.personal?.fullName || 'Your Name'}</h1>
                        <div class="text-[10px] uppercase tracking-[0.18em] text-slate-300 mt-2">${contactParts.join(' · ') || 'Location · Email · LinkedIn'}</div>
                    </header>
                    ${summaryBlock}
                    ${experienceBlock}
                    ${projectsBlock}
                    ${educationBlock}
                    ${skillsBlock}
                    ${certificationsBlock}
                </div>
            `;
            return;
        }

        if (template === 'noir') {
            container.innerHTML = `
                <div class="space-y-6 bg-slate-950 text-slate-100 rounded-2xl p-8 -m-6">
                    <header class="border-b border-slate-700 pb-5">
                        <h1 class="text-4xl font-extrabold tracking-[0.03em] text-white">${state.personal?.fullName || 'Your Name'}</h1>
                        <p class="text-[10px] mt-2 uppercase tracking-[0.2em] text-slate-400">${contactParts.join(' · ') || 'Location · Email · LinkedIn'}</p>
                    </header>
                    ${summaryBlock.replace(/text-slate-700/g, 'text-slate-300').replace(/text-slate-500/g, 'text-slate-400').replace(/bg-slate-200/g, 'bg-slate-700')}
                    ${experienceBlock.replace(/text-slate-700/g, 'text-slate-300').replace(/text-slate-900/g, 'text-white').replace(/text-slate-600/g, 'text-slate-400').replace(/text-slate-500/g, 'text-slate-500').replace(/bg-slate-200/g, 'bg-slate-700')}
                    ${projectsBlock.replace(/text-slate-700/g, 'text-slate-300').replace(/text-slate-900/g, 'text-white').replace(/text-slate-600/g, 'text-slate-400').replace(/text-slate-500/g, 'text-slate-500').replace(/bg-slate-200/g, 'bg-slate-700')}
                    ${educationBlock.replace(/text-slate-900/g, 'text-white').replace(/text-slate-600/g, 'text-slate-400').replace(/text-slate-500/g, 'text-slate-500').replace(/bg-slate-200/g, 'bg-slate-700')}
                    ${skillsBlock.replace(/bg-slate-100/g, 'bg-slate-800').replace(/text-slate-700/g, 'text-slate-200').replace(/border-slate-300/g, 'border-slate-600').replace(/text-slate-500/g, 'text-slate-400').replace(/bg-slate-200/g, 'bg-slate-700')}
                    ${certificationsBlock.replace(/text-slate-900/g, 'text-white').replace(/text-slate-600/g, 'text-slate-400').replace(/text-slate-500/g, 'text-slate-500').replace(/bg-slate-200/g, 'bg-slate-700')}
                </div>
            `;
            return;
        }

        if (template === 'aurora') {
            container.innerHTML = `
                <div class="space-y-6">
                    <header class="relative overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 px-6 py-6">
                        <h1 class="text-4xl font-semibold text-slate-900">${state.personal?.fullName || 'Your Name'}</h1>
                        <p class="mt-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">${contactParts.join(' · ') || 'Location · Email · LinkedIn'}</p>
                    </header>
                    ${summaryBlock}
                    ${skillsBlock}
                    ${experienceBlock}
                    ${projectsBlock}
                    ${educationBlock}
                    ${certificationsBlock}
                </div>
            `;
            return;
        }

        if (template === 'timeline') {
            const timelineExp = state.experience?.length ? `
                <section class="space-y-4">
                    <h2 class="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Experience Timeline</h2>
                    <div class="space-y-4 border-l-2 border-slate-200 pl-4">
                        ${state.experience.map(exp => `
                            <article class="relative">
                                <span class="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-slate-900"></span>
                                <p class="text-[10px] uppercase tracking-[0.18em] text-slate-500">${exp.startDate || ''} — ${exp.endDate || 'Present'}</p>
                                <h3 class="text-sm font-bold text-slate-900">${exp.role || 'Role'} · ${exp.companyName || 'Company'}</h3>
                                ${exp.description ? `<p class="text-[11px] mt-1 leading-6 text-slate-700">${exp.description}</p>` : ''}
                            </article>
                        `).join('')}
                    </div>
                </section>
            ` : '';

            container.innerHTML = `
                <div class="space-y-6">
                    <header>
                        <h1 class="text-4xl font-bold tracking-tight text-slate-900">${state.personal?.fullName || 'Your Name'}</h1>
                        ${contactHtml}
                    </header>
                    ${summaryBlock}
                    ${timelineExp}
                    ${projectsBlock}
                    ${skillsBlock}
                    ${educationBlock}
                    ${certificationsBlock}
                </div>
            `;
            return;
        }

        if (template === 'split') {
            container.innerHTML = `
                <div class="grid grid-cols-3 gap-6">
                    <aside class="col-span-1 rounded-2xl bg-slate-100 p-4 space-y-5">
                        <h1 class="text-2xl font-bold leading-tight text-slate-900">${state.personal?.fullName || 'Your Name'}</h1>
                        <div class="text-[10px] uppercase tracking-[0.14em] text-slate-500">${contactParts.join(' · ') || 'Location · Email · LinkedIn'}</div>
                        ${skillsBlock}
                        ${educationBlock}
                        ${certificationsBlock}
                    </aside>
                    <main class="col-span-2 space-y-6">
                        ${summaryBlock}
                        ${experienceBlock}
                        ${projectsBlock}
                    </main>
                </div>
            `;
            return;
        }

        if (template === 'mono') {
            container.innerHTML = `
                <div class="space-y-6 font-mono">
                    <header class="border-2 border-black p-4">
                        <h1 class="text-3xl font-bold tracking-tight text-black">${state.personal?.fullName || 'Your Name'}</h1>
                        <p class="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-700">${contactParts.join(' | ') || 'Location | Email | LinkedIn'}</p>
                    </header>
                    ${summaryBlock}
                    ${experienceBlock}
                    ${projectsBlock}
                    ${skillsBlock}
                    ${educationBlock}
                    ${certificationsBlock}
                </div>
            `;
            return;
        }

        if (template === 'skyline') {
            container.innerHTML = `
                <div class="space-y-6">
                    <header class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 to-slate-800 p-6 text-white">
                        <p class="text-[10px] uppercase tracking-[0.26em] text-blue-200">Skyline</p>
                        <h1 class="text-4xl font-semibold">${state.personal?.fullName || 'Your Name'}</h1>
                        <p class="mt-2 text-[10px] uppercase tracking-[0.18em] text-slate-300">${contactParts.join(' · ') || 'Location · Email · LinkedIn'}</p>
                    </header>
                    ${summaryBlock}
                    ${experienceBlock}
                    ${projectsBlock}
                    ${educationBlock}
                    ${skillsBlock}
                    ${certificationsBlock}
                </div>
            `;
            return;
        }

        if (template === 'matrix') {
            container.innerHTML = `
                <div class="space-y-6 bg-black text-emerald-300 rounded-2xl p-7 -m-5">
                    <header class="border border-emerald-600/50 p-4">
                        <h1 class="text-3xl font-bold tracking-tight">${state.personal?.fullName || 'Your Name'}</h1>
                        <p class="text-[10px] mt-2 uppercase tracking-[0.16em] text-emerald-400">${contactParts.join(' // ') || 'Location // Email // LinkedIn'}</p>
                    </header>
                    ${summaryBlock.replace(/text-slate-700/g, 'text-emerald-300').replace(/text-slate-500/g, 'text-emerald-500').replace(/bg-slate-200/g, 'bg-emerald-700')}
                    ${experienceBlock.replace(/text-slate-700/g, 'text-emerald-300').replace(/text-slate-900/g, 'text-emerald-200').replace(/text-slate-600/g, 'text-emerald-500').replace(/text-slate-500/g, 'text-emerald-500').replace(/bg-slate-200/g, 'bg-emerald-700')}
                    ${projectsBlock.replace(/text-slate-700/g, 'text-emerald-300').replace(/text-slate-900/g, 'text-emerald-200').replace(/text-slate-600/g, 'text-emerald-500').replace(/text-slate-500/g, 'text-emerald-500').replace(/bg-slate-200/g, 'bg-emerald-700')}
                    ${skillsBlock.replace(/bg-slate-100/g, 'bg-emerald-900').replace(/text-slate-700/g, 'text-emerald-200').replace(/border-slate-300/g, 'border-emerald-700').replace(/text-slate-500/g, 'text-emerald-500').replace(/bg-slate-200/g, 'bg-emerald-700')}
                    ${educationBlock.replace(/text-slate-900/g, 'text-emerald-200').replace(/text-slate-600/g, 'text-emerald-500').replace(/text-slate-500/g, 'text-emerald-500').replace(/bg-slate-200/g, 'bg-emerald-700')}
                    ${certificationsBlock.replace(/text-slate-900/g, 'text-emerald-200').replace(/text-slate-600/g, 'text-emerald-500').replace(/text-slate-500/g, 'text-emerald-500').replace(/bg-slate-200/g, 'bg-emerald-700')}
                </div>
            `;
            return;
        }

        if (template === 'paperclip') {
            container.innerHTML = `
                <div class="space-y-6 rotate-[-0.3deg]">
                    <header class="relative border-2 border-slate-300 rounded-xl p-5 bg-[#fffdf7]">
                        <span class="absolute right-4 -top-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">Pinned</span>
                        <h1 class="text-3xl font-semibold text-slate-900">${state.personal?.fullName || 'Your Name'}</h1>
                        ${contactHtml}
                    </header>
                    ${summaryBlock}
                    ${experienceBlock}
                    ${projectsBlock}
                    ${educationBlock}
                    ${skillsBlock}
                    ${certificationsBlock}
                </div>
            `;
            return;
        }

        if (template === 'zen') {
            container.innerHTML = `
                <div class="space-y-8">
                    <header class="text-center space-y-3">
                        <h1 class="text-4xl font-light tracking-[0.06em] text-slate-900">${state.personal?.fullName || 'Your Name'}</h1>
                        <div class="h-px w-24 mx-auto bg-slate-300"></div>
                        <p class="text-[10px] uppercase tracking-[0.2em] text-slate-500">${contactParts.join(' · ') || 'Location · Email · LinkedIn'}</p>
                    </header>
                    ${summaryBlock}
                    ${experienceBlock}
                    ${projectsBlock}
                    ${skillsBlock}
                    ${educationBlock}
                    ${certificationsBlock}
                </div>
            `;
            return;
        }

        if (template === 'neon') {
            container.innerHTML = `
                <div class="space-y-6 bg-slate-950 text-fuchsia-200 rounded-2xl p-8 -m-6">
                    <header class="rounded-xl border border-fuchsia-400/40 p-5">
                        <h1 class="text-4xl font-bold tracking-tight text-fuchsia-300">${state.personal?.fullName || 'Your Name'}</h1>
                        <p class="mt-2 text-[10px] uppercase tracking-[0.18em] text-fuchsia-200">${contactParts.join(' • ') || 'Location • Email • LinkedIn'}</p>
                    </header>
                    ${summaryBlock.replace(/text-slate-700/g, 'text-fuchsia-100').replace(/text-slate-500/g, 'text-fuchsia-300').replace(/bg-slate-200/g, 'bg-fuchsia-500')}
                    ${experienceBlock.replace(/text-slate-700/g, 'text-fuchsia-100').replace(/text-slate-900/g, 'text-fuchsia-200').replace(/text-slate-600/g, 'text-fuchsia-300').replace(/text-slate-500/g, 'text-fuchsia-300').replace(/bg-slate-200/g, 'bg-fuchsia-500')}
                    ${projectsBlock.replace(/text-slate-700/g, 'text-fuchsia-100').replace(/text-slate-900/g, 'text-fuchsia-200').replace(/text-slate-600/g, 'text-fuchsia-300').replace(/text-slate-500/g, 'text-fuchsia-300').replace(/bg-slate-200/g, 'bg-fuchsia-500')}
                    ${skillsBlock.replace(/bg-slate-100/g, 'bg-fuchsia-900').replace(/text-slate-700/g, 'text-fuchsia-100').replace(/border-slate-300/g, 'border-fuchsia-700').replace(/text-slate-500/g, 'text-fuchsia-300').replace(/bg-slate-200/g, 'bg-fuchsia-500')}
                    ${educationBlock.replace(/text-slate-900/g, 'text-fuchsia-200').replace(/text-slate-600/g, 'text-fuchsia-300').replace(/text-slate-500/g, 'text-fuchsia-300').replace(/bg-slate-200/g, 'bg-fuchsia-500')}
                    ${certificationsBlock.replace(/text-slate-900/g, 'text-fuchsia-200').replace(/text-slate-600/g, 'text-fuchsia-300').replace(/text-slate-500/g, 'text-fuchsia-300').replace(/bg-slate-200/g, 'bg-fuchsia-500')}
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-8">
                <header class="pb-8 border-b border-slate-200/70">
                    <p class="text-[10px] uppercase tracking-[0.32em] text-slate-500 mb-2">Resume Atelier</p>
                    <div class="flex items-start justify-between gap-6">
                        <div>
                            <h1 class="text-4xl font-semibold tracking-tight text-slate-900">${state.personal?.fullName || 'Your Name'}</h1>
                            ${contactHtml}
                        </div>
                        <div class="max-w-[150px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-5 text-slate-500">
                            Built for ATS clarity, readable hierarchy, and clean export.
                        </div>
                    </div>
                </header>

                ${summaryBlock}
                ${experienceBlock}
                ${projectsBlock}
                ${educationBlock}
                ${skillsBlock}
                ${certificationsBlock}
            </div>
        `;
    }
};

} catch (e) {
    console.error('Editor boot error:', e);
}

export { Editor };
