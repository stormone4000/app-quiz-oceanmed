export const convertYouTubeUrl = (url: string): string => {
  try {
    // Gestione URL di YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\/\s]{11})/)?.[1];
      
      if (!videoId) {
        throw new Error("URL YouTube non valido");
      }

      // Restituisci l'URL di incorporamento con parametri aggiuntivi per la sicurezza
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
    }
    
    // Gestione URL di Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    
    // Se l'URL è già un URL di incorporamento, restituiscilo così com'è
    if (url.includes('embed') || url.includes('player')) {
      return url;
    }
    
    // Se non è stato possibile elaborare l'URL, restituisci l'URL originale
    return url;
  } catch (error) {
    console.error("Errore nella conversione dell'URL del video:", error);
    return url;
  }
}; 