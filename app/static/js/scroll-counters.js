(function () {
    const selector = '[data-counter-target]';
    const animated = new WeakSet();
    const observed = new WeakSet();

    const detectDefaultDuration = () => {
        const path = (window.location.pathname || '').toLowerCase();

        if (path === '/' || path.includes('landing') || path.includes('home')) {
            return 1300;
        }

        if (path.includes('/login') || path.includes('/register') || path.includes('/signup') || path.includes('/signin')) {
            return 550;
        }

        if (path.includes('/editor')) {
            return 820;
        }

        if (path.includes('/dashboard')) {
            return 950;
        }

        return 900;
    };

    const runtimeConfig = window.ScrollCounterConfig || {};
    const defaultDuration = Number.isFinite(Number(runtimeConfig.defaultDuration))
        ? Number(runtimeConfig.defaultDuration)
        : detectDefaultDuration();

    const parseNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };

    const formatNumber = (value, decimals, locale) => {
        const options = {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        };
        return new Intl.NumberFormat(locale || undefined, options).format(value);
    };

    const formatValue = (value, decimals, prefix, suffix, locale) => {
        const normalized = decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value);
        const formatted = formatNumber(normalized, decimals, locale);
        return `${prefix}${formatted}${suffix}`;
    };

    const getCounterOptions = (node) => {
        const target = parseNumber(node.dataset.counterTarget);
        const start = parseNumber(node.dataset.counterStart || '0');
        const duration = Math.max(parseNumber(node.dataset.counterDuration || String(defaultDuration)), 150);
        const decimals = Number.isInteger(Number(node.dataset.counterDecimals))
            ? Number(node.dataset.counterDecimals)
            : (String(target).includes('.') ? 1 : 0);
        const prefix = node.dataset.counterPrefix || '';
        const suffix = node.dataset.counterSuffix || '';
        const locale = node.dataset.counterLocale || runtimeConfig.locale;

        return { target, start, duration, decimals, prefix, suffix, locale };
    };

    const animateCounter = (node) => {
        if (!node || animated.has(node)) return;

        const {
            target,
            start,
            duration,
            decimals,
            prefix,
            suffix,
            locale,
        } = getCounterOptions(node);

        animated.add(node);

        if (target === start) {
            node.textContent = formatValue(target, decimals, prefix, suffix, locale);
            node.setAttribute('aria-label', `Counter value ${target}`);
            return;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            node.textContent = formatValue(target, decimals, prefix, suffix, locale);
            node.setAttribute('aria-label', `Counter value ${target}`);
            return;
        }

        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = start + (target - start) * eased;
            node.textContent = formatValue(value, decimals, prefix, suffix, locale);

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                node.textContent = formatValue(target, decimals, prefix, suffix, locale);
                node.setAttribute('aria-label', `Counter value ${target}`);
            }
        };

        requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.3, rootMargin: '0px 0px -8% 0px' }
    );

    const registerCounters = (root) => {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll(selector).forEach((node) => {
            if (!animated.has(node) && !observed.has(node)) {
                observer.observe(node);
                observed.add(node);
            }
        });
    };

    const domWatcher = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((added) => {
                if (!(added instanceof Element)) return;
                if (added.matches(selector)) {
                    registerCounters(added.parentElement || document);
                } else if (added.querySelector(selector)) {
                    registerCounters(added);
                }
            });
        });
    });

    window.ScrollCounterAnimator = {
        refresh(root) {
            registerCounters(root || document);
        },
        reset(node) {
            if (!node) return;
            animated.delete(node);
            observed.delete(node);
            observer.observe(node);
            observed.add(node);
        },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            registerCounters(document);
            domWatcher.observe(document.body, { childList: true, subtree: true });
        });
    } else {
        registerCounters(document);
        domWatcher.observe(document.body, { childList: true, subtree: true });
    }
})();
