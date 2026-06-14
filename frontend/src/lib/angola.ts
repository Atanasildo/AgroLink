/**
 * Divisão político-administrativa de Angola — 21 províncias (Lei aprovada pela
 * Assembleia Nacional em Junho de 2026: divisão de Cuando Cubango → Cuando + Cubango,
 * Moxico → Moxico + Moxico Leste, Luanda → Luanda + Icolo e Bengo).
 *
 * Municípios baseados na divisão administrativa oficial.
 */

export const MUNICIPIOS_POR_PROVINCIA: Record<string, string[]> = {
  "Bengo": [
    "Ambriz", "Bula Atumba", "Dande", "Dembos", "Nambuangongo", "Pango Aluquém",
  ],
  "Benguela": [
    "Baía Farta", "Balombo", "Benguela", "Bocoio", "Caimbambo", "Catumbela",
    "Chongorói", "Cubal", "Ganda", "Lobito",
  ],
  "Bié": [
    "Andulo", "Camacupa", "Catabola", "Chinguar", "Chitembo", "Cuemba",
    "Cunhinga", "Kuito", "Nharea",
  ],
  "Cabinda": [
    "Belize", "Buco-Zau", "Cabinda", "Cacongo",
  ],
  "Cuando": [
    "Cuangar", "Cuito Cuanavale", "Longa", "Mavinga", "Menongue",
  ],
  "Cuando Cubango": [
    "Calai", "Cuchi", "Dirico", "Nancova", "Rivungo",
  ],
  "Cuanza Norte": [
    "Ambaca", "Banga", "Bolongongo", "Cambambe", "Cazengo", "Golungo Alto",
    "Gonguembo", "Lucala", "Quiculungo", "Samba Caju",
  ],
  "Cuanza Sul": [
    "Amboim", "Cela", "Conda", "Ebo", "Kibala", "Libolo", "Mussende",
    "Porto Amboim", "Quilenda", "Seles", "Sumbe",
  ],
  "Cunene": [
    "Cahama", "Curoca", "Cuvelai", "Namacunde", "Ombadja", "Ondjiva",
  ],
  "Huambo": [
    "Bailundo", "Caála", "Catchiungo", "Chicala-Cholohanga", "Chinjenje",
    "Ecunha", "Huambo", "Londuimbali", "Longonjo", "Mungo",
    "Tchicala-Tcholoanga", "Ucuma",
  ],
  "Huíla": [
    "Caconda", "Caluquembe", "Chiange", "Chibia", "Chicomba", "Chipindo",
    "Cuvango", "Humpata", "Jamba", "Kuvango", "Lubango", "Matala",
    "Quilengues", "Quipungo",
  ],
  "Icolo e Bengo": [
    "Cacuaco", "Cazenga", "Icolo e Bengo", "Viana",
  ],
  "Luanda": [
    "Belas", "Kilamba Kiaxi", "Luanda", "Maianga", "Município de Luanda",
    "Rangel", "Sambizanga",
  ],
  "Lunda Norte": [
    "Cambulo", "Capenda-Camulemba", "Caungula", "Chitato", "Cuango",
    "Cuilo", "Lubalo", "Lucapa", "Xa-Muteba",
  ],
  "Lunda Sul": [
    "Cacolo", "Dala", "Muconda", "Saurimo",
  ],
  "Malanje": [
    "Cacuso", "Calandula", "Cambundi-Catembo", "Cangandala", "Caombo",
    "Cunda-Dia-Baze", "Kiwaba Nzoji", "Luquembo", "Malanje",
    "Marimba", "Massango", "Mucari", "Quela", "Quirima",
  ],
  "Moxico": [
    "Alto Zambeze", "Bundas", "Camanongue", "Léua", "Luchazes",
    "Luena", "Lutembo", "Moxico",
  ],
  "Moxico Leste": [
    "Caluango", "Lumeje", "Munhango",
  ],
  "Namibe": [
    "Bibala", "Camucuio", "Moçâmedes", "Tômbua", "Virei",
  ],
  "Uíge": [
    "Alto Cauale", "Ambuíla", "Bembe", "Buengas", "Bungo", "Damba",
    "Macocola", "Maquela do Zombo", "Milunga", "Mucaba", "Negage",
    "Puri", "Quimbele", "Quitexe", "Sanza Pombo", "Songo",
    "Uíge", "Zombo",
  ],
  "Zaire": [
    "Cuimba", "M'Banza Kongo", "Nóqui", "Soyo", "Tomboco",
  ],
};

export const PROVINCIAS: string[] = Object.keys(MUNICIPIOS_POR_PROVINCIA).sort();

export function getMunicipios(provincia: string): string[] {
  return MUNICIPIOS_POR_PROVINCIA[provincia] ?? [];
}
