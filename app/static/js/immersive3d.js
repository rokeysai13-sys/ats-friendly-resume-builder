import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

const hasGSAP = typeof window !== 'undefined' && window.gsap;

if (hasGSAP && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
}

export class ImmersiveScene3D {
    constructor(options = {}) {
        this.bgHostId = options.bgHostId || 'threejs-bg';
        this.torusHostId = options.torusHostId || 'ats-score-3d';
        this.scoreTextId = options.scoreTextId || 'ats-score-text';
        this.depthSelectors = options.depthSelectors || ['#editor-form-panel', '#ats-panel'];

        this.bg = {
            host: null,
            renderer: null,
            scene: null,
            camera: null,
            stars: null,
            grid: null,
            frame: null,
            mouse: { x: 0, y: 0 },
            currentMouse: { x: 0, y: 0 }
        };

        this.torus = {
            host: null,
            renderer: null,
            scene: null,
            camera: null,
            mesh: null,
            glowLight: null,
            frame: null
        };

        this.boundResize = this.onResize.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.reflectivePanels = [];
    }

    init() {
        this.initBackgroundScene();
        this.initScoreTorus();
        this.initDepthScroll();
        this.initPanelReflections();

        window.addEventListener('resize', this.boundResize);
        window.addEventListener('mousemove', this.boundMouseMove, { passive: true });
    }

    initPanelReflections() {
        this.reflectivePanels = [
            document.querySelector('#sidebar-root'),
            document.querySelector('#editor-form-panel'),
            document.querySelector('#ats-panel')
        ].filter(Boolean);
    }

    initBackgroundScene() {
        const host = document.getElementById(this.bgHostId);
        if (!host) return;

        this.bg.host = host;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x05070b, 0.022);

        const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1200);
        camera.position.set(0, 0, 110);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        host.appendChild(renderer.domElement);

        const stars = this.createStarfield();
        const grid = this.createObsidianGrid();

        scene.add(stars);
        scene.add(grid);

        const rimLight = new THREE.DirectionalLight(0x35d4ff, 0.22);
        rimLight.position.set(20, 25, 40);
        scene.add(rimLight);

        this.bg.renderer = renderer;
        this.bg.scene = scene;
        this.bg.camera = camera;
        this.bg.stars = stars;
        this.bg.grid = grid;

        const animate = () => {
            this.bg.currentMouse.x += (this.bg.mouse.x - this.bg.currentMouse.x) * 0.045;
            this.bg.currentMouse.y += (this.bg.mouse.y - this.bg.currentMouse.y) * 0.045;

            camera.position.x = this.bg.currentMouse.x * 7;
            camera.position.y = -this.bg.currentMouse.y * 4;
            camera.lookAt(0, 0, 0);

            stars.rotation.y += 0.0007;
            stars.rotation.x += 0.0002;

            grid.rotation.z += 0.00015;
            grid.position.x = this.bg.currentMouse.x * 2;
            grid.position.y = -10 + this.bg.currentMouse.y;

            renderer.render(scene, camera);
            this.bg.frame = requestAnimationFrame(animate);
        };

        animate();
    }

    createStarfield() {
        const starCount = 1600;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        const base = new THREE.Color(0x9bdcff);
        const accent = new THREE.Color(0x4fd6c8);

        for (let i = 0; i < starCount; i += 1) {
            const i3 = i * 3;
            const radius = 240 + Math.random() * 460;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.cos(phi);
            positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

            const blend = Math.random();
            const color = base.clone().lerp(accent, blend);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 1.45,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        return new THREE.Points(geometry, material);
    }

    createObsidianGrid() {
        const group = new THREE.Group();
        const grid = new THREE.GridHelper(500, 48, 0x1c3a4a, 0x0a1a24);
        grid.position.set(0, -28, -60);
        grid.material.opacity = 0.38;
        grid.material.transparent = true;

        const secondary = new THREE.GridHelper(500, 16, 0x2a6075, 0x0e1d2a);
        secondary.position.set(0, -31, -65);
        secondary.material.opacity = 0.2;
        secondary.material.transparent = true;

        group.add(grid);
        group.add(secondary);
        return group;
    }

    initScoreTorus() {
        const host = document.getElementById(this.torusHostId);
        if (!host) return;

        this.torus.host = host;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
        camera.position.set(0, 0, 5.6);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(host.clientWidth || 112, host.clientHeight || 112);
        renderer.setClearColor(0x000000, 0);
        host.appendChild(renderer.domElement);

        const geometry = new THREE.TorusGeometry(1.45, 0.34, 36, 140);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x123046,
            emissive: 0x0f8bb8,
            emissiveIntensity: 0.28,
            metalness: 0.68,
            roughness: 0.22,
            clearcoat: 1,
            clearcoatRoughness: 0.08,
            transmission: 0.08,
            ior: 1.52
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = 0.72;
        mesh.rotation.y = 0.48;
        scene.add(mesh);

        const ambientLight = new THREE.AmbientLight(0x7dd3fc, 0.4);
        const keyLight = new THREE.PointLight(0x22d3ee, 1.05, 20);
        keyLight.position.set(2.5, 3, 4);

        const glowLight = new THREE.PointLight(0x22d3ee, 0.2, 12);
        glowLight.position.set(-2.5, -1.2, 3);

        scene.add(ambientLight);
        scene.add(keyLight);
        scene.add(glowLight);

        this.torus.scene = scene;
        this.torus.camera = camera;
        this.torus.renderer = renderer;
        this.torus.mesh = mesh;
        this.torus.glowLight = glowLight;

        const animate = () => {
            mesh.rotation.y += 0.01;
            mesh.rotation.z += 0.0025;

            renderer.render(scene, camera);
            this.torus.frame = requestAnimationFrame(animate);
        };

        animate();
    }

    initDepthScroll() {
        // Depth scroll transforms are intentionally disabled because they can
        // misalign and clip form content on certain viewport/GPU combinations.
        return;
    }

    updateScoreLabel(score) {
        const label = document.getElementById(this.scoreTextId);
        if (!label) return;

        const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
        label.textContent = String(Math.round(safeScore));
    }

    triggerScoreSpin(score = 0) {
        this.updateScoreLabel(score);

        if (!this.torus.mesh) return;

        const mesh = this.torus.mesh;
        const glowLight = this.torus.glowLight;
        const material = mesh.material;
        const scoreNorm = Math.max(0, Math.min(1, (Number(score) || 0) / 100));

        if (hasGSAP) {
            const timeline = window.gsap.timeline();
            timeline
                .to(mesh.rotation, { y: mesh.rotation.y + (Math.PI * 2.4), x: mesh.rotation.x + 0.7, duration: 1.1, ease: 'power3.out' })
                .to(mesh.rotation, { y: mesh.rotation.y + (Math.PI * 0.35), duration: 0.5, ease: 'power1.out' }, '-=0.25');

            timeline
                .to(material, { emissiveIntensity: 1.2 + scoreNorm * 0.7, duration: 0.32, ease: 'sine.out' }, 0)
                .to(glowLight, { intensity: 1.85, duration: 0.32, ease: 'sine.out' }, 0)
                .to(material, { emissiveIntensity: 0.34 + scoreNorm * 0.45, duration: 0.9, ease: 'sine.inOut' })
                .to(glowLight, { intensity: 0.28, duration: 0.9, ease: 'sine.inOut' }, '<');

            return;
        }

        mesh.rotation.y += Math.PI * 1.6;
        material.emissiveIntensity = 0.8;
        glowLight.intensity = 1.1;
        setTimeout(() => {
            material.emissiveIntensity = 0.35 + scoreNorm * 0.4;
            glowLight.intensity = 0.28;
        }, 640);
    }

    onMouseMove(event) {
        this.bg.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.bg.mouse.y = (event.clientY / window.innerHeight) * 2 - 1;

        if (this.reflectivePanels.length > 0) {
            const xPercent = (event.clientX / window.innerWidth) * 100;
            const yPercent = (event.clientY / window.innerHeight) * 100;
            const tiltX = ((50 - yPercent) / 50) * 1.15;
            const tiltY = ((xPercent - 50) / 50) * 1.65;

            this.reflectivePanels.forEach((panel) => {
                panel.style.setProperty('--light-x', `${xPercent}%`);
                panel.style.setProperty('--light-y', `${yPercent}%`);
                panel.style.setProperty('--tilt-x', `${tiltX.toFixed(3)}deg`);
                panel.style.setProperty('--tilt-y', `${tiltY.toFixed(3)}deg`);
            });
        }
    }

    onResize() {
        if (this.bg.renderer && this.bg.camera) {
            this.bg.camera.aspect = window.innerWidth / window.innerHeight;
            this.bg.camera.updateProjectionMatrix();
            this.bg.renderer.setSize(window.innerWidth, window.innerHeight);
        }

        if (this.torus.renderer && this.torus.camera && this.torus.host) {
            const size = Math.max(this.torus.host.clientWidth, 80);
            this.torus.renderer.setSize(size, size);
            this.torus.camera.aspect = 1;
            this.torus.camera.updateProjectionMatrix();
        }
    }
}
