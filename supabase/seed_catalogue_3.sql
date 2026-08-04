-- ═══════════════════════════════════════════════════════════════
--  Catalogue, troisième lot : produits transformés (réservés aux
--  professionnels) et produits bruts complémentaires.
--  À lancer après schema.sql, seed.sql et seed_catalogue_2.sql.
-- ═══════════════════════════════════════════════════════════════

insert into produits (cle, nom, categorie, unite, prix_ref, mois_saison, illustration, transforme) values
  -- Légumes et fruits bruts complémentaires
  ('poireau_perpetuel','Oignon nouveau',   'Légumes', 'botte', 1.90, '{4,5,6}',                     'oignon',    false),
  ('topinambour',   'Topinambour',         'Légumes', 'kg',    3.60, '{10,11,12,1,2,3}',            'patate',    false),
  ('potiron',       'Potiron',             'Légumes', 'pièce', 3.40, '{9,10,11,12}',                'courge',    false),
  ('cresson',       'Cresson',             'Légumes', 'botte', 2.20, '{3,4,5,9,10}',                'salade',    false),
  ('mache',         'Mâche',               'Légumes', 'barquette', 2.40, '{10,11,12,1,2,3}',        'salade',    false),
  ('roquette',      'Roquette',            'Légumes', 'barquette', 2.30, '{4,5,6,9,10}',            'herbe',     false),
  ('haricotsec',    'Haricot sec',         'Légumes', 'kg',    7.50, '{9,10,11}',                   'haricotvert', false),
  ('cornichon',     'Cornichon',           'Légumes', 'kg',    6.90, '{6,7,8}',                     'concombre', false),
  ('nectarine',     'Nectarine',           'Fruits',  'kg',    4.10, '{6,7,8,9}',                   'peche',     false),
  ('brugnon',       'Brugnon',             'Fruits',  'kg',    4.20, '{7,8}',                       'peche',     false),
  ('mure',          'Mûre',                'Fruits',  'barquette', 4.70, '{7,8,9}',                 'framboise', false),
  ('sureau',        'Baie de sureau',      'Fruits',  'barquette', 4.00, '{8,9}',                   'cassis',    false),
  ('amande',        'Amande',              'Fruits',  'kg',    12.90, '{9,10}',                     'noisette',  false),
  ('champignon_sylv','Champignon sauvage', 'Légumes', 'kg',    12.00, '{9,10,11}',                  'champignon', false),

  -- Plants, semis et fleurs
  ('graines',       'Graines et semences', 'Plants & semis', 'sachet', 2.80, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'plant', false),
  ('fleurs_coupees','Fleurs coupées',      'Plants & semis', 'bouquet', 8.00, '{4,5,6,7,8,9,10}',   'herbe',     false),
  ('fleurs_comest', 'Fleurs comestibles',  'Plants & semis', 'barquette', 3.50, '{5,6,7,8,9}',      'herbe',     false),
  ('arbuste',       'Arbuste et bouture',  'Plants & semis', 'pièce', 6.50, '{2,3,4,10,11}',        'plant',     false),

  -- Œufs et petits élevages (bruts)
  ('oeuf_caille',   'Œufs de caille',      'Œufs & laitages', 'boîte de 12', 3.60, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'oeuf', false),

  -- ── Produits transformés : comptes professionnels uniquement ──
  ('pain',          'Pain',                'Boulangerie',      'pièce',     3.20, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'confiture', true),
  ('farine',        'Farine',              'Boulangerie',      'kg',        2.40, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'confiture', true),
  ('huile',         'Huile',               'Épicerie',         'bouteille', 12.50, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'miel',    true),
  ('jus',           'Jus de fruits',       'Boissons',         'bouteille', 3.80, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'confiture', true),
  ('sirop',         'Sirop',               'Boissons',         'bouteille', 5.50, '{5,6,7,8,9}',                  'confiture', true),
  ('cidre',         'Cidre',               'Boissons',         'bouteille', 4.20, '{10,11,12,1,2}',               'confiture', true),
  ('conserve',      'Conserve et bocal',   'Épicerie',         'bocal',     5.20, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'confiture', true),
  ('soupe',         'Soupe et velouté',    'Épicerie',         'bocal',     4.60, '{9,10,11,12,1,2,3}',           'confiture', true),
  ('terrine',       'Terrine et pâté',     'Viandes',          'bocal',     6.80, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'fromage',   true),
  ('volaille',      'Volaille fermière',   'Viandes',          'pièce',    14.00, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'oeuf',      true),
  ('charcuterie',   'Charcuterie',         'Viandes',          'kg',       22.00, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'fromage',   true),
  ('viande',        'Viande',              'Viandes',          'kg',       18.00, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'fromage',   true)
on conflict (cle) do nothing;

-- Chaque produit doit avoir au moins une variété pour ne pas bloquer la publication.
insert into varietes (produit_id, nom, description, illustration)
select p.id, v.nom, v.descr, null from produits p join (values
  ('poireau_perpetuel','Oignon blanc nouveau','Doux, à consommer rapidement'),
  ('topinambour','Topinambour classique','Goût d''artichaut, à poêler'),
  ('potiron','Potiron rouge vif d''Étampes','Gros, chair sucrée'),
  ('cresson','Cresson de fontaine','Poivré, en salade ou en soupe'),
  ('mache','Mâche verte','Tendre, en salade d''hiver'),
  ('roquette','Roquette cultivée','Poivrée, en mélange'),
  ('haricotsec','Haricot lingot','À tremper, pour les plats mijotés'),
  ('cornichon','Cornichon vert petit de Paris','À croquer ou à conserver au vinaigre'),
  ('nectarine','Nectarine jaune','Peau lisse, chair ferme'),
  ('brugnon','Brugnon blanc','Chair adhérente au noyau'),
  ('mure','Mûre de ronce','Sauvage, très parfumée'),
  ('sureau','Sureau noir','Pour sirop et gelée, à cuire'),
  ('amande','Amande sèche','En coque, récolte de l''année'),
  ('champignon_sylv','Cèpe','Ramassé en forêt'),
  ('champignon_sylv','Girolle','Parfumée, à poêler'),
  ('graines','Graines potagères','Récoltées sur mes plants'),
  ('fleurs_coupees','Bouquet de saison','Composé le jour même'),
  ('fleurs_comest','Mélange de fleurs','Capucine, bourrache, souci'),
  ('arbuste','Bouture racinée','En godet, prête à planter'),
  ('oeuf_caille','Œufs de caille frais','Pondus de la semaine'),
  ('pain','Pain au levain','Farine de la ferme, cuisson au feu de bois'),
  ('pain','Pain complet','Farine complète, levain naturel'),
  ('farine','Farine de blé T65','Moulue à la ferme'),
  ('farine','Farine de seigle','Pour pains rustiques'),
  ('huile','Huile de colza','Première pression à froid'),
  ('huile','Huile de tournesol','Pressée à la ferme'),
  ('huile','Huile de noix','Goût intense, à cru'),
  ('jus','Jus de pomme','Pur jus, sans sucre ajouté'),
  ('jus','Jus de raisin','Pressé à la récolte'),
  ('sirop','Sirop de fleur de sureau','Fleurs cueillies au printemps'),
  ('sirop','Sirop de menthe','Menthe fraîche du jardin'),
  ('cidre','Cidre brut','Fermentation naturelle'),
  ('cidre','Cidre doux','Léger et fruité'),
  ('conserve','Légumes au naturel','Stérilisés en bocal'),
  ('conserve','Ratatouille','Légumes du jardin mijotés'),
  ('soupe','Soupe de légumes','De saison, en bocal'),
  ('soupe','Velouté de potiron','Onctueux, prêt à réchauffer'),
  ('terrine','Terrine de campagne','Recette traditionnelle'),
  ('terrine','Rillettes','Cuisson lente'),
  ('volaille','Poulet fermier','Élevé en plein air'),
  ('volaille','Pintade','Élevée en plein air'),
  ('charcuterie','Saucisson sec','Séchage lent'),
  ('charcuterie','Jambon sec','Affiné à la ferme'),
  ('viande','Bœuf','Colis, découpe, découpe au choix'),
  ('viande','Agneau','Élevage local'),
  ('viande','Porc','Élevé en plein air')
) as v(cle, nom, descr) on v.cle = p.cle
where not exists (select 1 from varietes x where x.produit_id = p.id and x.nom = v.nom);
