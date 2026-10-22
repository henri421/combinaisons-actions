/**
 * combinaisons-actions — noyau de calcul.
 *
 * Combinaisons d'actions de l'EN 1990:2002 (batiments, annexe A1) : ELU EQU,
 * STR/GEO, GEO, accidentelles, et ELS caracteristiques, frequentes, quasi
 * permanentes ; valeurs combinees et enveloppes quand les effets sont saisis.
 */

export {
  CATEGORIES,
  LIBELLES_CATEGORIES,
  en1990Recommande,
  verifierProfil,
  type Categorie,
  type JeuGamma,
  type ProfilCombinaisons,
  type Psi,
  type ValeurSourcee,
} from './profil';
export {
  FAMILLES,
  LIBELLES_FAMILLES,
  NOMBRE_MAXIMAL,
  OPTIONS_PAR_DEFAUT,
  formuleLisible,
  genererCombinaisons,
  type Action,
  type ActionAccidentelle,
  type ActionPermanente,
  type ActionVariable,
  type Combinaison,
  type Famille,
  type Options,
  type Terme,
} from './combinaisons';
export { combinerEffets, enveloppes, type Effets, type Enveloppe, type Extremum, type ValeurCombinee } from './valeurs';
export { actionsClimatiques, type ImportClimatique } from './import-climatique';
