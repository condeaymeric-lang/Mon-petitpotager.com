export const RAYON_DEFAUT = 20;
export const FRAIS_SERVICE = 0.7;
export const POINTS_PAR_EURO = 1;
/** Palier de conversion : 1000 points donnent un bon d'achat de 10 €. */
export const PALIER_POINTS = 1000;
export const PALIER_EUROS = 10;

export const eur = (n: number) =>
  n.toFixed(2).replace('.', ',') + ' €';

export const moisCourant = () => new Date().getMonth() + 1;

export const estDeSaison = (moisSaison: number[] | null | undefined) =>
  !!moisSaison?.includes(moisCourant());

/** Distance à vol d'oiseau en kilomètres. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(lat2 - lat1);
  const dLon = r(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Réduit une image avant envoi : évite d'expédier 8 Mo depuis un téléphone.
 * Retourne un Blob JPEG d'environ 200 Ko.
 */
export function compresserImage(file: File, maxDim = 1280, qualite = 0.78): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image illisible'));
      img.onload = () => {
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponible'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Compression échouée'))),
          'image/jpeg',
          qualite
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
