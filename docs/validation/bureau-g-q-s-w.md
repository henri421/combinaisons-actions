# Cas de validation : bâtiment de bureaux, G + Q + S + W

Valeurs recommandées de l'EN 1990:2002, annexe A1. Calcul à la main.

## Données

| Action | Catégorie | ψ₀ | ψ₁ | ψ₂ | Effet M (kN·m) |
|---|---|---|---|---|---|
| G | permanente | — | — | — | 10 |
| Q | B, bureaux | 0,7 | 0,5 | 0,3 | 5 |
| S | neige, ≤ 1000 m | 0,5 | 0,2 | 0 | 3 |
| W | vent | 0,6 | 0,2 | 0 | −4 |

G n'est pas déclarée « peut être favorable ». Expression (6.10).

## ELU STR/GEO (jeu B : γ_G = 1,35, γ_Q = 1,5)

| N° | Dominante | Combinaison | M_d |
|---|---|---|---|
| 1 | Q | 1,35 G + 1,5 Q + 0,75 S + 0,9 W | 13,5 + 7,5 + 2,25 − 3,6 = **19,65** |
| 2 | S | 1,35 G + 1,05 Q + 1,5 S + 0,9 W | 13,5 + 5,25 + 4,5 − 3,6 = **19,65** |
| 3 | W | 1,35 G + 1,05 Q + 0,75 S + 1,5 W | 13,5 + 5,25 + 2,25 − 6 = **15,00** |

Enveloppe : max 19,65 (n° 1), min 15,00 (n° 3).

## ELS

- Caractéristique (6.14b), Q dominante : G + Q + 0,5 S + 0,6 W → 10 + 5 + 1,5 − 2,4 = **14,10**.
- Fréquente (6.15b), Q dominante : G + 0,5 Q + 0 S + 0 W → 10 + 2,5 = **12,50**.
- Quasi permanente (6.16b) : G + 0,3 Q → 10 + 1,5 = **11,50**.

L'outil rend ces valeurs (vérifié dans la page le 2026-10-23 ; tests
`tests/combinaisons.test.ts` et `tests/app/vue-et-export.test.ts`).
