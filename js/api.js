/**
 * Sonora - API Integration Service (Phase 3)
 * Fetches royalty-free streaming tracks from open music API providers.
 * Adheres strictly to AGENTS.md requirements:
 * - Minimum 6 tracks.
 * - Extracts: audio_url, cover_image, title, artist (plus duration/id for player logic).
 * - Async/await with try/catch error handling.
 */

const API_CONFIG = {
  APP_NAME: 'SONORA_PLAYER',
  ENDPOINT: 'https://discoveryprovider.audius.co/v1/tracks/trending',
  LIMIT: 10 // Minimum 6 required by PLAN.md and AGENTS.md
};

const MusicAPIService = {
  /**
   * Fetches royalty-free tracks from the API
   * @returns {Promise<Array<{id: string, title: string, artist: string, audio_url: string, cover_image: string, duration: number}>>}
   */
  async fetchTracks() {
    const url = `${API_CONFIG.ENDPOINT}?app_name=${API_CONFIG.APP_NAME}&limit=${API_CONFIG.LIMIT}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error de red al consultar el catálogo de música (HTTP ${response.status}).`);
      }

      const payload = await response.json();
      const rawTracks = payload.data || [];

      if (!Array.isArray(rawTracks) || rawTracks.length === 0) {
        throw new Error('La respuesta de la API no contiene canciones disponibles.');
      }

      // Map strictly to required fields: audio_url, cover_image, title, artist (and duration/id)
      const mappedTracks = rawTracks
        .filter(track => track && track.id && track.title)
        .map(track => {
          // Artwork resolution fallback
          let cover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
          if (track.artwork) {
            cover = track.artwork['480x480'] || track.artwork['150x150'] || track.artwork['1000x1000'] || cover;
          }

          const streamUrl = `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=${API_CONFIG.APP_NAME}`;

          return {
            id: String(track.id),
            title: track.title.trim(),
            artist: (track.user && track.user.name) ? track.user.name.trim() : 'Artista Independiente',
            cover_image: cover,
            audio_url: streamUrl,
            duration: parseInt(track.duration, 10) || 0
          };
        });

      // Strict validation of minimum 6 tracks as per AGENTS.md
      if (mappedTracks.length < 6) {
        throw new Error(`El catálogo devolvió ${mappedTracks.length} pistas. Se requiere un mínimo de 6.`);
      }

      return mappedTracks;
    } catch (error) {
      console.error('MusicAPIService error:', error);
      throw error;
    }
  }
};
