import Link from 'next/link';
import { Illustration, Logo } from '@/components/Illustrations';

export default function IntrouvableGlobal() {
  return (
    <div className="onb">
      <div className="onb-in">
        <div className="brand" style={{ fontSize: '1.1rem' }}>
          <Logo size={29} />mon<i>petit</i>potager
        </div>
        <div className="empty" style={{ marginTop: 24 }}>
          <Illustration nom="plant" className="e-ico" />
          <h3>Cette page n'existe pas.</h3>
          <p>Le lien est peut-être incorrect, ou l'annonce a été retirée entre-temps.</p>
          <Link className="btn btn-p" href="/">Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
