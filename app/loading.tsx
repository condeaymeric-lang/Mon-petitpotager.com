export default function Chargement() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }} role="status" aria-live="polite">
      <div className="spin" aria-hidden="true" />
      <span className="sr-only">Chargement en cours</span>
    </div>
  );
}
