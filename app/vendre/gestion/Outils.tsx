'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { eur } from '@/lib/utils';

export interface VenteDirecte {
  id: string; date_vente: string; libelle: string; variete: string | null;
  quantite: number; unite: string; prix_unitaire: number; total: number;
  canal: string; paiement: string;
}
export interface Depense {
  id: string; date_depense: string; libelle: string; categorie: string;
  fournisseur: string | null; montant: number;
}
export interface Stock {
  id: string; libelle: string; variete: string | null; quantite: number;
  unite: string; seuil_alerte: number; emplacement: string | null; peremption: string | null;
}
export interface Tache {
  id: string; titre: string; detail: string | null; echeance: string | null;
  priorite: number; categorie: string; faite: boolean;
}

const CANAUX = [
  ['ferme', 'À la ferme'], ['marche', 'Marché'],
  ['tournee', 'Tournée'], ['autre', 'Autre'],
];
const PAIEMENTS = [
  ['especes', 'Espèces'], ['carte', 'Carte'],
  ['cheque', 'Chèque'], ['virement', 'Virement'],
];
const CATEGORIES_DEPENSE = [
  ['semences', 'Semences'], ['plants', 'Plants'], ['engrais', 'Engrais et traitements'],
  ['materiel', 'Matériel'], ['carburant', 'Carburant'], ['emballage', 'Emballage'],
  ['cotisation', 'Cotisations'], ['autre', 'Autre'],
];
const CATEGORIES_TACHE = [
  ['culture', 'Culture'], ['vente', 'Vente'], ['administratif', 'Administratif'],
  ['materiel', 'Matériel'], ['general', 'Général'],
];
const PRIORITES = [['0', 'Basse'], ['1', 'Normale'], ['2', 'Haute']];

const libelleDe = (liste: string[][], cle: string) =>
  liste.find(([c]) => c === cle)?.[1] ?? cle;

const jour = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/** Les quatre outils quotidiens du professionnel, dans un même écran. */
export default function Outils({
  ventes, depenses, stocks, taches,
}: { ventes: VenteDirecte[]; depenses: Depense[]; stocks: Stock[]; taches: Tache[] }) {
  const [onglet, setOnglet] = useState<'ventes' | 'depenses' | 'stock' | 'taches'>('ventes');

  return (
    <>
      <div className="seg seg-4" role="tablist" aria-label="Outils de gestion">
        <button role="tab" aria-selected={onglet === 'ventes'}
          className={onglet === 'ventes' ? 'on' : ''} onClick={() => setOnglet('ventes')}>
          Ventes directes
        </button>
        <button role="tab" aria-selected={onglet === 'depenses'}
          className={onglet === 'depenses' ? 'on' : ''} onClick={() => setOnglet('depenses')}>
          Dépenses
        </button>
        <button role="tab" aria-selected={onglet === 'stock'}
          className={onglet === 'stock' ? 'on' : ''} onClick={() => setOnglet('stock')}>
          Inventaire
        </button>
        <button role="tab" aria-selected={onglet === 'taches'}
          className={onglet === 'taches' ? 'on' : ''} onClick={() => setOnglet('taches')}>
          Pense-bête
        </button>
      </div>

      {onglet === 'ventes' && <BlocVentes ventes={ventes} />}
      {onglet === 'depenses' && <BlocDepenses depenses={depenses} />}
      {onglet === 'stock' && <BlocStock stocks={stocks} />}
      {onglet === 'taches' && <BlocTaches taches={taches} />}
    </>
  );
}

/** Petit utilitaire commun : insertion puis rafraîchissement de la page. */
function useEnregistrer(table: string) {
  const [envoi, setEnvoi] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function enregistrer(valeurs: Record<string, unknown>, message: string) {
    setEnvoi(true);
    const sb = creerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setEnvoi(false); return false; }
    const { error } = await sb.from(table).insert({ ...valeurs, vendeur_id: user.id });
    setEnvoi(false);
    if (error) {
      toast(error.message.includes('professionnels')
        ? 'Ces outils sont réservés aux comptes professionnels.'
        : "Enregistrement impossible. Réessayez.");
      return false;
    }
    toast(message);
    router.refresh();
    return true;
  }

  return { envoi, enregistrer, router, toast };
}

// ── Ventes directes ──────────────────────────────────────────────
function BlocVentes({ ventes }: { ventes: VenteDirecte[] }) {
  const [libelle, setLibelle] = useState('');
  const [variete, setVariete] = useState('');
  const [quantite, setQuantite] = useState('');
  const [unite, setUnite] = useState('kg');
  const [prix, setPrix] = useState('');
  const [canal, setCanal] = useState('ferme');
  const [paiement, setPaiement] = useState('especes');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [erreur, setErreur] = useState('');
  const { envoi, enregistrer } = useEnregistrer('ventes_directes');

  const q = parseFloat(quantite.replace(',', '.'));
  const p = parseFloat(prix.replace(',', '.'));
  const total = q > 0 && p >= 0 ? q * p : 0;

  const totalJour = ventes
    .filter((v) => v.date_vente === new Date().toISOString().slice(0, 10))
    .reduce((a, v) => a + +v.total, 0);

  async function valider() {
    if (!libelle.trim()) { setErreur('Indiquez ce qui a été vendu.'); return; }
    if (!(q > 0)) { setErreur('Indiquez une quantité supérieure à zéro.'); return; }
    if (!(p >= 0)) { setErreur('Indiquez un prix.'); return; }
    setErreur('');
    const ok = await enregistrer({
      date_vente: date, libelle: libelle.trim(), variete: variete.trim() || null,
      quantite: q, unite, prix_unitaire: p, total: +total.toFixed(2), canal, paiement,
    }, `Vente enregistrée — ${eur(total)}`);
    if (ok) { setLibelle(''); setVariete(''); setQuantite(''); setPrix(''); }
  }

  return (
    <>
      <div className="card">
        <h3>Enregistrer une vente</h3>
        <p className="tiny" style={{ marginTop: 5 }}>
          Ce que vous vendez à la ferme, au marché ou en tournée, hors du site.
          {totalJour > 0 && ` Aujourd'hui : ${eur(totalJour)}.`}
        </p>

        <div className="grille-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="v-lib">Produit vendu</label>
            <input className="inp" id="v-lib" value={libelle} maxLength={60}
              placeholder="Tomates" onChange={(e) => setLibelle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="v-var">Variété</label>
            <input className="inp" id="v-var" value={variete} maxLength={60}
              placeholder="Marmande" onChange={(e) => setVariete(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="v-qte">Quantité</label>
            <input className="inp" id="v-qte" inputMode="decimal" value={quantite}
              placeholder="3" onChange={(e) => setQuantite(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="v-uni">Unité</label>
            <select className="inp" id="v-uni" value={unite} onChange={(e) => setUnite(e.target.value)}>
              {['kg', 'pièce', 'botte', 'barquette', 'litre', 'douzaine'].map((u) =>
                <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="v-prix">Prix unitaire</label>
            <input className="inp" id="v-prix" inputMode="decimal" value={prix}
              placeholder="3,50" onChange={(e) => setPrix(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="v-date">Date</label>
            <input className="inp" id="v-date" type="date" value={date}
              onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="v-canal">Lieu de vente</label>
            <select className="inp" id="v-canal" value={canal} onChange={(e) => setCanal(e.target.value)}>
              {CANAUX.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="v-pai">Paiement</label>
            <select className="inp" id="v-pai" value={paiement} onChange={(e) => setPaiement(e.target.value)}>
              {PAIEMENTS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
            </select>
          </div>
        </div>

        <p className="tiny" aria-live="polite" style={{ marginTop: 4 }}>
          {total > 0 ? `Total de la vente : ${eur(total)}` : 'Le total se calcule tout seul.'}
        </p>
        {erreur && <p className="errmsg" style={{ marginTop: 10 }}>{erreur}</p>}
        <button className="btn btn-p" onClick={valider} disabled={envoi} style={{ marginTop: 12 }}>
          {envoi ? 'Enregistrement…' : 'Enregistrer la vente'}
        </button>
      </div>

      <div className="card">
        <h3>Dernières ventes directes</h3>
        {ventes.length > 0 ? ventes.map((v) => (
          <div className="pts-log" key={v.id}>
            <span>
              {v.libelle}{v.variete ? ` — ${v.variete}` : ''}<br />
              <span className="tiny">
                {jour(v.date_vente)} · {(+v.quantite).toLocaleString('fr-FR')} {v.unite}
                {' · '}{libelleDe(CANAUX, v.canal)} · {libelleDe(PAIEMENTS, v.paiement)}
              </span>
            </span>
            <b>{eur(+v.total)}</b>
          </div>
        )) : <p className="muted" style={{ marginTop: 8 }}>Aucune vente directe enregistrée.</p>}
      </div>
    </>
  );
}

// ── Dépenses ─────────────────────────────────────────────────────
function BlocDepenses({ depenses }: { depenses: Depense[] }) {
  const [libelle, setLibelle] = useState('');
  const [categorie, setCategorie] = useState('semences');
  const [fournisseur, setFournisseur] = useState('');
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [erreur, setErreur] = useState('');
  const { envoi, enregistrer } = useEnregistrer('depenses');

  const m = parseFloat(montant.replace(',', '.'));

  async function valider() {
    if (!libelle.trim()) { setErreur('Indiquez la nature de la dépense.'); return; }
    if (!(m > 0)) { setErreur('Indiquez un montant supérieur à zéro.'); return; }
    setErreur('');
    const ok = await enregistrer({
      date_depense: date, libelle: libelle.trim(), categorie,
      fournisseur: fournisseur.trim() || null, montant: m,
    }, `Dépense enregistrée — ${eur(m)}`);
    if (ok) { setLibelle(''); setFournisseur(''); setMontant(''); }
  }

  // Répartition par poste, pour voir où part l'argent.
  const parPoste = CATEGORIES_DEPENSE
    .map(([cle, label]) => ({
      label,
      total: depenses.filter((d) => d.categorie === cle).reduce((a, d) => a + +d.montant, 0),
    }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
  const totalDepenses = parPoste.reduce((a, p) => a + p.total, 0);

  return (
    <>
      <div className="card">
        <h3>Enregistrer une dépense</h3>
        <div className="grille-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="d-lib">Nature</label>
            <input className="inp" id="d-lib" value={libelle} maxLength={80}
              placeholder="Sachets kraft" onChange={(e) => setLibelle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="d-cat">Poste</label>
            <select className="inp" id="d-cat" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              {CATEGORIES_DEPENSE.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="d-four">Fournisseur</label>
            <input className="inp" id="d-four" value={fournisseur} maxLength={60}
              onChange={(e) => setFournisseur(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="d-mont">Montant</label>
            <input className="inp" id="d-mont" inputMode="decimal" value={montant}
              placeholder="24,90" onChange={(e) => setMontant(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="d-date">Date</label>
            <input className="inp" id="d-date" type="date" value={date}
              onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        {erreur && <p className="errmsg" style={{ marginTop: 10 }}>{erreur}</p>}
        <button className="btn btn-p" onClick={valider} disabled={envoi} style={{ marginTop: 12 }}>
          {envoi ? 'Enregistrement…' : 'Enregistrer la dépense'}
        </button>
      </div>

      {parPoste.length > 0 && (
        <div className="card">
          <h3>Où part l&apos;argent</h3>
          <div className="repart" style={{ marginTop: 10 }}>
            {parPoste.map((p) => (
              <div className="repart-l" key={p.label}>
                <span>{p.label}</span>
                <div className="repart-jauge">
                  <i style={{ width: `${(p.total / parPoste[0].total) * 100}%` }} />
                </div>
                <b>{eur(p.total)}</b>
              </div>
            ))}
          </div>
          <p className="tiny" style={{ marginTop: 10 }}>
            {eur(totalDepenses)} de dépenses enregistrées au total.
          </p>
        </div>
      )}

      <div className="card">
        <h3>Dernières dépenses</h3>
        {depenses.length > 0 ? depenses.map((d) => (
          <div className="pts-log" key={d.id}>
            <span>
              {d.libelle}<br />
              <span className="tiny">
                {jour(d.date_depense)} · {libelleDe(CATEGORIES_DEPENSE, d.categorie)}
                {d.fournisseur ? ` · ${d.fournisseur}` : ''}
              </span>
            </span>
            <b className="neg">−{eur(+d.montant)}</b>
          </div>
        )) : <p className="muted" style={{ marginTop: 8 }}>Aucune dépense enregistrée.</p>}
      </div>
    </>
  );
}

// ── Inventaire ───────────────────────────────────────────────────
function BlocStock({ stocks }: { stocks: Stock[] }) {
  const [libelle, setLibelle] = useState('');
  const [variete, setVariete] = useState('');
  const [quantite, setQuantite] = useState('');
  const [unite, setUnite] = useState('kg');
  const [seuil, setSeuil] = useState('');
  const [emplacement, setEmplacement] = useState('');
  const [peremption, setPeremption] = useState('');
  const [erreur, setErreur] = useState('');
  const { envoi, enregistrer, router, toast } = useEnregistrer('inventaire');

  const alertes = stocks.filter((s) => +s.quantite <= +s.seuil_alerte && +s.seuil_alerte > 0);
  const bientot = stocks.filter((s) => s.peremption
    && new Date(s.peremption).getTime() < Date.now() + 7 * 864e5);

  async function ajouter() {
    if (!libelle.trim()) { setErreur('Indiquez le produit à suivre.'); return; }
    const q = parseFloat(quantite.replace(',', '.'));
    if (!(q >= 0)) { setErreur('Indiquez une quantité.'); return; }
    setErreur('');
    const ok = await enregistrer({
      libelle: libelle.trim(), variete: variete.trim() || null, quantite: q, unite,
      seuil_alerte: parseFloat(seuil.replace(',', '.')) || 0,
      emplacement: emplacement.trim() || null, peremption: peremption || null,
    }, 'Ligne ajoutée à l’inventaire');
    if (ok) { setLibelle(''); setVariete(''); setQuantite(''); setSeuil(''); setEmplacement(''); setPeremption(''); }
  }

  async function corriger(s: Stock, delta: number) {
    const nouvelle = Math.max(0, +s.quantite + delta);
    const sb = creerClient();
    const { error } = await sb.from('inventaire')
      .update({ quantite: nouvelle, updated_at: new Date().toISOString() })
      .eq('id', s.id);
    if (error) { toast('Mise à jour impossible.'); return; }
    router.refresh();
  }

  async function supprimer(s: Stock) {
    const sb = creerClient();
    const { error } = await sb.from('inventaire').delete().eq('id', s.id);
    if (error) { toast('Suppression impossible.'); return; }
    toast('Ligne retirée');
    router.refresh();
  }

  return (
    <>
      {alertes.length > 0 && (
        <div className="avert" role="status">
          <b>{alertes.length} produit{alertes.length > 1 ? 's' : ''} sous le seuil d&apos;alerte :</b>{' '}
          {alertes.map((s) => s.libelle).join(', ')}.
        </div>
      )}
      {bientot.length > 0 && (
        <div className="avert" role="status">
          <b>À écouler en priorité :</b>{' '}
          {bientot.map((s) => `${s.libelle} (${jour(s.peremption!)})`).join(', ')}.
        </div>
      )}

      <div className="card">
        <h3>Ajouter au stock</h3>
        <div className="grille-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="s-lib">Produit</label>
            <input className="inp" id="s-lib" value={libelle} maxLength={60}
              placeholder="Pommes de terre" onChange={(e) => setLibelle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-var">Variété</label>
            <input className="inp" id="s-var" value={variete} maxLength={60}
              onChange={(e) => setVariete(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-qte">Quantité</label>
            <input className="inp" id="s-qte" inputMode="decimal" value={quantite}
              placeholder="120" onChange={(e) => setQuantite(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-uni">Unité</label>
            <select className="inp" id="s-uni" value={unite} onChange={(e) => setUnite(e.target.value)}>
              {['kg', 'pièce', 'botte', 'barquette', 'litre', 'caisse'].map((u) =>
                <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-seuil">Seuil d&apos;alerte</label>
            <input className="inp" id="s-seuil" inputMode="decimal" value={seuil}
              placeholder="10" onChange={(e) => setSeuil(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-empl">Emplacement</label>
            <input className="inp" id="s-empl" value={emplacement} maxLength={40}
              placeholder="Cave, chambre froide…" onChange={(e) => setEmplacement(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-per">À écouler avant le</label>
            <input className="inp" id="s-per" type="date" value={peremption}
              onChange={(e) => setPeremption(e.target.value)} />
          </div>
        </div>
        {erreur && <p className="errmsg" style={{ marginTop: 10 }}>{erreur}</p>}
        <button className="btn btn-p" onClick={ajouter} disabled={envoi} style={{ marginTop: 12 }}>
          {envoi ? 'Ajout…' : 'Ajouter au stock'}
        </button>
      </div>

      <div className="card">
        <h3>État du stock</h3>
        {stocks.length > 0 ? stocks.map((s) => {
          const bas = +s.quantite <= +s.seuil_alerte && +s.seuil_alerte > 0;
          return (
            <div className="line" key={s.id}>
              <div className="line-b">
                <h4>
                  {s.libelle}{s.variete ? ` — ${s.variete}` : ''}
                  {bas && <span className="badge b-am" style={{ marginLeft: 7 }}>Stock bas</span>}
                </h4>
                <p>
                  {s.emplacement ?? 'Emplacement non précisé'}
                  {+s.seuil_alerte > 0 && ` · alerte sous ${(+s.seuil_alerte).toLocaleString('fr-FR')} ${s.unite}`}
                  {s.peremption && ` · à écouler avant le ${jour(s.peremption)}`}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="qty">
                  <button onClick={() => corriger(s, -1)} aria-label={`Retirer 1 ${s.unite} de ${s.libelle}`}>−</button>
                  <span>{(+s.quantite).toLocaleString('fr-FR')}</span>
                  <button onClick={() => corriger(s, 1)} aria-label={`Ajouter 1 ${s.unite} de ${s.libelle}`}>+</button>
                </div>
                <span className="tiny">{s.unite}</span>
                <button className="btn-x" onClick={() => supprimer(s)}
                  aria-label={`Retirer ${s.libelle} de l'inventaire`}>×</button>
              </div>
            </div>
          );
        }) : <p className="muted" style={{ marginTop: 8 }}>L&apos;inventaire est vide.</p>}
      </div>
    </>
  );
}

// ── Pense-bête ───────────────────────────────────────────────────
function BlocTaches({ taches }: { taches: Tache[] }) {
  const [titre, setTitre] = useState('');
  const [detail, setDetail] = useState('');
  const [echeance, setEcheance] = useState('');
  const [priorite, setPriorite] = useState('1');
  const [categorie, setCategorie] = useState('culture');
  const [erreur, setErreur] = useState('');
  const { envoi, enregistrer, router, toast } = useEnregistrer('taches');

  const aFaire = taches.filter((t) => !t.faite);
  const faites = taches.filter((t) => t.faite).slice(0, 8);
  const enRetard = aFaire.filter((t) => t.echeance && new Date(t.echeance) < new Date());

  async function ajouter() {
    if (!titre.trim()) { setErreur('Indiquez ce qu’il y a à faire.'); return; }
    setErreur('');
    const ok = await enregistrer({
      titre: titre.trim(), detail: detail.trim() || null,
      echeance: echeance || null, priorite: +priorite, categorie,
    }, 'Note ajoutée');
    if (ok) { setTitre(''); setDetail(''); setEcheance(''); }
  }

  async function basculer(t: Tache) {
    const sb = creerClient();
    const { error } = await sb.from('taches')
      .update({ faite: !t.faite, faite_le: t.faite ? null : new Date().toISOString() })
      .eq('id', t.id);
    if (error) { toast('Mise à jour impossible.'); return; }
    router.refresh();
  }

  async function supprimer(t: Tache) {
    const sb = creerClient();
    const { error } = await sb.from('taches').delete().eq('id', t.id);
    if (error) { toast('Suppression impossible.'); return; }
    router.refresh();
  }

  const ligne = (t: Tache) => {
    const retard = !t.faite && t.echeance && new Date(t.echeance) < new Date();
    return (
      <div className="tache" key={t.id}>
        <label className="tache-case">
          <input type="checkbox" checked={t.faite} onChange={() => basculer(t)} />
          <span className="sr-only">
            {t.faite ? `Rouvrir : ${t.titre}` : `Marquer comme faite : ${t.titre}`}
          </span>
        </label>
        <div className="tache-b">
          <b className={t.faite ? 'tache-ok' : ''}>{t.titre}</b>
          {t.detail && <p className="tiny">{t.detail}</p>}
          <p className="tiny">
            {libelleDe(CATEGORIES_TACHE, t.categorie)}
            {t.echeance && ` · ${retard ? 'était' : ''} pour le ${jour(t.echeance)}`}
            {t.priorite === 2 && ' · priorité haute'}
          </p>
        </div>
        {retard && <span className="badge b-am">En retard</span>}
        {t.priorite === 2 && !t.faite && !retard && <span className="badge b-pro">Haute</span>}
        <button className="btn-x" onClick={() => supprimer(t)}
          aria-label={`Supprimer la note : ${t.titre}`}>×</button>
      </div>
    );
  };

  return (
    <>
      {enRetard.length > 0 && (
        <div className="avert" role="status">
          <b>{enRetard.length} note{enRetard.length > 1 ? 's' : ''} en retard.</b>{' '}
          {enRetard.slice(0, 3).map((t) => t.titre).join(', ')}
          {enRetard.length > 3 ? '…' : '.'}
        </div>
      )}

      <div className="card">
        <h3>Noter quelque chose</h3>
        <div className="grille-2" style={{ marginTop: 12 }}>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="t-titre">À faire</label>
            <input className="inp" id="t-titre" value={titre} maxLength={100}
              placeholder="Semer les mâches sous tunnel"
              onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="t-det">Précision</label>
            <input className="inp" id="t-det" value={detail} maxLength={200}
              onChange={(e) => setDetail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="t-ech">Pour le</label>
            <input className="inp" id="t-ech" type="date" value={echeance}
              onChange={(e) => setEcheance(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="t-cat">Domaine</label>
            <select className="inp" id="t-cat" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              {CATEGORIES_TACHE.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-pri">Priorité</label>
            <select className="inp" id="t-pri" value={priorite} onChange={(e) => setPriorite(e.target.value)}>
              {PRIORITES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
            </select>
          </div>
        </div>
        {erreur && <p className="errmsg" style={{ marginTop: 10 }}>{erreur}</p>}
        <button className="btn btn-p" onClick={ajouter} disabled={envoi} style={{ marginTop: 12 }}>
          {envoi ? 'Ajout…' : 'Ajouter la note'}
        </button>
      </div>

      <div className="card">
        <h3>À faire{aFaire.length > 0 && ` (${aFaire.length})`}</h3>
        {aFaire.length > 0
          ? <div style={{ marginTop: 8 }}>{aFaire.map(ligne)}</div>
          : <p className="muted" style={{ marginTop: 8 }}>Rien en attente.</p>}
      </div>

      {faites.length > 0 && (
        <div className="card">
          <h3>Fait récemment</h3>
          <div style={{ marginTop: 8 }}>{faites.map(ligne)}</div>
        </div>
      )}
    </>
  );
}
