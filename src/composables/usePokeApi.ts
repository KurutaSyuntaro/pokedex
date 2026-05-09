import {
  API_FORM_LIMIT,
  API_LIMIT,
  FETCH_CONCURRENCY,
  GENERATION_LABELS,
  GENERATION_LABEL_TO_KEY,
  GENERATION_ORDER,
} from "@/data/generations";
import {
  FORM_APPEARANCE_RULES,
  MOVE_METHOD_LABELS,
  MOVE_METHOD_ORDER,
  SPECIAL_BASE_NAME_FALLBACKS,
  SUPPORTED_FORM_RULES,
} from "@/data/formRules";
import { lookupJaOverride } from "@/data/jaNameOverrides";
import { POKEMON_TYPES } from "@/data/pokemonTypes";
import type {
  AppearanceData,
  EvolutionNode,
  FlavorTextEntry,
  MoveEntry,
  MoveGenerationOption,
  NamedApiResource,
  PokeApiAbility,
  PokeApiChainLink,
  PokeApiEvolutionChain,
  PokeApiEvolutionDetail,
  PokeApiNameEntry,
  PokeApiPokemon,
  PokeApiPokemonMove,
  PokeApiSpecies,
  Pokemon,
  TypeDamageRelations,
  TypeMatchupGroup,
  TypeRelationsPast,
  TypeWithPast,
  AbilityInfo,
  VersionGroupCacheEntry,
} from "@/types/pokemon";

const SPRITE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{}.png";
const SPRITE_SHINY_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/{}.png";
const SPRITE_FALLBACK_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{}.png";
const SPRITE_FALLBACK_SHINY_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{}.png";

const MOVE_NAME_CACHE_KEY = "pokedex-move-name-cache-v1";
const VERSION_CACHE_KEY = "pokedex-version-cache-v1";
const VERSION_GROUP_CACHE_KEY = "pokedex-version-group-cache-v1";
const TYPE_NAME_CACHE_KEY = "pokedex-type-name-cache-v1";
const ABILITY_NAME_CACHE_KEY = "pokedex-ability-name-cache-v1";
const POKEMON_LIST_CACHE_KEY = "pokedex-pokemon-list-cache-v1";
const SPECIES_NAME_CACHE_KEY = "pokedex-species-name-cache-v1";
const TYPE_INDEX_CACHE_KEY = "pokedex-type-index-cache-v1";
const POKEDEX_ENTRIES_CACHE_KEY = "pokedex-pokedex-entries-cache-v1";
const TYPE_DAMAGE_RELATIONS_CACHE_KEY =
  "pokedex-type-damage-relations-cache-v1";
const EVOLUTION_CHAIN_CACHE_KEY = "pokedex-evolution-chain-cache-v1";

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function chunk<T>(array: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

function readSessionCache<T = Record<string, unknown>>(key: string): T {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

function writeSessionCache(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function readLocalCache<T = Record<string, unknown>>(key: string): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

function writeLocalCache(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

function replaceId(template: string, id: number): string {
  return template.replace("{}", String(id));
}

function parseIdFromUrl(url: string): number {
  const match = String(url || "").match(/\/(\d+)\/?$/);
  return match ? Number.parseInt(match[1], 10) : Number.NaN;
}

function formatSlug(value: string): string {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findLocalizedText(entries: PokeApiNameEntry[] | undefined): string {
  const items = Array.isArray(entries) ? entries : [];
  const ja = items.find((entry) => entry.language?.name === "ja");
  if (ja?.name) return ja.name;
  const jaHrkt = items.find((entry) => entry.language?.name === "ja-Hrkt");
  if (jaHrkt?.name) return jaHrkt.name;
  return "";
}

function findJapaneseName(payload: PokeApiSpecies | null | undefined): string {
  const localized = findLocalizedText(payload?.names);
  if (localized) return localized;
  return payload?.name ? formatSlug(payload.name) : "";
}

interface SupportedForm {
  baseName: string;
  label: string;
  suffix: string;
}

function parseSupportedForm(name: string): SupportedForm | null {
  for (const rule of SUPPORTED_FORM_RULES) {
    if (name.endsWith(rule.suffix)) {
      return {
        baseName: name.slice(0, -rule.suffix.length),
        label: rule.label,
        suffix: rule.suffix,
      };
    }
  }
  return null;
}

function resolveDexIdFromBaseName(
  baseNameToDexId: Map<string, number>,
  baseName: string,
): number | undefined {
  const exact = baseNameToDexId.get(baseName);
  if (exact) return exact;
  const fallbackNames = SPECIAL_BASE_NAME_FALLBACKS[baseName] || [];
  for (const fallbackName of fallbackNames) {
    const fallbackDexId = baseNameToDexId.get(fallbackName);
    if (fallbackDexId) return fallbackDexId;
  }
  return undefined;
}

// ---------- Sprite helpers ----------

export function buildSpriteCandidates(
  id: number,
  dexId: number,
  isShiny: boolean,
): string[] {
  if (isShiny) {
    return [
      replaceId(SPRITE_SHINY_URL, id),
      replaceId(SPRITE_FALLBACK_SHINY_URL, id),
      replaceId(SPRITE_SHINY_URL, dexId),
      replaceId(SPRITE_FALLBACK_SHINY_URL, dexId),
      replaceId(SPRITE_URL, id),
      replaceId(SPRITE_FALLBACK_URL, id),
      replaceId(SPRITE_URL, dexId),
      replaceId(SPRITE_FALLBACK_URL, dexId),
    ];
  }
  return [
    replaceId(SPRITE_URL, id),
    replaceId(SPRITE_FALLBACK_URL, id),
    replaceId(SPRITE_URL, dexId),
    replaceId(SPRITE_FALLBACK_URL, dexId),
  ];
}

export function attachSpriteFallback(
  img: HTMLImageElement,
  candidates: string[],
): void {
  let index = 0;
  img.onerror = () => {
    index += 1;
    if (index >= candidates.length) {
      img.onerror = null;
      img.src = TRANSPARENT_PIXEL;
      return;
    }
    img.src = candidates[index];
  };
  img.src = candidates[0];
}

// ---------- 一覧 ----------

interface ListEntry {
  name: string;
  url: string;
}

function toNationalDexList(rawList: ListEntry[]): Pokemon[] {
  return rawList
    .map((entry): Pokemon | null => {
      const id = parseIdFromUrl(entry.url);
      if (!Number.isFinite(id) || id < 1 || id > API_LIMIT) {
        return null;
      }
      return {
        id,
        dexId: id,
        nameEn: entry.name,
        nameJa: lookupJaOverride(entry.name),
        isForm: false,
        formLabel: "",
      };
    })
    .filter((value): value is Pokemon => value !== null)
    .sort((a, b) => a.dexId - b.dexId);
}

function toFormDexList(
  rawList: ListEntry[],
  baseNameToDexId: Map<string, number>,
): Pokemon[] {
  const formList = rawList
    .map((entry): Pokemon | null => {
      const formId = parseIdFromUrl(entry.url);
      if (!Number.isFinite(formId) || formId <= API_LIMIT) {
        return null;
      }
      const form = parseSupportedForm(entry.name);
      if (!form) return null;
      const resolvedDexId = resolveDexIdFromBaseName(
        baseNameToDexId,
        form.baseName,
      );
      if (!resolvedDexId) return null;
      const baseJa = lookupJaOverride(form.baseName);
      return {
        id: formId,
        dexId: resolvedDexId,
        nameEn: entry.name,
        nameJa: `${baseJa} (${form.label})`,
        isForm: true,
        formLabel: form.label,
      };
    })
    .filter((value): value is Pokemon => value !== null)
    .sort((a, b) => (a.dexId !== b.dexId ? a.dexId - b.dexId : a.id - b.id));

  // シャリタツ メガ重複除去 (v1 と同じ)
  const tatsugiriMegaList = formList.filter(
    (pokemon) =>
      pokemon.dexId === 978 &&
      pokemon.formLabel === "メガ" &&
      pokemon.nameEn.startsWith("tatsugiri-") &&
      pokemon.nameEn.endsWith("-mega"),
  );
  const preferredTatsugiriMegaId =
    tatsugiriMegaList.find((pokemon) => pokemon.id === 10324)?.id ||
    tatsugiriMegaList[0]?.id;

  return formList.filter((pokemon) => {
    const isTatsugiriMega =
      pokemon.dexId === 978 &&
      pokemon.formLabel === "メガ" &&
      pokemon.nameEn.startsWith("tatsugiri-") &&
      pokemon.nameEn.endsWith("-mega");
    if (!isTatsugiriMega) return true;
    return pokemon.id === preferredTatsugiriMegaId;
  });
}

function mergeAndSortDexList(
  baseList: Pokemon[],
  formList: Pokemon[],
): Pokemon[] {
  return [...baseList, ...formList].sort((a, b) => {
    if (a.dexId !== b.dexId) return a.dexId - b.dexId;
    if (a.isForm !== b.isForm) return a.isForm ? 1 : -1;
    return a.id - b.id;
  });
}

/**
 * 全国図鑑リストを取得（日本語名は override のみ）。
 * 高速にリストを返すため、PokeAPI の pokemon-species は呼ばない。
 */
export async function fetchPokemonList(): Promise<Pokemon[]> {
  const cached = readSessionCache<{ list?: Pokemon[] }>(POKEMON_LIST_CACHE_KEY);
  if (cached.list && cached.list.length) {
    console.info(
      `[pokedex] list loaded from sessionStorage: ${cached.list.length} entries`,
    );
    return cached.list;
  }

  const startedAt = performance.now();
  console.info("[pokedex] fetching pokemon list (forms included)...");
  const url = `https://pokeapi.co/api/v2/pokemon?limit=${API_FORM_LIMIT}&offset=0`;
  const payload = await fetchJson<{ results: ListEntry[] }>(url);
  const rawList = payload.results || [];
  const baseList = toNationalDexList(rawList);
  const baseNameToDexId = new Map(baseList.map((p) => [p.nameEn, p.dexId]));
  const formList = toFormDexList(rawList, baseNameToDexId);
  const merged = mergeAndSortDexList(baseList, formList);
  writeSessionCache(POKEMON_LIST_CACHE_KEY, { list: merged });
  console.info(
    `[pokedex] list ready: ${merged.length} entries (${Math.round(performance.now() - startedAt)}ms)`,
  );
  return merged;
}

/**
 * 指定 dex 番号範囲の日本語名を取得。
 * - localStorage キャッシュを優先
 * - 不足分のみ PokeAPI に並列フェッチ
 * - 取得結果を localStorage に追記
 */
export async function fetchJapaneseNameMapForRange(
  minDexId: number,
  maxDexId: number,
  onProgress?: (map: Record<number, string>) => void,
): Promise<Record<number, string>> {
  const cache = readLocalCache<Record<string, string>>(SPECIES_NAME_CACHE_KEY);
  const result: Record<number, string> = {};

  const missingIds: number[] = [];
  for (let id = minDexId; id <= maxDexId; id += 1) {
    const cached = cache[String(id)];
    if (cached) {
      result[id] = cached;
    } else {
      missingIds.push(id);
    }
  }

  if (onProgress && Object.keys(result).length) {
    onProgress({ ...result });
  }

  if (!missingIds.length) {
    return result;
  }

  console.info(
    `[pokedex] fetching JA names for #${minDexId}-#${maxDexId}: ${missingIds.length} missing (cached ${Object.keys(result).length})`,
  );
  const startedAt = performance.now();
  let fetched = 0;

  for (const group of chunk(missingIds, FETCH_CONCURRENCY)) {
    const results = await Promise.all(
      group.map(async (id): Promise<[number, string]> => {
        try {
          const payload = await fetchJson<PokeApiSpecies>(
            `https://pokeapi.co/api/v2/pokemon-species/${id}`,
          );
          return [id, findJapaneseName(payload)];
        } catch {
          return [id, ""];
        }
      }),
    );
    for (const [id, nameJa] of results) {
      if (nameJa) {
        result[id] = nameJa;
        cache[String(id)] = nameJa;
      }
    }
    fetched += group.length;
    writeLocalCache(SPECIES_NAME_CACHE_KEY, cache);
    if (onProgress) {
      onProgress({ ...result });
    }
    console.info(
      `[pokedex] JA names progress: ${fetched}/${missingIds.length} (${Math.round(performance.now() - startedAt)}ms)`,
    );
  }

  return result;
}

/**
 * 指定タイプ（例: "fire"）に属するポケモンの英語名集合を取得。
 * sessionStorage キャッシュを利用し、同一タイプは 1 リクエストのみ。
 */
export async function fetchPokemonNamesByType(
  typeName: string,
): Promise<Set<string>> {
  const cache =
    readSessionCache<Record<string, string[]>>(TYPE_INDEX_CACHE_KEY);
  if (cache[typeName]) {
    return new Set(cache[typeName]);
  }

  const startedAt = performance.now();
  console.info(`[pokedex] fetching type index: ${typeName}`);
  const payload = await fetchJson<{
    pokemon?: { pokemon: { name: string; url: string } }[];
  }>(`https://pokeapi.co/api/v2/type/${typeName}`);

  const names = (payload.pokemon || [])
    .map((entry) => entry.pokemon?.name)
    .filter((name): name is string => Boolean(name));

  cache[typeName] = names;
  writeSessionCache(TYPE_INDEX_CACHE_KEY, cache);
  console.info(
    `[pokedex] type index ready: ${typeName} = ${names.length} names (${Math.round(performance.now() - startedAt)}ms)`,
  );
  return new Set(names);
}

/**
 * 指定された地方図鑑（PokeAPI のスラッグ）に登録されている species の
 * 「英語名 -> エントリー番号」マップを取得。
 * localStorage キャッシュを利用。
 */
export async function fetchPokedexEntries(
  pokedexName: string,
): Promise<Record<string, number>> {
  const cache = readLocalCache<Record<string, Record<string, number>>>(
    POKEDEX_ENTRIES_CACHE_KEY,
  );
  if (cache[pokedexName]) {
    return cache[pokedexName];
  }

  const startedAt = performance.now();
  console.info(`[pokedex] fetching pokedex entries: ${pokedexName}`);
  const payload = await fetchJson<{
    pokemon_entries?: {
      entry_number: number;
      pokemon_species: { name: string; url: string };
    }[];
  }>(`https://pokeapi.co/api/v2/pokedex/${pokedexName}`);

  const entries: Record<string, number> = {};
  for (const entry of payload.pokemon_entries || []) {
    const speciesName = entry.pokemon_species?.name;
    if (!speciesName) continue;
    entries[speciesName] = entry.entry_number;
  }

  cache[pokedexName] = entries;
  writeLocalCache(POKEDEX_ENTRIES_CACHE_KEY, cache);
  console.info(
    `[pokedex] pokedex entries ready: ${pokedexName} = ${Object.keys(entries).length} (${Math.round(performance.now() - startedAt)}ms)`,
  );
  return entries;
}

// ---------- 詳細 ----------

export async function fetchPokemonDetail(
  nameOrId: string,
): Promise<PokeApiPokemon> {
  return fetchJson<PokeApiPokemon>(
    `https://pokeapi.co/api/v2/pokemon/${nameOrId}`,
  );
}

export async function fetchSpeciesDetail(
  speciesUrl: string,
): Promise<PokeApiSpecies> {
  return fetchJson<PokeApiSpecies>(speciesUrl);
}

async function fetchResourceNameMap(
  items: (string | undefined)[],
  cacheKey: string,
  endpoint: string,
): Promise<Record<string, string>> {
  const cache = readSessionCache<Record<string, string>>(cacheKey);
  const uniqueNames = [
    ...new Set(items.filter((v): v is string => Boolean(v))),
  ];
  const missingNames = uniqueNames.filter((name) => !cache[name]);

  for (const group of chunk(missingNames, FETCH_CONCURRENCY)) {
    const results = await Promise.all(
      group.map(async (name): Promise<[string, string]> => {
        const payload = await fetchJson<{ names?: PokeApiNameEntry[] }>(
          `https://pokeapi.co/api/v2/${endpoint}/${name}`,
        );
        const localized = findLocalizedText(payload.names) || formatSlug(name);
        return [name, localized];
      }),
    );
    for (const [name, localized] of results) {
      cache[name] = localized;
    }
  }
  writeSessionCache(cacheKey, cache);
  return cache;
}

export function fetchTypeNameMap(
  types: string[],
): Promise<Record<string, string>> {
  return fetchResourceNameMap(types, TYPE_NAME_CACHE_KEY, "type");
}

export function fetchAbilityNameMap(
  abilities: string[],
): Promise<Record<string, string>> {
  return fetchResourceNameMap(abilities, ABILITY_NAME_CACHE_KEY, "ability");
}

const ABILITY_INFO_CACHE_KEY = "pokedex-ability-info-cache-v1";

/**
 * 特性の日本語名 + 日本語フレーバー説明文を取得（sessionStorage キャッシュ）。
 */
export async function fetchAbilityInfoMap(
  abilities: string[],
): Promise<Record<string, AbilityInfo>> {
  const cache = readSessionCache<Record<string, AbilityInfo>>(
    ABILITY_INFO_CACHE_KEY,
  );
  const uniqueNames = [...new Set(abilities.filter(Boolean))];
  const missing = uniqueNames.filter((n) => !cache[n]);

  for (const group of chunk(missing, FETCH_CONCURRENCY)) {
    const results = await Promise.all(
      group.map(async (name): Promise<[string, AbilityInfo]> => {
        const payload = await fetchJson<PokeApiAbility>(
          `https://pokeapi.co/api/v2/ability/${name}`,
        );
        const nameJa = findLocalizedText(payload.names) || formatSlug(name);
        // ja-Hrkt 優先、次に ja。最新の version_group のものを採用
        const flavors = (payload.flavor_text_entries || []).filter(
          (e) => e.language?.name === "ja-Hrkt" || e.language?.name === "ja",
        );
        const preferred =
          [...flavors].reverse().find((e) => e.language?.name === "ja-Hrkt") ||
          flavors.at(-1);
        const flavorJa = (preferred?.flavor_text || "")
          .replace(/[\n\f\u00ad]+/g, " ")
          .trim();
        return [name, { key: name, nameJa, flavorJa }];
      }),
    );
    for (const [name, info] of results) {
      cache[name] = info;
    }
  }
  if (missing.length) writeSessionCache(ABILITY_INFO_CACHE_KEY, cache);
  return Object.fromEntries(uniqueNames.map((n) => [n, cache[n]]));
}

const NAMED_RESOURCE_LABEL_CACHE_KEY = "pokedex-named-resource-label-cache-v1";

/**
 * 任意エンドポイント（egg-group / growth-rate など）の日本語名を取得。
 */
export async function fetchNamedResourceLabels(
  endpoint: string,
  names: string[],
): Promise<Record<string, string>> {
  const all = readSessionCache<Record<string, Record<string, string>>>(
    NAMED_RESOURCE_LABEL_CACHE_KEY,
  );
  const cache = all[endpoint] || {};
  const unique = [...new Set(names.filter(Boolean))];
  const missing = unique.filter((n) => !cache[n]);
  for (const group of chunk(missing, FETCH_CONCURRENCY)) {
    const results = await Promise.all(
      group.map(async (name): Promise<[string, string]> => {
        try {
          const payload = await fetchJson<{ names?: PokeApiNameEntry[] }>(
            `https://pokeapi.co/api/v2/${endpoint}/${name}`,
          );
          return [name, findLocalizedText(payload.names) || formatSlug(name)];
        } catch {
          return [name, formatSlug(name)];
        }
      }),
    );
    for (const [n, label] of results) cache[n] = label;
  }
  if (missing.length) {
    all[endpoint] = cache;
    writeSessionCache(NAMED_RESOURCE_LABEL_CACHE_KEY, all);
  }
  return Object.fromEntries(unique.map((n) => [n, cache[n]]));
}

export async function fetchMoveNameMap(
  moves: PokeApiPokemonMove[],
): Promise<Record<string, string>> {
  const cache = readSessionCache<Record<string, string>>(MOVE_NAME_CACHE_KEY);
  const uniqueMoveNames = [
    ...new Set(moves.map((entry) => entry.move?.name).filter(Boolean)),
  ];
  const missingNames = uniqueMoveNames.filter((name) => !cache[name]);

  for (const group of chunk(missingNames, FETCH_CONCURRENCY)) {
    const results = await Promise.all(
      group.map(async (moveName): Promise<[string, string]> => {
        const payload = await fetchJson<{ names?: PokeApiNameEntry[] }>(
          `https://pokeapi.co/api/v2/move/${moveName}`,
        );
        const localized =
          findLocalizedText(payload.names) || formatSlug(moveName);
        return [moveName, localized];
      }),
    );
    for (const [moveName, localized] of results) {
      cache[moveName] = localized;
    }
  }
  writeSessionCache(MOVE_NAME_CACHE_KEY, cache);
  return cache;
}

function normalizeVersionGroupCacheEntry(
  detail: Partial<VersionGroupCacheEntry> | undefined,
): VersionGroupCacheEntry | null {
  if (!detail) return null;
  const generationLabel = detail.generationLabel || "";
  const generationKey =
    detail.generationKey || GENERATION_LABEL_TO_KEY[generationLabel] || "";
  const versions = Array.isArray(detail.versions) ? detail.versions : [];
  return { generationKey, generationLabel, versions };
}

function getFormAppearanceFallback(form: SupportedForm | null) {
  if (!form) return null;
  return (
    FORM_APPEARANCE_RULES.find((rule) => rule.suffix === form.suffix) || null
  );
}

export async function fetchAppearanceData(
  pokemon: PokeApiPokemon,
  species: PokeApiSpecies,
): Promise<AppearanceData> {
  const versionCache =
    readSessionCache<Record<string, { label: string }>>(VERSION_CACHE_KEY);
  const versionGroupCache = readSessionCache<
    Record<string, VersionGroupCacheEntry>
  >(VERSION_GROUP_CACHE_KEY);

  const versionGroupNames = [
    ...new Set(
      (pokemon.moves || [])
        .flatMap((move) => move.version_group_details || [])
        .map((detail) => detail.version_group?.name)
        .filter((v): v is string => Boolean(v)),
    ),
  ];

  const missingVersionGroups = versionGroupNames.filter((name) => {
    const normalized = normalizeVersionGroupCacheEntry(versionGroupCache[name]);
    if (!normalized) return true;
    versionGroupCache[name] = normalized;
    return !normalized.generationKey || !normalized.versions.length;
  });

  for (const group of chunk(missingVersionGroups, FETCH_CONCURRENCY)) {
    const results = await Promise.all(
      group.map(
        async (versionGroupName): Promise<[string, VersionGroupCacheEntry]> => {
          const payload = await fetchJson<{
            generation?: { name: string };
            versions?: { name: string }[];
          }>(`https://pokeapi.co/api/v2/version-group/${versionGroupName}`);
          const generationKey = payload.generation?.name || "";
          return [
            versionGroupName,
            {
              generationKey,
              generationLabel:
                GENERATION_LABELS[generationKey] ||
                formatSlug(generationKey || "unknown"),
              versions: (payload.versions || []).map((entry) => entry.name),
            },
          ];
        },
      ),
    );
    for (const [name, detail] of results) {
      versionGroupCache[name] = detail;
    }
  }
  writeSessionCache(VERSION_GROUP_CACHE_KEY, versionGroupCache);

  const versionNames = [
    ...new Set(
      versionGroupNames.flatMap(
        (versionGroupName) =>
          versionGroupCache[versionGroupName]?.versions || [],
      ),
    ),
  ];
  const missingVersions = versionNames.filter((name) => !versionCache[name]);

  for (const group of chunk(missingVersions, FETCH_CONCURRENCY)) {
    const results = await Promise.all(
      group.map(async (versionName): Promise<[string, { label: string }]> => {
        const payload = await fetchJson<{ names?: PokeApiNameEntry[] }>(
          `https://pokeapi.co/api/v2/version/${versionName}`,
        );
        return [
          versionName,
          {
            label: findLocalizedText(payload.names) || formatSlug(versionName),
          },
        ];
      }),
    );
    for (const [name, detail] of results) {
      versionCache[name] = detail;
    }
  }
  writeSessionCache(VERSION_CACHE_KEY, versionCache);

  const generations: string[] = [];
  const seenGenerations = new Set<string>();
  const versions: string[] = [];
  const seenVersions = new Set<string>();
  let latestGenerationKey = "";
  let latestGenerationLabel = "";

  versionGroupNames.forEach((versionGroupName) => {
    const versionGroupDetail = normalizeVersionGroupCacheEntry(
      versionGroupCache[versionGroupName],
    );
    if (!versionGroupDetail) return;

    if (
      versionGroupDetail.generationLabel &&
      !seenGenerations.has(versionGroupDetail.generationLabel)
    ) {
      seenGenerations.add(versionGroupDetail.generationLabel);
      generations.push(versionGroupDetail.generationLabel);
    }

    const generationRank =
      GENERATION_ORDER[versionGroupDetail.generationKey] || 0;
    const latestRank = GENERATION_ORDER[latestGenerationKey] || 0;
    if (generationRank > latestRank) {
      latestGenerationKey = versionGroupDetail.generationKey;
      latestGenerationLabel = versionGroupDetail.generationLabel;
    }

    for (const versionName of versionGroupDetail.versions || []) {
      const localizedVersion = versionCache[versionName]?.label;
      if (localizedVersion && !seenVersions.has(localizedVersion)) {
        seenVersions.add(localizedVersion);
        versions.push(localizedVersion);
      }
    }
  });

  if (!generations.length && !versions.length) {
    const form = parseSupportedForm(pokemon.name);
    const formFallback = getFormAppearanceFallback(form);
    const versionGroupMap: Record<string, VersionGroupCacheEntry> =
      Object.fromEntries(
        versionGroupNames.map((name) => [name, versionGroupCache[name]]),
      );
    if (formFallback) {
      return {
        generations: formFallback.generations.slice(),
        versions: formFallback.versions.slice(),
        latestGenerationKey: "",
        latestGenerationLabel:
          formFallback.generations[formFallback.generations.length - 1] ||
          "世代情報なし",
        versionGroupMap,
      };
    }
    const baseGenerationKey = species.generation?.name || "";
    const baseGeneration =
      GENERATION_LABELS[baseGenerationKey] ||
      formatSlug(baseGenerationKey || "unknown");
    if (baseGeneration && baseGeneration !== "Unknown") {
      generations.push(baseGeneration);
      latestGenerationKey = baseGenerationKey;
      latestGenerationLabel = baseGeneration;
    }
  }

  return {
    generations,
    versions,
    latestGenerationKey,
    latestGenerationLabel: latestGenerationLabel || "世代情報なし",
    versionGroupMap: Object.fromEntries(
      versionGroupNames.map((name) => [name, versionGroupCache[name]]),
    ),
  };
}

// ---------- 技 ----------

function getLatestMoveMeta(
  move: PokeApiPokemonMove,
  versionGroupMap: Record<string, VersionGroupCacheEntry>,
  targetGenerationKey: string,
  targetGenerationLabel: string,
): {
  methodKey: string;
  methodLabel: string;
  text: string;
  level: number | null;
} | null {
  const details = Array.isArray(move.version_group_details)
    ? move.version_group_details
    : [];
  if (!details.length) return null;

  const latestInTargetGeneration = details
    .filter((detail) => {
      const versionGroupName = detail.version_group?.name;
      const versionGroupDetail = versionGroupMap[versionGroupName];
      return (
        versionGroupDetail &&
        versionGroupDetail.generationKey === targetGenerationKey
      );
    })
    .at(-1);

  if (!latestInTargetGeneration) return null;

  const latest = latestInTargetGeneration;
  const methodKey = latest.move_learn_method?.name || "other";
  const method = MOVE_METHOD_LABELS[methodKey] || formatSlug(methodKey);
  const versionGroup = latest.version_group
    ? formatSlug(latest.version_group.name)
    : "Unknown";
  const level = latest.level_learned_at > 0 ? latest.level_learned_at : null;
  const levelText = level ? `Lv.${level}` : method;
  return {
    methodKey,
    methodLabel: method,
    text: `${levelText} / ${targetGenerationLabel} / ${versionGroup}`,
    level,
  };
}

export function buildMoveRecords(
  pokemon: PokeApiPokemon,
  moveNameMap: Record<string, string>,
  versionGroupMap: Record<string, VersionGroupCacheEntry>,
  targetGenerationKey: string,
  targetGenerationLabel: string,
): MoveEntry[] {
  if (!targetGenerationKey) return [];
  return pokemon.moves
    .map((entry): MoveEntry | null => {
      const moveNameEn = formatSlug(entry.move?.name || "unknown");
      const meta = getLatestMoveMeta(
        entry,
        versionGroupMap,
        targetGenerationKey,
        targetGenerationLabel,
      );
      if (!meta) return null;
      return {
        nameJa: moveNameMap[entry.move?.name] || moveNameEn,
        nameEn: moveNameEn,
        methodKey: MOVE_METHOD_ORDER.includes(meta.methodKey)
          ? meta.methodKey
          : "other",
        methodLabel: meta.methodLabel || "その他",
        meta: meta.text,
        level: meta.level,
      };
    })
    .filter((value): value is MoveEntry => value !== null)
    .sort((a, b) => a.nameJa.localeCompare(b.nameJa, "ja"));
}

export function collectMoveGenerationOptions(
  pokemon: PokeApiPokemon,
  versionGroupMap: Record<string, VersionGroupCacheEntry>,
): MoveGenerationOption[] {
  const seen = new Set<string>();
  const options: MoveGenerationOption[] = [];

  for (const move of pokemon.moves || []) {
    for (const detail of move.version_group_details || []) {
      const versionGroupName = detail.version_group?.name;
      const versionGroupDetail = normalizeVersionGroupCacheEntry(
        versionGroupMap[versionGroupName],
      );
      if (!versionGroupDetail || !versionGroupDetail.generationKey) continue;
      const key = versionGroupDetail.generationKey;
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({
        key,
        label:
          versionGroupDetail.generationLabel ||
          GENERATION_LABELS[key] ||
          formatSlug(key),
      });
    }
  }

  return options.sort((a, b) => {
    const rankA = GENERATION_ORDER[a.key] || 0;
    const rankB = GENERATION_ORDER[b.key] || 0;
    return rankA - rankB;
  });
}

export function findSpeciesGenusJa(species: PokeApiSpecies): string {
  return (
    species.genera?.find((entry) => entry.language?.name === "ja")?.genus || ""
  );
}

export function generationLabelFor(generationKey: string): string {
  return (
    GENERATION_LABELS[generationKey] || formatSlug(generationKey || "unknown")
  );
}

export function parseFormFromName(name: string) {
  return parseSupportedForm(name);
}

// ---------- タイプ相性 ----------

/**
 * 指定タイプ（防御側）の damage_relations を取得。
 * past_damage_relations も保持し、世代別ルックアップに使う。
 * localStorage に永続キャッシュ（タイプは18種で固定なので長期キャッシュ可）。
 */
export async function fetchTypeDamageRelations(
  typeNames: string[],
): Promise<Record<string, TypeWithPast>> {
  const cache = readLocalCache<Record<string, TypeWithPast>>(
    TYPE_DAMAGE_RELATIONS_CACHE_KEY,
  );
  const unique = [...new Set(typeNames.filter(Boolean))];
  const missing = unique.filter((name) => {
    const entry = cache[name];
    // 旧形式（damage_relations 直接）から past_damage_relations 付きへ
    return (
      !entry || !Array.isArray((entry as TypeWithPast).past_damage_relations)
    );
  });

  for (const group of chunk(missing, FETCH_CONCURRENCY)) {
    const results = await Promise.all(
      group.map(async (name): Promise<[string, TypeWithPast]> => {
        const payload = await fetchJson<{
          damage_relations: TypeDamageRelations;
          past_damage_relations?: TypeRelationsPast[];
        }>(`https://pokeapi.co/api/v2/type/${name}`);
        return [
          name,
          {
            damage_relations: payload.damage_relations,
            past_damage_relations: payload.past_damage_relations || [],
          },
        ];
      }),
    );
    for (const [name, rel] of results) {
      cache[name] = rel;
    }
  }
  if (missing.length) {
    writeLocalCache(TYPE_DAMAGE_RELATIONS_CACHE_KEY, cache);
  }
  return Object.fromEntries(unique.map((n) => [n, cache[n]]));
}

/**
 * past_damage_relations は「この世代まで」の旧仕様。
 * 指定世代で有効な damage_relations を返す。
 */
function resolveDamageRelationsForGeneration(
  type: TypeWithPast | undefined,
  generationKey: string,
): TypeDamageRelations | undefined {
  if (!type) return undefined;
  const rank = GENERATION_ORDER[generationKey] || 0;
  if (!rank) return type.damage_relations;
  // past_damage_relations は世代の昇順とは限らないので並べ替え
  const past = (type.past_damage_relations || [])
    .map((p) => ({
      rank: GENERATION_ORDER[p.generation?.name || ""] || 0,
      relations: p.damage_relations,
    }))
    .filter((p) => p.rank > 0)
    .sort((a, b) => a.rank - b.rank);
  for (const entry of past) {
    if (rank <= entry.rank) return entry.relations;
  }
  return type.damage_relations;
}

const MATCHUP_GROUP_DEFS: {
  multiplier: number;
  label: string;
  variant: TypeMatchupGroup["variant"];
}[] = [
  { multiplier: 4, label: "4倍弱点", variant: "weak4" },
  { multiplier: 2, label: "2倍弱点", variant: "weak2" },
  { multiplier: 0.5, label: "1/2 (0.5倍)", variant: "half" },
  { multiplier: 0.25, label: "1/4 (0.25倍)", variant: "quarter" },
  { multiplier: 0, label: "無効 (0倍)", variant: "immune" },
];

/**
 * 防御側タイプ（最大2つ）から、攻撃側18タイプそれぞれの被ダメージ倍率を計算し、
 * 表示用にグルーピングして返す。等倍はノイズなので除外。
 * generationKey を渡すとその世代の damage_relations を使用。
 */
export function computeTypeMatchups(
  defenderTypes: string[],
  damageRelations: Record<string, TypeWithPast>,
  generationKey = "",
): TypeMatchupGroup[] {
  const allAttackTypes = POKEMON_TYPES.map((t) => t.value);
  const multipliers = new Map<string, number>();

  for (const atk of allAttackTypes) {
    let factor = 1;
    for (const def of defenderTypes) {
      const rel = generationKey
        ? resolveDamageRelationsForGeneration(
            damageRelations[def],
            generationKey,
          )
        : damageRelations[def]?.damage_relations;
      if (!rel) continue;
      if (rel.no_damage_from?.some((t) => t.name === atk)) {
        factor *= 0;
      } else if (rel.double_damage_from?.some((t) => t.name === atk)) {
        factor *= 2;
      } else if (rel.half_damage_from?.some((t) => t.name === atk)) {
        factor *= 0.5;
      }
    }
    multipliers.set(atk, factor);
  }

  return MATCHUP_GROUP_DEFS.map((def) => ({
    multiplier: def.multiplier,
    label: def.label,
    variant: def.variant,
    types: allAttackTypes
      .filter((atk) => multipliers.get(atk) === def.multiplier)
      .map((atk) => ({
        value: atk,
        label: POKEMON_TYPES.find((t) => t.value === atk)?.label || atk,
      })),
  })).filter((group) => group.types.length > 0);
}

// ---------- 進化チェイン ----------

const TIME_OF_DAY_LABELS: Record<string, string> = {
  day: "昼",
  night: "夜",
  dusk: "夕方",
};

const TRIGGER_LABELS: Record<string, string> = {
  "level-up": "レベルアップ",
  trade: "通信交換",
  "use-item": "道具使用",
  shed: "ぬけがら",
  spin: "回転",
  "tower-of-darkness": "あくのとう",
  "tower-of-waters": "みずのとう",
  "three-critical-hits": "急所3回",
  "take-damage": "ダメージを受けて",
  other: "特殊条件",
  "agile-style-move": "アジャイル習得",
  "strong-style-move": "ストロング習得",
  "recoil-damage": "反動ダメージ",
};

function describeEvolutionDetail(detail: PokeApiEvolutionDetail): string[] {
  const parts: string[] = [];
  if (detail.min_level != null) parts.push(`Lv.${detail.min_level}`);
  if (detail.trigger?.name && detail.trigger.name !== "level-up") {
    parts.push(
      TRIGGER_LABELS[detail.trigger.name] || formatSlug(detail.trigger.name),
    );
  }
  if (detail.item?.name) parts.push(`${formatSlug(detail.item.name)} 使用`);
  if (detail.held_item?.name)
    parts.push(`${formatSlug(detail.held_item.name)} を持たせる`);
  if (detail.known_move?.name)
    parts.push(`${formatSlug(detail.known_move.name)} 習得`);
  if (detail.known_move_type?.name)
    parts.push(`${formatSlug(detail.known_move_type.name)} タイプの技習得`);
  if (detail.location?.name)
    parts.push(`${formatSlug(detail.location.name)} で`);
  if (detail.party_species?.name)
    parts.push(`手持ちに ${formatSlug(detail.party_species.name)}`);
  if (detail.party_type?.name)
    parts.push(`手持ちに ${formatSlug(detail.party_type.name)} タイプ`);
  if (detail.trade_species?.name)
    parts.push(`${formatSlug(detail.trade_species.name)} と交換`);
  if (detail.min_happiness != null)
    parts.push(`なつき度 ${detail.min_happiness}+`);
  if (detail.min_beauty != null) parts.push(`美しさ ${detail.min_beauty}+`);
  if (detail.min_affection != null)
    parts.push(`なかよし度 ${detail.min_affection}+`);
  if (detail.time_of_day) {
    const tod = TIME_OF_DAY_LABELS[detail.time_of_day] || detail.time_of_day;
    parts.push(`${tod}`);
  }
  if (detail.gender === 1) parts.push("♀");
  else if (detail.gender === 2) parts.push("♂");
  if (detail.relative_physical_stats === 1) parts.push("こうげき > ぼうぎょ");
  else if (detail.relative_physical_stats === -1)
    parts.push("こうげき < ぼうぎょ");
  else if (detail.relative_physical_stats === 0)
    parts.push("こうげき = ぼうぎょ");
  if (detail.needs_overworld_rain) parts.push("雨天時");
  if (detail.turn_upside_down) parts.push("本体を逆さにする");
  return parts;
}

/** 進化チェイン JSON を取得 (sessionStorage キャッシュ) */
export async function fetchEvolutionChain(
  url: string,
): Promise<PokeApiEvolutionChain> {
  const cache = readSessionCache<Record<string, PokeApiEvolutionChain>>(
    EVOLUTION_CHAIN_CACHE_KEY,
  );
  if (cache[url]) return cache[url];
  const payload = await fetchJson<PokeApiEvolutionChain>(url);
  cache[url] = payload;
  writeSessionCache(EVOLUTION_CHAIN_CACHE_KEY, cache);
  return payload;
}

function collectSpeciesNames(link: PokeApiChainLink, acc: string[]): void {
  acc.push(link.species.name);
  for (const child of link.evolves_to || []) {
    collectSpeciesNames(child, acc);
  }
}

/**
 * チェイン中のすべての species の dex 番号 → 日本語名を解決。
 * 既存の SPECIES_NAME_CACHE_KEY (localStorage) を再利用。
 */
async function resolveChainSpeciesMeta(
  speciesNames: string[],
): Promise<Record<string, { id: number; nameJa: string }>> {
  const result: Record<string, { id: number; nameJa: string }> = {};
  const unique = [...new Set(speciesNames)];
  for (const group of chunk(unique, FETCH_CONCURRENCY)) {
    const responses = await Promise.all(
      group.map(async (name) => {
        try {
          const payload = await fetchJson<PokeApiSpecies>(
            `https://pokeapi.co/api/v2/pokemon-species/${name}`,
          );
          const nameJa =
            payload.names?.find((e) => e.language?.name === "ja-Hrkt")?.name ||
            payload.names?.find((e) => e.language?.name === "ja")?.name ||
            lookupJaOverride(name) ||
            formatSlug(name);
          return [name, { id: payload.id, nameJa }] as const;
        } catch {
          return [
            name,
            { id: 0, nameJa: lookupJaOverride(name) || formatSlug(name) },
          ] as const;
        }
      }),
    );
    for (const [name, meta] of responses) {
      result[name] = meta;
    }
  }
  return result;
}

function buildEvolutionNode(
  link: PokeApiChainLink,
  meta: Record<string, { id: number; nameJa: string }>,
): EvolutionNode {
  const m = meta[link.species.name] || {
    id: 0,
    nameJa: formatSlug(link.species.name),
  };
  const conditions: string[] = [];
  for (const detail of link.evolution_details || []) {
    const parts = describeEvolutionDetail(detail);
    if (parts.length) {
      conditions.push(parts.join(" / "));
    }
  }
  return {
    speciesName: link.species.name,
    speciesId: m.id,
    nameJa: m.nameJa,
    spriteCandidates: m.id ? buildSpriteCandidates(m.id, m.id, false) : [],
    isBaby: link.is_baby,
    conditions,
    children: (link.evolves_to || []).map((c) => buildEvolutionNode(c, meta)),
  };
}

/** チェイン URL から表示用ツリーを構築 */
export async function buildEvolutionTree(
  url: string,
): Promise<EvolutionNode | null> {
  try {
    const chain = await fetchEvolutionChain(url);
    const names: string[] = [];
    collectSpeciesNames(chain.chain, names);
    const meta = await resolveChainSpeciesMeta(names);
    return buildEvolutionNode(chain.chain, meta);
  } catch (error) {
    console.error("[pokedex] failed to build evolution tree", error);
    return null;
  }
}

// ---------- 世代別解決ヘルパー ----------

/**
 * 各世代の上限を表す。past_* は「この世代まで（以前）の値」のため、
 * 指定世代 ≤ 過去エントリ世代 ならその過去値を採用、なければ現行値。
 */
function resolveByGeneration<T>(
  pastEntries:
    | { generation?: NamedApiResource | null; payload: T }[]
    | undefined,
  current: T,
  generationKey: string,
): T {
  const rank = GENERATION_ORDER[generationKey] || 0;
  if (!rank || !pastEntries?.length) return current;
  const sorted = pastEntries
    .map((e) => ({
      rank: GENERATION_ORDER[e.generation?.name || ""] || 0,
      payload: e.payload,
    }))
    .filter((e) => e.rank > 0)
    .sort((a, b) => a.rank - b.rank);
  for (const e of sorted) {
    if (rank <= e.rank) return e.payload;
  }
  return current;
}

/** 指定世代における種族値を返す */
export function resolveStatsForGeneration(
  pokemon: PokeApiPokemon,
  generationKey: string,
): PokeApiPokemon["stats"] {
  const past = (pokemon.past_stats || []).map((p) => ({
    generation: p.generation,
    payload: p.stats,
  }));
  return resolveByGeneration(past, pokemon.stats, generationKey);
}

/** 指定世代におけるタイプを返す */
export function resolveTypesForGeneration(
  pokemon: PokeApiPokemon,
  generationKey: string,
): PokeApiPokemon["types"] {
  const past = (pokemon.past_types || []).map((p) => ({
    generation: p.generation,
    payload: p.types,
  }));
  return resolveByGeneration(past, pokemon.types, generationKey);
}

/** 指定世代における特性を返す（null スロットは現行から補完） */
export function resolveAbilitiesForGeneration(
  pokemon: PokeApiPokemon,
  generationKey: string,
): PokeApiPokemon["abilities"] {
  const rank = GENERATION_ORDER[generationKey] || 0;
  if (!rank || !pokemon.past_abilities?.length) return pokemon.abilities;
  const sorted = pokemon.past_abilities
    .map((p) => ({
      rank: GENERATION_ORDER[p.generation?.name || ""] || 0,
      abilities: p.abilities,
    }))
    .filter((e) => e.rank > 0)
    .sort((a, b) => a.rank - b.rank);
  for (const entry of sorted) {
    if (rank <= entry.rank) {
      // past_abilities はスロット単位の差分。現行から始めて該当スロットを上書き、
      // ability が null のスロットは「存在しなかった」とみなして除外。
      const merged = new Map<number, PokeApiPokemon["abilities"][number]>();
      for (const a of pokemon.abilities) merged.set(a.slot, a);
      for (const a of entry.abilities) {
        if (a.ability == null) {
          merged.delete(a.slot);
        } else {
          merged.set(a.slot, {
            slot: a.slot,
            ability: a.ability,
            is_hidden: a.is_hidden,
          });
        }
      }
      return [...merged.values()].sort((a, b) => a.slot - b.slot);
    }
  }
  return pokemon.abilities;
}

// ---------- 図鑑説明 (flavor text) ----------

/**
 * 日本語フレーバーテキストをバージョン別に整形して返す。
 * version-group 情報が必要なので appearanceData の versionGroupMap を参照。
 */
export function buildFlavorTextEntries(
  species: PokeApiSpecies,
  versionGroupMap: Record<string, VersionGroupCacheEntry>,
): FlavorTextEntry[] {
  const entries = (species.flavor_text_entries || []).filter(
    (e) => e.language?.name === "ja-Hrkt" || e.language?.name === "ja",
  );
  // ja-Hrkt 優先（重複バージョンは ja-Hrkt のみ採用）
  const seen = new Map<string, FlavorTextEntry>();
  for (const entry of entries) {
    const versionKey = entry.version?.name;
    if (!versionKey) continue;
    if (seen.has(versionKey) && entry.language?.name !== "ja-Hrkt") continue;
    // version -> version_group の対応を versionGroupMap から逆引き
    const versionGroupName = Object.keys(versionGroupMap).find((vg) =>
      versionGroupMap[vg]?.versions?.includes(versionKey),
    );
    const vg = versionGroupName ? versionGroupMap[versionGroupName] : null;
    seen.set(versionKey, {
      versionKey,
      versionLabel: formatSlug(versionKey),
      generationKey: vg?.generationKey || "",
      generationLabel: vg?.generationLabel || "",
      text: entry.flavor_text.replace(/[\n\f\u00ad]+/g, " ").trim(),
    });
  }
  // 世代→バージョン名順にソート
  return [...seen.values()].sort((a, b) => {
    const ra = GENERATION_ORDER[a.generationKey] || 99;
    const rb = GENERATION_ORDER[b.generationKey] || 99;
    if (ra !== rb) return ra - rb;
    return a.versionKey.localeCompare(b.versionKey);
  });
}

export { formatSlug };
