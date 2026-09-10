# Moderniser le partage du Passport

## Objectif
Retirer le timbre doré du Passport et transformer « Share your All-rounder » en une fenêtre Kretopia claire, premium et immédiate.

## Changements
1. Supprimer le timbre doré de la carte Passport principale, sans toucher aux badges de vérification utiles.
2. Recomposer la fenêtre autour du logo officiel Kretopia, du nom « All-rounder » et d’un aperçu compact du lien partagé.
3. Limiter l’action principale à quatre icônes accessibles et complémentaires : partage natif, WhatsApp, e-mail et copie du lien.
4. Conserver les destinations de partage adaptées au métier, mais avec une sélection compacte au lieu d’une longue liste de cartes et d’icônes.
5. Aligner couleurs, bordures, typographie, états tactiles et mode clair/sombre sur les composants et tokens existants.
6. Vérifier l’ouverture depuis « Share your passport », le partage, la copie, le clavier et l’affichage mobile.

## Détails techniques
- Modification uniquement côté interface ; aucun changement d’authentification, de données ou de routes.
- Réutilisation de `BrandLogo`, des boutons et de la fenêtre modale déjà présents dans Kretopia.
- Respect de la réduction des animations et maintien de libellés accessibles pour les quatre icônes.
