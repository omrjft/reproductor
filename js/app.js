/**
 * Sonora - Audio Player Logic (Phase 2, 3 & 5)
 * Manages HTML5 Audio instance, API integration, playback controls, queue navigation,
 * and user preferences synchronization with backend.
 */

// Application State
const AppState = {
  tracks: [],
  currentIndex: 0,
  isPlaying: false,
  isSeeking: false,
  isLoading: false
};

// UI Elements Reference
const UI = {
  coverImage: document.getElementById('current-cover'),
  title: document.getElementById('current-title'),
  artist: document.getElementById('current-artist'),
  progressBar: document.getElementById('progress-bar'),
  currentTime: document.getElementById('current-time'),
  totalDuration: document.getElementById('total-duration'),
  btnPlayPause: document.getElementById('btn-play-pause'),
  iconPlay: document.getElementById('icon-play'),
  iconPause: document.getElementById('icon-pause'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  volumeSlider: document.getElementById('volume-slider'),
  trackList: document.getElementById('track-list'),
  playlistCount: document.getElementById('playlist-count'),
  errorMessage: document.getElementById('error-message')
};

// Audio Controller Class (HTML5 Audio API)
class AudioController {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.initEventListeners();
  }

  initEventListeners() {
    // Time update listener for progress synchronization
    this.audio.addEventListener('timeupdate', () => {
      if (!AppState.isSeeking) {
        this.onTimeUpdate();
      }
    });

    // Metadata loaded (duration available)
    this.audio.addEventListener('loadedmetadata', () => {
      this.onMetadataLoaded();
    });

    // ALWAYS trigger next track automatically when current song ends (as required by AGENTS.md & PLAN.md)
    this.audio.addEventListener('ended', () => {
      console.log('Audio track ended. Advancing automatically to next track.');
      playerNext();
    });

    // Audio error handling
    this.audio.addEventListener('error', (e) => {
      console.error('HTML5 Audio playback error:', e);
      UIController.showError('No se pudo reproducir el audio de esta pista. Intente con otra canción.');
      AppState.isPlaying = false;
      UIController.updatePlayPauseButton(false);
    });

    // Play/Pause state synchronization
    this.audio.addEventListener('play', () => {
      AppState.isPlaying = true;
      UIController.updatePlayPauseButton(true);
      UIController.hideError();
    });

    this.audio.addEventListener('pause', () => {
      AppState.isPlaying = false;
      UIController.updatePlayPauseButton(false);
    });
  }

  loadTrack(track) {
    if (!track || !track.audio_url) {
      UIController.showError('La pista no cuenta con un enlace de audio válido.');
      return;
    }
    this.audio.src = track.audio_url;
    this.audio.load();
  }

  async play() {
    try {
      await this.audio.play();
    } catch (err) {
      console.warn('Playback interrupted or blocked by browser policy:', err);
      AppState.isPlaying = false;
      UIController.updatePlayPauseButton(false);
    }
  }

  pause() {
    this.audio.pause();
  }

  seekTo(percentage) {
    if (this.audio.duration) {
      const targetTime = (percentage / 100) * this.audio.duration;
      this.audio.currentTime = targetTime;
    }
  }

  setVolume(volume) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  onTimeUpdate() {
    if (!this.audio.duration) return;
    const current = this.audio.currentTime;
    const duration = this.audio.duration;
    const progressPercent = (current / duration) * 100;

    UI.progressBar.value = progressPercent;
    UI.currentTime.textContent = UIController.formatTime(current);
  }

  onMetadataLoaded() {
    UI.totalDuration.textContent = UIController.formatTime(this.audio.duration);
  }
}

// UI Controller
const UIController = {
  formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity || seconds === null) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },

  updateCurrentTrackView(track) {
    if (!track) return;
    UI.title.textContent = track.title || 'Título desconocido';
    UI.artist.textContent = track.artist || 'Artista desconocido';
    UI.coverImage.src = track.cover_image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
    UI.coverImage.alt = `Portada para ${track.title}`;
    UI.progressBar.value = 0;
    UI.currentTime.textContent = '0:00';
    UI.totalDuration.textContent = track.duration ? this.formatTime(track.duration) : '0:00';
  },

  updatePlayPauseButton(isPlaying) {
    if (isPlaying) {
      UI.iconPlay.style.display = 'none';
      UI.iconPause.style.display = 'block';
      UI.btnPlayPause.setAttribute('aria-label', 'Pausar');
    } else {
      UI.iconPlay.style.display = 'block';
      UI.iconPause.style.display = 'none';
      UI.btnPlayPause.setAttribute('aria-label', 'Reproducir');
    }
  },

  renderPlaylist(tracks, activeIndex) {
    UI.trackList.innerHTML = '';
    UI.playlistCount.textContent = `${tracks.length} ${tracks.length === 1 ? 'pista' : 'pistas'}`;

    tracks.forEach((track, index) => {
      const li = document.createElement('li');
      li.className = `track-item ${index === activeIndex ? 'active' : ''}`;
      li.setAttribute('data-index', index);
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');

      li.innerHTML = `
        <span class="track-item-index">${index + 1}</span>
        <img class="track-item-thumb" src="${track.cover_image}" alt="Portada ${track.title}" loading="lazy">
        <div class="track-item-details">
          <span class="track-item-title">${track.title}</span>
          <span class="track-item-artist">${track.artist}</span>
        </div>
        <span class="track-item-duration">${track.duration ? this.formatTime(track.duration) : '--:--'}</span>
      `;

      li.addEventListener('click', () => {
        playTrackByIndex(index);
      });

      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playTrackByIndex(index);
        }
      });

      UI.trackList.appendChild(li);
    });
  },

  highlightActiveTrack(index) {
    const items = UI.trackList.querySelectorAll('.track-item');
    items.forEach((item, idx) => {
      if (idx === index) {
        item.classList.add('active');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  },

  showError(message) {
    UI.errorMessage.textContent = message;
    UI.errorMessage.style.display = 'block';
  },

  hideError() {
    UI.errorMessage.style.display = 'none';
  },

  showLoadingState() {
    UI.trackList.innerHTML = '<li style="padding: 24px; text-align: center; color: var(--color-stone-gray);">Cargando catálogo musical libre de derechos...</li>';
    UI.title.textContent = 'Cargando música...';
    UI.artist.textContent = 'Conectando con API de música';
  }
};

// Global Audio Instance
const player = new AudioController();

// Debounce helper for saving preferences
let savePrefsTimeout = null;
function syncUserPreferences() {
  if (typeof AuthService === 'undefined' || !AuthService.isAuthenticated()) return;

  clearTimeout(savePrefsTimeout);
  savePrefsTimeout = setTimeout(() => {
    const currentTrack = AppState.tracks[AppState.currentIndex];
    const prefs = {
      volumen_guardado: parseFloat(UI.volumeSlider.value),
      ultima_cancion_id: currentTrack ? currentTrack.id : null
    };
    AuthService.savePreferences(prefs);
  }, 1000);
}

// Player Actions
function loadCurrentTrack(autoplay = false) {
  if (AppState.tracks.length === 0) return;
  const currentTrack = AppState.tracks[AppState.currentIndex];
  if (!currentTrack) return;

  UIController.updateCurrentTrackView(currentTrack);
  UIController.highlightActiveTrack(AppState.currentIndex);
  player.loadTrack(currentTrack);

  syncUserPreferences();

  if (autoplay) {
    player.play();
  }
}

function playTrackByIndex(index) {
  if (index < 0 || index >= AppState.tracks.length) return;
  AppState.currentIndex = index;
  loadCurrentTrack(true);
}

function playerTogglePlay() {
  if (AppState.tracks.length === 0) return;
  if (AppState.isPlaying) {
    player.pause();
  } else {
    player.play();
  }
}

function playerPrev() {
  if (AppState.tracks.length === 0) return;
  if (player.audio.currentTime > 3) {
    player.audio.currentTime = 0;
    return;
  }
  AppState.currentIndex = (AppState.currentIndex - 1 + AppState.tracks.length) % AppState.tracks.length;
  loadCurrentTrack(true);
}

function playerNext() {
  if (AppState.tracks.length === 0) return;
  AppState.currentIndex = (AppState.currentIndex + 1) % AppState.tracks.length;
  loadCurrentTrack(true);
}

// User Login Callback: Applies user preferences from DB
async function onUserLoginSuccess() {
  if (typeof AuthService === 'undefined') return;
  const prefs = await AuthService.getPreferences();
  if (prefs) {
    if (prefs.volumen_guardado !== undefined && prefs.volumen_guardado !== null) {
      UI.volumeSlider.value = prefs.volumen_guardado;
      player.setVolume(prefs.volumen_guardado);
    }
    if (prefs.ultima_cancion_id && AppState.tracks.length > 0) {
      const savedIndex = AppState.tracks.findIndex(t => t.id === String(prefs.ultima_cancion_id));
      if (savedIndex !== -1) {
        AppState.currentIndex = savedIndex;
        loadCurrentTrack(false);
      }
    }
  }
}

// Fetch tracks from API and initialize catalog
async function loadMusicCatalog() {
  UIController.showLoadingState();
  try {
    const tracks = await MusicAPIService.fetchTracks();
    AppState.tracks = tracks;
    AppState.currentIndex = 0;

    UIController.renderPlaylist(AppState.tracks, AppState.currentIndex);
    loadCurrentTrack(false);
    UIController.hideError();

    // Check if user is logged in to apply preferences
    if (typeof AuthService !== 'undefined' && AuthService.isAuthenticated()) {
      await onUserLoginSuccess();
    }
  } catch (error) {
    console.error('Error in loadMusicCatalog:', error);
    UIController.showError('No se pudo conectar con la API de música. Por favor, verifica tu conexión a internet.');
    UI.trackList.innerHTML = '<li style="padding: 24px; text-align: center; color: var(--color-stone-gray);">No hay canciones disponibles.</li>';
  }
}

// App Initialization
function initApp() {
  // Initialize Auth UI
  if (typeof AuthUI !== 'undefined') {
    AuthUI.init();
  }

  // Playback Control Listeners
  UI.btnPlayPause.addEventListener('click', playerTogglePlay);
  UI.btnPrev.addEventListener('click', playerPrev);
  UI.btnNext.addEventListener('click', playerNext);

  // Progress Bar Seek Listeners
  UI.progressBar.addEventListener('input', () => {
    AppState.isSeeking = true;
    if (player.audio.duration) {
      const seekTime = (UI.progressBar.value / 100) * player.audio.duration;
      UI.currentTime.textContent = UIController.formatTime(seekTime);
    }
  });

  UI.progressBar.addEventListener('change', () => {
    player.seekTo(parseFloat(UI.progressBar.value));
    AppState.isSeeking = false;
  });

  // Volume Slider Listener
  UI.volumeSlider.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    player.setVolume(vol);
    syncUserPreferences();
  });

  player.setVolume(parseFloat(UI.volumeSlider.value));

  // Load real tracks from API
  loadMusicCatalog();
}

// DOM Ready
document.addEventListener('DOMContentLoaded', initApp);
