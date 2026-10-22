/**
 * Classeur Excel (.xlsx) minimal, sans dependance.
 *
 * Un .xlsx est une archive ZIP de fichiers XML (Office Open XML). Les
 * fichiers sont STOCKES sans compression : l'archive est un peu plus grosse,
 * mais aucune bibliotheque n'est necessaire, et Excel, LibreOffice et Numbers
 * l'ouvrent sans avertissement.
 *
 * Fonctions PURES : elles rendent des octets, le telechargement vit ailleurs.
 */

export type Cellule = string | number | null;

export interface Feuille {
  /** Nom de l'onglet : 31 caracteres au plus, sans []:*?/\ . */
  nom: string;
  lignes: Cellule[][];
}

// --- ZIP (methode « stored ») -------------------------------------------------

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (polynome 0xEDB88320), celui qu'exige le format ZIP. */
export function crc32(octets: Uint8Array): number {
  let c = 0xffffffff;
  for (const o of octets) c = TABLE_CRC[(c ^ o) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff];
}

function u32(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

/** Archive ZIP de fichiers stockes sans compression. */
export function zipSansCompression(fichiers: Array<{ nom: string; contenu: string }>): Uint8Array {
  const encodeur = new TextEncoder();
  const morceaux: number[] = [];
  const central: number[] = [];

  for (const f of fichiers) {
    const nom = encodeur.encode(f.nom);
    const donnees = encodeur.encode(f.contenu);
    const crc = crc32(donnees);
    const decalage = morceaux.length;
    // En-tete local : signature, version 2.0, drapeau UTF-8 (bit 11), methode 0.
    morceaux.push(...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21));
    morceaux.push(...u32(crc), ...u32(donnees.length), ...u32(donnees.length), ...u16(nom.length), ...u16(0));
    morceaux.push(...nom, ...donnees);
    // Entree du repertoire central.
    central.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21));
    central.push(...u32(crc), ...u32(donnees.length), ...u32(donnees.length), ...u16(nom.length));
    central.push(...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(decalage), ...nom);
  }

  const debutCentral = morceaux.length;
  const fin = [
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(fichiers.length), ...u16(fichiers.length),
    ...u32(central.length), ...u32(debutCentral), ...u16(0),
  ];
  return Uint8Array.from([...morceaux, ...central, ...fin]);
}

// --- SpreadsheetML -------------------------------------------------------------

function echapperXml(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Caracteres de controle interdits en XML 1.0.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

/** Lettre(s) de colonne : 0 -> A, 25 -> Z, 26 -> AA. */
export function colonne(indice: number): string {
  let n = indice + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cellule(valeur: Cellule, ref: string): string {
  if (valeur === null) return '';
  if (typeof valeur === 'number') {
    return Number.isFinite(valeur) ? `<c r="${ref}"><v>${valeur}</v></c>` : '';
  }
  // Chaine en ligne : pas de table de chaines partagees a tenir.
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${echapperXml(valeur)}</t></is></c>`;
}

function feuilleXml(f: Feuille): string {
  const lignes = f.lignes
    .map((l, i) => `<row r="${i + 1}">${l.map((v, j) => cellule(v, `${colonne(j)}${i + 1}`)).join('')}</row>`)
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${lignes}</sheetData></worksheet>`
  );
}

const NOM_INTERDIT = /[[\]:*?/\\]/g;

/** Nom d'onglet admis par Excel : caracteres interdits retires, 31 caracteres au plus, unique. */
function nomsDOnglets(feuilles: readonly Feuille[]): string[] {
  const vus = new Set<string>();
  return feuilles.map((f, i) => {
    let nom = f.nom.replace(NOM_INTERDIT, ' ').trim().slice(0, 31) || `Feuille ${i + 1}`;
    while (vus.has(nom.toLowerCase())) nom = `${nom.slice(0, 28)} ${i + 1}`;
    vus.add(nom.toLowerCase());
    return nom;
  });
}

/** Le classeur, pret a etre telecharge (type MIME xlsx). */
export function classeurXlsx(feuilles: readonly Feuille[]): Uint8Array {
  if (feuilles.length === 0) throw new Error('Un classeur exige au moins une feuille.');
  const noms = nomsDOnglets(feuilles);

  const types =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    feuilles
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('') +
    '</Types>';

  const relsRacine =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const classeur =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    noms.map((n, i) => `<sheet name="${echapperXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
    '</sheets></workbook>';

  const relsClasseur =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    feuilles
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join('') +
    '</Relationships>';

  return zipSansCompression([
    { nom: '[Content_Types].xml', contenu: types },
    { nom: '_rels/.rels', contenu: relsRacine },
    { nom: 'xl/workbook.xml', contenu: classeur },
    { nom: 'xl/_rels/workbook.xml.rels', contenu: relsClasseur },
    ...feuilles.map((f, i) => ({ nom: `xl/worksheets/sheet${i + 1}.xml`, contenu: feuilleXml(f) })),
  ]);
}
