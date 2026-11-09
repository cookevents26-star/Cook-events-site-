# Cook Events — site vitrine

Site one-page pour Cook Events, traiteur haut de gamme spécialisé dans les mariages et réceptions en Provence.

Direction artistique « galerie privée » : hero noir, titres serif éditoriaux, panneaux teintés (pêche, menthe, lavande) et « sculptures » irisées réalisées entièrement en CSS/SVG (cloche chromée, alliances, coupe de champagne, prisme, sphères).

## Lancer en local

Aucun build nécessaire :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Animations

- Préchargeur avec compteur, titre du hero révélé lettre par lettre
- La cloche se soulève au scroll, avec parallaxe à la souris et poussière lumineuse (canvas)
- Défilement doux (Lenis), barre de progression, navigation sombre/claire automatique
- Bandeau défilant qui accélère et change de sens selon le scroll
- Titres révélés ligne par ligne, compteurs animés, parallaxe des sphères
- Cartes inclinées en 3D au survol, boutons magnétiques avec libellé qui roule
- Section « Le déroulé » en défilement horizontal épinglé
- Manifeste dont les mots s'allument au scroll
- Carte des mets : sphère irisée qui suit le curseur
- Carte de Provence stylisée qui se dessine au scroll
- Curseur personnalisé, témoignages en rotation, grand logo animé en pied de page

Le site respecte `prefers-reduced-motion` et reste lisible si les scripts ne se chargent pas.

## À personnaliser avant mise en ligne

- Téléphone et e-mail (`04 00 00 00 00`, `contact@cookevents.fr`) dans `index.html` et `assets/js/main.js`
- Chiffres de la section « La Maison » (années, mariages, producteurs)
- Témoignages : ce sont des exemples, à remplacer par de vrais avis clients
- Liens réseaux sociaux du pied de page et mentions légales
- Le formulaire ouvre la messagerie du visiteur (`mailto:`) ; pour un envoi direct, brancher un service type Formspree ou un back-end

## Structure

```
index.html
assets/css/style.css
assets/js/main.js
```

Bibliothèques chargées par CDN : GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13. Polices Google : Playfair Display et Archivo.
