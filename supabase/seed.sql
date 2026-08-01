-- ═══════════════════════════════════════════════════════════════
--  Catalogue de départ — à lancer APRÈS schema.sql
--  Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

insert into produits (cle, nom, categorie, unite, prix_ref, mois_saison, illustration) values
  ('tomate',    'Tomate',            'Légumes',          'kg',          4.50, '{6,7,8,9,10}',              'tomate'),
  ('courgette', 'Courgette',         'Légumes',          'kg',          2.90, '{5,6,7,8,9}',               'courgette'),
  ('carotte',   'Carotte',           'Légumes',          'botte',       2.40, '{5,6,7,8,9,10}',            'carotte'),
  ('salade',    'Salade',            'Légumes',          'pièce',       1.60, '{4,5,6,7,8,9,10}',          'salade'),
  ('poivron',   'Poivron & piment',  'Légumes',          'kg',          5.20, '{7,8,9,10}',                'poivron'),
  ('courge',    'Courge & potiron',  'Légumes',          'pièce',       2.60, '{9,10,11,12}',              'courge'),
  ('patate',    'Pomme de terre',    'Légumes',          'kg',          2.20, '{7,8,9,10,11}',             'patate'),
  ('fraise',    'Fraise',            'Fruits',           'barquette',   4.80, '{4,5,6,7}',                 'fraise'),
  ('pomme',     'Pomme',             'Fruits',           'kg',          2.80, '{9,10,11,12,1,2}',          'pomme'),
  ('oeuf',      'Œufs',              'Œufs & laitages',  'boîte de 6',  2.90, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'oeuf'),
  ('fromage',   'Fromage fermier',   'Œufs & laitages',  'pièce',       5.40, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'fromage'),
  ('plant',     'Plants potagers',   'Plants & semis',   'plant',       2.20, '{3,4,5,6}',                 'plant'),
  ('herbe',     'Aromatiques',       'Plants & semis',   'pot',         2.50, '{4,5,6,7,8,9}',             'herbe'),
  ('miel',      'Miel',              'Miel & confitures','pot 500 g',   9.50, '{5,6,7,8,9}',               'miel'),
  ('confiture', 'Confiture maison',  'Miel & confitures','pot 350 g',   4.20, '{1,2,3,4,5,6,7,8,9,10,11,12}', 'confiture')
on conflict (cle) do nothing;

insert into varietes (produit_id, nom, description, illustration)
select p.id, v.nom, v.descr, v.ill from produits p join (values
  ('tomate','Cœur de bœuf','Charnue et fondante, idéale en salade','tomate'),
  ('tomate','Noire de Crimée','Saveur intense et sucrée','tomate'),
  ('tomate','Green Zebra','Originale, légèrement acidulée','tomatevert'),
  ('tomate','Ananas','Douce et juteuse, sans acidité','tomate'),
  ('tomate','Rose de Berne','Douce et parfumée','tomate'),
  ('tomate','Cerise Sweet Baby','Sucrée et croquante, à l''apéritif','tomate'),
  ('tomate','Roma','Ferme, parfaite en sauce','tomate'),
  ('tomate','Marmande','Classique, polyvalente','tomate'),
  ('courgette','Black Beauty','Verte foncée, chair ferme','courgette'),
  ('courgette','Ronde de Nice','Parfaite à farcir','courgette'),
  ('courgette','Jaune','Douce et légèrement sucrée','courgette'),
  ('courgette','Trompette d''Albenga','Longue, très peu de graines','courgette'),
  ('carotte','Nantaise','Sucrée, sans cœur dur','carotte'),
  ('carotte','Colmar','De conservation, pour l''hiver','carotte'),
  ('carotte','Jaune du Doubs','Ancienne, goût prononcé','carotte'),
  ('carotte','Violette','Ancienne, très colorée','carotte'),
  ('salade','Batavia','Croquante et généreuse','salade'),
  ('salade','Feuille de chêne','Tendre, légèrement amère','salade'),
  ('salade','Blonde de Paris','Douce et classique','salade'),
  ('salade','Sucrine','Petite et craquante','salade'),
  ('salade','Roquette','Poivrée, en mélange','herbe'),
  ('poivron','Poivron vert','Croquant, légèrement amer','poivron'),
  ('poivron','Poivron rouge','Sucré, mûri au soleil','poivron'),
  ('poivron','Piment d''Espelette','Doux et parfumé','poivron'),
  ('courge','Butternut','Douce, texture veloutée','courge'),
  ('courge','Potimarron','Goût de châtaigne','courge'),
  ('courge','Spaghetti','Filamenteuse, originale','courge'),
  ('courge','Musquée de Provence','Grosse, très parfumée','courge'),
  ('patate','Charlotte','Chair ferme, à l''eau ou en salade','patate'),
  ('patate','Bintje','Farineuse, pour frites et purée','patate'),
  ('patate','Ratte','Fine, goût de noisette','patate'),
  ('patate','Amandine','Polyvalente, chair ferme','patate'),
  ('fraise','Gariguette','Allongée, sucrée et acidulée','fraise'),
  ('fraise','Charlotte','Très parfumée, goût de fraise des bois','fraise'),
  ('fraise','Mara des bois','Intense, remontante','fraise'),
  ('fraise','Ciflorette','Douce et fondante','fraise'),
  ('pomme','Reine des reinettes','Ferme, acidulée','pomme'),
  ('pomme','Golden','Douce et sucrée','pomme'),
  ('pomme','Chanteclerc','Croquante, très parfumée','pomme'),
  ('pomme','Reinette grise','Ancienne, pour la cuisson','pomme'),
  ('oeuf','Poules plein air','Pondus du jour, en liberté','oeuf'),
  ('oeuf','Poules bio','Alimentation certifiée biologique','oeuf'),
  ('oeuf','Œufs de caille','Petits, pour l''apéritif','oeuf'),
  ('fromage','Chèvre frais','Doux, à tartiner','fromage'),
  ('fromage','Chèvre affiné','Corsé, affiné 3 semaines','fromage'),
  ('fromage','Tomme de vache','Pressée, au lait cru','fromage'),
  ('fromage','Brebis','Fondant, goût prononcé','fromage'),
  ('plant','Plants de tomates','Variétés anciennes, semés en février','plant'),
  ('plant','Plants de courgettes','Prêts à repiquer','plant'),
  ('plant','Plants de salades','En godet, par 6','plant'),
  ('plant','Plants de poivrons','Semés en godet chauffé','plant'),
  ('herbe','Basilic grand vert','Très parfumé, en pot','herbe'),
  ('herbe','Persil plat','Résistant, repousse vite','herbe'),
  ('herbe','Ciboulette','Vivace, se coupe toute la saison','herbe'),
  ('herbe','Menthe','Envahissante, à garder en pot','herbe'),
  ('herbe','Thym','Rustique, plein soleil','herbe'),
  ('miel','Toutes fleurs','Récolte de printemps, non chauffé','miel'),
  ('miel','Acacia','Clair et liquide, très doux','miel'),
  ('miel','Châtaignier','Foncé, corsé, boisé','miel'),
  ('miel','Tilleul','Mentholé, très aromatique','miel'),
  ('confiture','Fraise','Peu sucrée, fruits du jardin','confiture'),
  ('confiture','Abricot','Morceaux entiers','confiture'),
  ('confiture','Mirabelle','De saison, très parfumée','confiture'),
  ('confiture','Rhubarbe','Acidulée, à l''ancienne','confiture')
) as v(cle, nom, descr, ill) on v.cle = p.cle
where not exists (select 1 from varietes x where x.produit_id = p.id and x.nom = v.nom);

-- ─────────────────────────────────────────────
-- Quelques secteurs pour démarrer.
-- Pour importer les 34 800 communes de France, voir scripts/import-communes.mjs
-- ─────────────────────────────────────────────
insert into secteurs (code_insee, nom, code_postal, departement, region, population, lat, lon, ouvert) values
  ('38249','Montalieu-Vercieu','38390','38','Auvergne-Rhône-Alpes',3100,45.815,5.402,false),
  ('44069','Guérande','44350','44','Pays de la Loire',16800,47.328,-2.428,false),
  ('30334','Uzès','30700','30','Occitanie',8600,44.012,4.419,false),
  ('50502','Saint-Lô','50000','50','Normandie',19000,49.116,-1.091,false)
on conflict (code_insee) do nothing;
