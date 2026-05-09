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
  evolution_chain?: { url: string };
}

export interface PokeApiEvolutionDetail {
  trigger?: NamedApiResource;
  item?: NamedApiResource;
  held_item?: NamedApiResource;
  known_move?: NamedApiResource;
  known_move_type?: NamedApiResource;
  location?: NamedApiResource;
  party_species?: NamedApiResource;
  party_type?: NamedApiResource;
  trade_species?: NamedApiResource;
  min_level?: number | null;
  min_happiness?: number | null;
  min_beauty?: number | null;
  min_affection?: number | null;
  needs_overworld_rain?: boolean;
  turn_upside_down?: boolean;
  time_of_day?: string;
  gender?: number | null;
  relative_physical_stats?: number | null;
}

export interface PokeApiChainLink {
  is_baby: boolean;
  species: NamedApiResource;
  evolution_details: PokeApiEvolutionDetail[];
  evolves_to: PokeApiChainLink[];
}

export interface PokeApiEvolutionChain {
  id: number;
  baby_trigger_item: NamedApiResource | null;
  chain: PokeApiChainLink;
}

export interface EvolutionNode {
  speciesName: string;
  speciesId: number;
  nameJa: string;
  spriteCandidates: string[];
  isBaby: boolean;
  conditions: string[];
  children: EvolutionNode[];
}

export interface TypeDamageRelations {
  double_damage_from: NamedApiResource[];
  half_damage_from: NamedApiResource[];
  no_damage_from: NamedApiResource[];
}

export interface TypeMatchupType {
  value: string;
  label: string;
}

export interface TypeMatchupGroup {
  multiplier: number;
  label: string;
  variant: "weak4" | "weak2" | "half" | "quarter" | "immune";
  types: TypeMatchupType[];
}
