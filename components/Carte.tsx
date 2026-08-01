'use client';
import { useEffect, useRef } from 'react';

interface Point { nom: string; lat: number; lon: number; km?: number }

/**
 * Carte OpenStreetMap centrée sur la commune, avec le cercle du rayon.
 * Leaflet est chargé dynamiquement : il ne fonctionne pas côté serveur.
 */
export default function Carte({
  lat, lon, nom, voisines = [], rayonKm = 20, petite = false,
}: {
  lat: number; lon: number; nom: string;
  voisines?: Point[]; rayonKm?: number; petite?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<any>(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (annule || !ref.current) return;
      if (inst.current) { inst.current.remove(); inst.current = null; }

      const map = L.map(ref.current, { scrollWheelZoom: false }).setView([lat, lon], 10);
      inst.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '© OpenStreetMap',
      }).addTo(map);

      const cercle = L.circle([lat, lon], {
        radius: rayonKm * 1000, color: '#6FA83A', weight: 2,
        dashArray: '6 5', fillColor: '#6FA83A', fillOpacity: 0.1,
      }).addTo(map);

      L.marker([lat, lon], {
        icon: L.divIcon({ className: '', html: `<div class="pinlabel hublabel">${nom}</div>` }),
      }).addTo(map);
      L.circleMarker([lat, lon], {
        radius: 7, color: '#143424', fillColor: '#143424', fillOpacity: 1, weight: 2,
      }).addTo(map);

      voisines.slice(0, 30).forEach((v) => {
        L.circleMarker([v.lat, v.lon], {
          radius: 4, color: '#6FA83A', fillColor: '#6FA83A', fillOpacity: 1, weight: 1,
        }).addTo(map).bindTooltip(
          v.km != null ? `${v.nom} — ${v.km} km` : v.nom, { direction: 'top' }
        );
      });

      map.fitBounds(cercle.getBounds(), { padding: [16, 16] });
      setTimeout(() => map.invalidateSize(), 120);
    })();

    return () => {
      annule = true;
      if (inst.current) { inst.current.remove(); inst.current = null; }
    };
  }, [lat, lon, nom, rayonKm, voisines]);

  return <div ref={ref} className={`map${petite ? ' small' : ''}`} />;
}
