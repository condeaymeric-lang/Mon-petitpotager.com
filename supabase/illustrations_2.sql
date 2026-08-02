-- Corrige les produits qui empruntaient l'illustration d'un autre :
-- la viande ne doit pas ressembler à du fromage.
update produits set illustration = 'viande'       where nom = 'Viande';
update produits set illustration = 'volaille'     where nom = 'Volaille fermière';
update produits set illustration = 'charcuterie'  where nom = 'Charcuterie';
update produits set illustration = 'terrine'      where nom = 'Terrine et pâté';
update produits set illustration = 'pain'         where nom = 'Pain';
update produits set illustration = 'farine'       where nom = 'Farine';
update produits set illustration = 'huile'        where nom = 'Huile';
update produits set illustration = 'jus'          where nom = 'Jus de fruits';
update produits set illustration = 'jus'          where nom = 'Sirop';
update produits set illustration = 'cidre'        where nom = 'Cidre';
update produits set illustration = 'bocal'        where nom = 'Conserve et bocal';
update produits set illustration = 'soupe'        where nom = 'Soupe et velouté';
update produits set illustration = 'mure'         where nom = 'Mûre';
update produits set illustration = 'mure'         where nom = 'Baie de sureau';
update produits set illustration = 'amande'       where nom = 'Amande';
update produits set illustration = 'topinambour'  where nom = 'Topinambour';
update produits set illustration = 'roquette'     where nom in ('Roquette', 'Cresson');
update produits set illustration = 'cornichon'    where nom = 'Cornichon';
update produits set illustration = 'haricotsec'   where nom = 'Haricot sec';
