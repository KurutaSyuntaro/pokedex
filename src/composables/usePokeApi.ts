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
import type {
  AppearanceData,
  MoveEntry,
  MoveGenerationOption,
  PokeApiNameEntry,
  PokeApiPokemon,
  PokeApiPokemonMove,
  PokeApiSpecies,
  Pokemon,
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

export { formatSlug };
