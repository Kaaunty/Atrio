/**
 * Utilitário para resolver a URL final de arquivos enviados (uploads)
 * Suporta caminhos relativos (/uploads/...) e URLs absolutas externas (http/https/blob/data).
 */
export function resolveFileUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  const apiUrl = import.meta.env.VITE_API_URL;

  // Se houver uma VITE_API_URL configurada com host (ex: https://api.dominio.com/api/v1),
  // extraímos a origem para servir /uploads/...
  if (apiUrl && typeof apiUrl === 'string' && !apiUrl.startsWith('/')) {
    try {
      const parsed = new URL(apiUrl);
      return `${parsed.origin}${cleanPath}`;
    } catch {
      return cleanPath;
    }
  }

  return cleanPath;
}
