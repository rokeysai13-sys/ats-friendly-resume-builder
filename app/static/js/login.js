async function login(form) {
    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector('input[type="password"]');
    
    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value || '';
    
    if (!email) {
        throw new Error('Email is required');
    }
    if (!password) {
        throw new Error('Password is required');
    }

    const response = await fetch(form.action, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: new FormData(form)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.message || payload.error || 'Login failed');
    }

    return payload;
}

function setBusy(button, isBusy) {
    button.disabled = isBusy;
    button.textContent = isBusy ? 'Signing In...' : 'Sign In';
}

async function submitLogin() {
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const status = document.getElementById('login-status');
    const button = document.getElementById('btn-do-login');

    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value || '';

    if (!email || !password) {
        if (status) status.textContent = 'Please enter your email and password.';
        return;
    }

    try {
        setBusy(button, true);
        if (status) status.textContent = 'Authenticating...';
        const payload = await login(form);
        if (status) status.textContent = 'Success. Redirecting...';
        window.location.href = payload.redirect || '/editor';
    } catch (error) {
        if (status) status.textContent = error.message || 'Unable to sign in.';
    } finally {
        setBusy(button, false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const button = document.getElementById('btn-do-login');

    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            submitLogin();
        });
    } else if (button) {
        button.addEventListener('click', submitLogin);
    }
});
