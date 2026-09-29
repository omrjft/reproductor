/**
 * Sonora - Authentication & Preferences Service (Phase 5)
 * Manages JWT tokens, Login/Register modals, and user preference persistence in localStorage & backend API.
 */

const AUTH_CONFIG = {
  TOKEN_KEY: 'sonora_auth_token',
  USER_KEY: 'sonora_user_info'
};

const AuthService = {
  token: localStorage.getItem(AUTH_CONFIG.TOKEN_KEY) || null,
  user: JSON.parse(localStorage.getItem(AUTH_CONFIG.USER_KEY) || 'null'),

  isAuthenticated() {
    return !!this.token;
  },

  async register(email, password) {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al registrar usuario.');
    }

    this.saveSession(data.token, data.user);
    return data;
  },

  async login(email, password) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al iniciar sesión.');
    }

    this.saveSession(data.token, data.user);
    return data;
  },

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    AuthUI.renderAuthState();
  },

  saveSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
    localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
    AuthUI.renderAuthState();
  },

  async getPreferences() {
    if (!this.isAuthenticated()) return null;

    try {
      const response = await fetch('/api/preferences', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.logout();
        }
        return null;
      }

      const data = await response.json();
      return data.preferences;
    } catch (e) {
      console.warn('Could not load preferences from backend:', e);
      return null;
    }
  },

  async savePreferences(prefs) {
    if (!this.isAuthenticated()) return;

    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(prefs)
      });
    } catch (e) {
      console.warn('Could not save preferences to backend:', e);
    }
  }
};

// Auth UI Controller (Modals & Header Profile)
const AuthUI = {
  modal: document.getElementById('auth-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnLoginOpen: document.getElementById('btn-login-modal'),
  btnRegisterOpen: document.getElementById('btn-register-modal'),
  tabLogin: document.getElementById('tab-login'),
  tabRegister: document.getElementById('tab-register'),
  formTitle: document.getElementById('modal-title'),
  authForm: document.getElementById('auth-form'),
  emailInput: document.getElementById('auth-email'),
  passwordInput: document.getElementById('auth-password'),
  submitBtn: document.getElementById('auth-submit-btn'),
  feedback: document.getElementById('auth-feedback'),
  guestActions: document.getElementById('guest-actions'),
  userSection: document.getElementById('user-section'),
  userEmailLabel: document.getElementById('user-email-label'),
  btnLogout: document.getElementById('btn-logout'),

  isRegisterMode: false,

  init() {
    if (this.btnLoginOpen) {
      this.btnLoginOpen.addEventListener('click', () => this.openModal(false));
    }
    if (this.btnRegisterOpen) {
      this.btnRegisterOpen.addEventListener('click', () => this.openModal(true));
    }
    if (this.btnCloseModal) {
      this.btnCloseModal.addEventListener('click', () => this.closeModal());
    }

    // Modal tabs
    if (this.tabLogin && this.tabRegister) {
      this.tabLogin.addEventListener('click', () => this.setMode(false));
      this.tabRegister.addEventListener('click', () => this.setMode(true));
    }

    // Close on clicking backdrop
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    // Form submit
    if (this.authForm) {
      this.authForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Logout
    if (this.btnLogout) {
      this.btnLogout.addEventListener('click', () => AuthService.logout());
    }

    // Initial render
    this.renderAuthState();
  },

  openModal(isRegister = false) {
    this.setMode(isRegister);
    this.clearFeedback();
    this.emailInput.value = '';
    this.passwordInput.value = '';
    this.modal.classList.add('active');
    this.emailInput.focus();
  },

  closeModal() {
    this.modal.classList.remove('active');
    this.clearFeedback();
  },

  setMode(isRegister) {
    this.isRegisterMode = isRegister;
    this.clearFeedback();
    if (isRegister) {
      this.formTitle.textContent = 'Crear Cuenta';
      this.submitBtn.textContent = 'Registrarse';
      this.tabRegister.classList.add('active');
      this.tabLogin.classList.remove('active');
    } else {
      this.formTitle.textContent = 'Iniciar Sesión';
      this.submitBtn.textContent = 'Ingresar';
      this.tabLogin.classList.add('active');
      this.tabRegister.classList.remove('active');
    }
  },

  async handleSubmit(e) {
    e.preventDefault();
    this.clearFeedback();

    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    if (!email || !password) {
      this.showFeedback('Por favor complete todos los campos.', 'error');
      return;
    }

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Procesando...';

    try {
      if (this.isRegisterMode) {
        await AuthService.register(email, password);
        this.showFeedback('¡Registro exitoso! Iniciando sesión...', 'success');
      } else {
        await AuthService.login(email, password);
        this.showFeedback('¡Bienvenido de nuevo!', 'success');
      }

      setTimeout(async () => {
        this.closeModal();
        this.submitBtn.disabled = false;
        // Apply user preferences on login
        if (typeof onUserLoginSuccess === 'function') {
          await onUserLoginSuccess();
        }
      }, 700);

    } catch (err) {
      this.showFeedback(err.message, 'error');
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = this.isRegisterMode ? 'Registrarse' : 'Ingresar';
    }
  },

  showFeedback(msg, type) {
    this.feedback.textContent = msg;
    this.feedback.className = `form-feedback ${type}`;
  },

  clearFeedback() {
    this.feedback.textContent = '';
    this.feedback.className = 'form-feedback';
  },

  renderAuthState() {
    if (AuthService.isAuthenticated() && AuthService.user) {
      if (this.guestActions) this.guestActions.style.display = 'none';
      if (this.userSection) {
        this.userSection.style.display = 'flex';
        if (this.userEmailLabel) this.userEmailLabel.textContent = AuthService.user.email;
      }
    } else {
      if (this.guestActions) this.guestActions.style.display = 'flex';
      if (this.userSection) this.userSection.style.display = 'none';
    }
  }
};
