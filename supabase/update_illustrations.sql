-- Attribue à chaque produit du catalogue étendu son illustration dédiée
-- (ajoutée dans components/Illustrations.tsx), à la place du dessin
-- générique de secours ("plant").
update produits set illustration = cle where cle in (
  'aubergine','brocoli','choufleur','chou','poireau','oignon','echalote','ail',
  'epinard','haricotvert','petitpois','radis','betterave','panais','navet',
  'rutabaga','artichaut','asperge','champignon','endive','fenouil','celeri',
  'concombre','mais','blette',
  'abricot','peche','prune','cerise','raisin','melon','pasteque','poire','kiwi',
  'framboise','myrtille','cassis','groseille','mirabelle','clementine','citron',
  'orange','pamplemousse','figue','coing','rhubarbe','noix','noisette','chataigne',
  'lait','beurre','yaourt','creme'
);
