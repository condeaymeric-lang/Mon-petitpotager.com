import Link from 'next/link';
import { Logo } from '@/components/Illustrations';
import PiedDePage from '@/components/PiedDePage';
import FormulaireContact from './FormulaireContact';

export const metadata = { title: 'Contact — monpetitpotager.com' };

export default function Contact() {
  return (
    <>
      <div className="app"><div className="page page-form">
        <Link href="/" className="brand" style={{ fontSize: '1.7rem', marginBottom: 18 }}>
          <Logo size={29} />mon<i>petit</i>potager
        </Link>
        <div className="page-head">
          <h1>Nous écrire</h1>
          <p>
            Une question, un problème sur une commande, une annonce à signaler :
            écrivez-nous. Les messages sont lus par l&apos;équipe du service.
          </p>
        </div>
        <FormulaireContact />
      </div></div>
      <PiedDePage />
    </>
  );
}
