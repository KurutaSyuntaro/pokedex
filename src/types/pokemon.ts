export interface Pokemon {
  /** PokeAPI 上の id (フォルムは 10000 番台) */
  id: number;
  /** 全国図鑑番号 */
  dexId: number;
  nameEn: string;
  nameJa: string;
  isForm: boolean;
  formLabel: string;
  /** 表示用の図鑑番号 (地方図鑑選択時は地方図鑑のエントリー番号、未指定なら dexId を使用) */
  displayNumber?: number;
}

export interface MoveEntry {
  nameJa: string;
  nameEn: string;
  methodKey: string;
  methodLabel: string;
  meta: string;
  level: number | null;
}

export interface AppearanceData {
  generations: string[];
  versions: string[];
  latestGenerationKey: string;
  latestGenerationLabel: string;
  versionGroupMap: Record<string, VersionGroupCacheEntry>;
}

export interface VersionGroupCacheEntry {
  generationKey: string;
  generationLabel: string;
  versions: string[];
}

export interface MoveGenerationOption {
  key: string;
  label: string;
}

export interface PokemonDetailViewModel {
  pokemon: PokeApiPokemon;
  species: PokeApiSpecies;
  appearance: AppearanceData;
  moveNameMap: Record<string, string>;
  typeNameMap: Record<string, string>;
  abilityNameMap: Record<string, string>;
  moveGenerationOptions: MoveGenerationOption[];
}

// --- PokeAPI raw types (簡略) ---

export interface NamedApiResource {
  name: string;
  url: string;
}

export interface PokeApiNameEntry {
  name: string;
  language: NamedApiResource;
}

export interface PokeApiPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  species: NamedApiResource;
  types: { slot: number; type: NamedApiResource }[];
  abilities: { slot: number; ability: NamedApiResource }[];
  moves: PokeApiPokemonMove[];
  stats: PokeApiPokemonStat[];
}

export interface PokeApiPokemonStat {
  base_stat: number;
  effort: number;
  stat: NamedApiResource;
}

export interface StatEntry {
  key: string;
  label: string;
  value: number;
}

export interface PokeApiPokemonMove {
  move: NamedApiResource;
  version_group_details: PokeApiVersionGroupDetail[];
}

export interface PokeApiVersionGroupDetail {
  level_learned_at: number;
  move_learn_method: NamedApiResource;
  version_group: NamedApiResource;
}

export interface PokeApiSpecies {
  id: number;
  name: string;
  names?: PokeApiNameEntry[];
  generation?: NamedApiResource;
  genera?: { genus: string; language: NamedApiResource }[];
}
