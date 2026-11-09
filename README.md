# Cook Events — site vitrine

Site de Cook Events, traiteur haut de gamme spécialisé dans les mariages et réceptions en Provence.

Direction artistique reprise de la brochure « Collection Mariage 2027 » : fond papier gris clair, capitales Cormorant très espacées, écriture manuscrite, petites capitales Open Sans et photographies de la maison (dossier `assets/img/`, extraites de la brochure).

## Lancer en local

Aucun build nécessaire :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Animations

- Préchargeur avec compteur, titre du hero révélé lettre par lettre
- Photo du hero qui s'éloigne au scroll, parallaxe à la souris et poussière dorée (canvas)
- Défilement doux (Lenis), barre de progression, navigation sombre/claire automatique
- Bandeau défilant qui accélère et change de sens selon le scroll
- Titres révélés ligne par ligne, prix et chiffres animés, photos dévoilées en rideau et en parallaxe, assiettes qui tournent
- Cartes inclinées en 3D au survol, boutons magnétiques avec libellé qui roule
- Section « Le déroulé » en défilement horizontal épinglé
- Transitions en rideau entre les pages (préchargeur à la première visite uniquement)
- Simulateur de budget animé, onglets de la carte du dîner, bouton de contact fixe sur mobile
- Manifeste dont les mots s'allument au scroll
- Le dîner : la photo du plat suit le curseur
- Carte de Provence stylisée qui se dessine au scroll
- Curseur personnalisé, témoignages en rotation, grand logo animé en pied de page

Le site respecte `prefers-reduced-motion` et reste lisible si les scripts ne se chargent pas.

## À personnaliser avant mise en ligne

- Téléphone et e-mail (`04 00 00 00 00`, `contact@cookevents.fr`) dans `index.html` et `assets/js/main.js`
- Ajouter de vrais avis clients si vous le souhaitez (la section citations reprend les phrases de la brochure)
- Liens réseaux sociaux du pied de page et mentions légales
- Le formulaire ouvre la messagerie du visiteur (`mailto:`) ; pour un envoi direct, brancher un service type Formspree ou un back-end

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : hero, manifeste du Chef, la rencontre, déroulé du week-end, la collection, assiettes signature, lieux |
| `premier-soir.html` | Welcome dinner : Casa, Braise, Al Fresco (menus, photos, prix) |
| `jour-j.html` | Cocktail (pièces froides et chaudes), scènes culinaires, carte du dîner en onglets |
| `lendemain.html` | Time to brunch : saveurs salées, douceurs sucrées, suppléments |
| `formules.html` | Flamme & Élégance, Signature du domaine, comparatif, options et simulateur de budget |
| `contact.html` | Formulaire (pré-rempli depuis le simulateur ou les boutons « Choisir… ») et déroulé de la prise de contact |

Toutes les pages partagent `assets/css/style.css`, `assets/js/main.js` et les photos de `assets/img/`.

Bibliothèques chargées par CDN : GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13. Polices Google : Cormorant Garamond, Open Sans et Mrs Saint Delafield.
