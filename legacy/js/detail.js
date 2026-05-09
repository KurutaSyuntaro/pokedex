'use strict';

const SPRITE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{}.png';
const SPRITE_SHINY_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/{}.png';
const SPRITE_FALLBACK_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{}.png';
const SPRITE_FALLBACK_SHINY_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{}.png';
const FETCH_CONCURRENCY = 16;
const MOVE_NAME_CACHE_KEY = 'pokedex-move-name-cache-v1';
const VERSION_CACHE_KEY = 'pokedex-version-cache-v1';
const VERSION_GROUP_CACHE_KEY = 'pokedex-version-group-cache-v1';
const TYPE_NAME_CACHE_KEY = 'pokedex-type-name-cache-v1';
const ABILITY_NAME_CACHE_KEY = 'pokedex-ability-name-cache-v1';

const SUPPORTED_FORM_RULES = [
  { suffix: '-curly-mega', label: 'メガ' },
  { suffix: '-droopy-mega', label: 'メガ' },
  { suffix: '-stretchy-mega', label: 'メガ' },
  { suffix: '-curly', label: 'そったすがた' },
  { suffix: '-droopy', label: 'たれたすがた' },
  { suffix: '-stretchy', label: 'のびたすがた' },
  { suffix: '-gmax', label: 'キョダイマックス' },
  { suffix: '-mega-x', label: 'メガX' },
  { suffix: '-mega-y', label: 'メガY' },
  { suffix: '-mega', label: 'メガ' },
  { suffix: '-primal', label: 'ゲンシカイキ' },
  { suffix: '-alola', label: 'アローラ' },
  { suffix: '-galar', label: 'ガラル' },
  { suffix: '-hisui', label: 'ヒスイ' },
  { suffix: '-paldea', label: 'パルデア' }
];

const GENERATION_LABELS = {
  'generation-i': '第1世代 カントー',
  'generation-ii': '第2世代 ジョウト',
  'generation-iii': '第3世代 ホウエン',
  'generation-iv': '第4世代 シンオウ',
  'generation-v': '第5世代 イッシュ',
  'generation-vi': '第6世代 カロス',
  'generation-vii': '第7世代 アローラ',
  'generation-viii': '第8世代 ガラル/ヒスイ',
  'generation-ix': '第9世代 パルデア'
};

const GENERATION_ORDER = {
  'generation-i': 1,
  'generation-ii': 2,
  'generation-iii': 3,
  'generation-iv': 4,
  'generation-v': 5,
  'generation-vi': 6,
  'generation-vii': 7,
  'generation-viii': 8,
  'generation-ix': 9
};

const GENERATION_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(GENERATION_LABELS).map(([key, label]) => [label, key])
);

const FORM_APPEARANCE_RULES = [
  { suffix: '-gmax', generations: ['第8世代 ガラル/ヒスイ'], versions: ['ソード', 'シールド'] },
  { suffix: '-mega-x', generations: ['第6世代 カロス'], versions: ['X', 'Y'] },
  { suffix: '-mega-y', generations: ['第6世代 カロス'], versions: ['X', 'Y'] },
  { suffix: '-mega', generations: ['第6世代 カロス'], versions: ['X', 'Y'] },
  { suffix: '-primal', generations: ['第6世代 カロス'], versions: ['オメガルビー', 'アルファサファイア'] },
  { suffix: '-alola', generations: ['第7世代 アローラ'], versions: ['サン', 'ムーン', 'ウルトラサン', 'ウルトラムーン'] },
  { suffix: '-galar', generations: ['第8世代 ガラル/ヒスイ'], versions: ['ソード', 'シールド'] },
  { suffix: '-hisui', generations: ['第8世代 ガラル/ヒスイ'], versions: ['Pokémon LEGENDS アルセウス'] },
  { suffix: '-paldea', generations: ['第9世代 パルデア'], versions: ['スカーレット', 'バイオレット'] },
  { suffix: '-curly', generations: ['第9世代 パルデア'], versions: ['スカーレット', 'バイオレット'] },
  { suffix: '-droopy', generations: ['第9世代 パルデア'], versions: ['スカーレット', 'バイオレット'] },
  { suffix: '-stretchy', generations: ['第9世代 パルデア'], versions: ['スカーレット', 'バイオレット'] },
  { suffix: '-curly-mega', generations: ['第9世代 パルデア'], versions: ['スカーレット', 'バイオレット'] },
  { suffix: '-droopy-mega', generations: ['第9世代 パルデア'], versions: ['スカーレット', 'バイオレット'] },
  { suffix: '-stretchy-mega', generations: ['第9世代 パルデア'], versions: ['スカーレット', 'バイオレット'] }
];

const MOVE_METHOD_LABELS = {
  'level-up': 'レベルアップ',
  machine: 'わざマシン',
  egg: 'タマゴわざ',
  tutor: '教え技',
  'form-change': 'フォルム変化',
  'light-ball-egg': '特別遺伝',
  'colosseum-purification': '特別習得',
  'xd-shadow': '特別習得',
  'stadium-surfing-pikachu': '特別習得'
};

const MOVE_METHOD_ORDER = [
  'level-up',
  'machine',
  'tutor',
  'egg',
  'form-change',
  'light-ball-egg',
  'colosseum-purification',
  'xd-shadow',
  'stadium-surfing-pikachu',
  'other'
];

const elements = {
  status: document.getElementById('detail-status'),
  shell: document.getElementById('detail-shell'),
  sprite: document.getElementById('detail-sprite'),
  number: document.getElementById('detail-number'),
  name: document.getElementById('detail-name'),
  subtitle: document.getElementById('detail-subtitle'),
  types: document.getElementById('detail-types'),
  generation: document.getElementById('detail-generation'),
  height: document.getElementById('detail-height'),
  weight: document.getElementById('detail-weight'),
  abilities: document.getElementById('detail-abilities'),
  appearanceGenerations: document.getElementById('detail-appearance-generations'),
  versions: document.getElementById('detail-versions'),
  versionNote: document.getElementById('detail-version-note'),
  moveGenerationSelect: document.getElementById('move-generation-select'),
  moveCount: document.getElementById('detail-move-count'),
  moves: document.getElementById('detail-moves'),
  shinyToggle: document.getElementById('shiny-toggle')
};

function chunk(array, size) {
  const result = [];
  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }
  return result;
}

function readSessionCache(key) {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSessionCache(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or availability failures.
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

function readQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    pokemon: params.get('pokemon') || '',
    dex: params.get('dex') || '',
    shiny: params.get('shiny') === '1'
  };
}

function replaceId(template, id) {
  return template.replace('{}', String(id));
}

function transparentPixelDataUrl() {
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
}

function buildSpriteCandidates(id, dexId, isShiny) {
  if (isShiny) {
    return [
      replaceId(SPRITE_SHINY_URL, id),
      replaceId(SPRITE_FALLBACK_SHINY_URL, id),
      replaceId(SPRITE_SHINY_URL, dexId),
      replaceId(SPRITE_FALLBACK_SHINY_URL, dexId),
      replaceId(SPRITE_URL, id),
      replaceId(SPRITE_FALLBACK_URL, id),
      replaceId(SPRITE_URL, dexId),
      replaceId(SPRITE_FALLBACK_URL, dexId)
    ];
  }

  return [
    replaceId(SPRITE_URL, id),
    replaceId(SPRITE_FALLBACK_URL, id),
    replaceId(SPRITE_URL, dexId),
    replaceId(SPRITE_FALLBACK_URL, dexId)
  ];
}

function setSpriteWithFallback(img, id, dexId, isShiny) {
  const candidates = buildSpriteCandidates(id, dexId, isShiny);
  let index = 0;

  img.onerror = () => {
    index += 1;
    if (index >= candidates.length) {
      img.onerror = null;
      img.src = transparentPixelDataUrl();
      return;
    }
    img.src = candidates[index];
  };

  img.src = candidates[index];
}

function formatSlug(value) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function findLocalizedText(entries) {
  const items = Array.isArray(entries) ? entries : [];
  const ja = items.find((entry) => entry.language && entry.language.name === 'ja');
  if (ja && ja.name) {
    return ja.name;
  }
  const jaHrkt = items.find((entry) => entry.language && entry.language.name === 'ja-Hrkt');
  if (jaHrkt && jaHrkt.name) {
    return jaHrkt.name;
  }
  return '';
}

function normalizeVersionGroupCacheEntry(detail) {
  if (!detail) {
    return null;
  }

  const generationLabel = detail.generationLabel || detail.generation || '';
  const generationKey = detail.generationKey || GENERATION_LABEL_TO_KEY[generationLabel] || '';
  const versions = Array.isArray(detail.versions) ? detail.versions : [];

  return {
    generationKey,
    generationLabel,
    versions
  };
}

function parseForm(name) {
  for (const rule of SUPPORTED_FORM_RULES) {
    if (name.endsWith(rule.suffix)) {
      return {
        baseName: name.slice(0, -rule.suffix.length),
        label: rule.label,
        suffix: rule.suffix
      };
    }
  }
  return null;
}

function getFormAppearanceFallback(form) {
  if (!form) {
    return null;
  }

  return FORM_APPEARANCE_RULES.find((rule) => rule.suffix === form.suffix) || null;
}

function findJapaneseName(payload) {
  const localized = findLocalizedText(payload && payload.names);
  if (localized) {
    return localized;
  }
  return payload && payload.name ? formatSlug(payload.name) : '';
}

function createTag(text) {
  const span = document.createElement('span');
  span.className = 'tag';
  span.textContent = text;
  return span;
}

async function fetchResourceNameMap(items, cacheKey, endpoint) {
  const cache = readSessionCache(cacheKey);
  const uniqueNames = [...new Set(items.filter(Boolean))];
  const missingNames = uniqueNames.filter((name) => !cache[name]);

  for (const group of chunk(missingNames, FETCH_CONCURRENCY)) {
    const results = await Promise.all(group.map(async (name) => {
      const payload = await fetchJson(`https://pokeapi.co/api/v2/${endpoint}/${name}`);
      const localized = findLocalizedText(payload.names) || formatSlug(name);
      return [name, localized];
    }));

    for (const [name, localized] of results) {
      cache[name] = localized;
    }
  }

  writeSessionCache(cacheKey, cache);
  return cache;
}

function getLatestMoveMeta(move, versionGroupMap, targetGenerationKey, targetGenerationLabel) {
  const details = Array.isArray(move.version_group_details) ? move.version_group_details : [];
  if (!details.length) {
    return null;
  }

  const latestInTargetGeneration = details
    .filter((detail) => {
      const versionGroupName = detail.version_group?.name;
      const versionGroupDetail = versionGroupMap[versionGroupName];
      return versionGroupDetail && versionGroupDetail.generationKey === targetGenerationKey;
    })
    .at(-1);

  if (!latestInTargetGeneration) {
    return null;
  }

  const latest = latestInTargetGeneration;
  const methodKey = latest.move_learn_method?.name || 'other';
  const method = MOVE_METHOD_LABELS[methodKey] || formatSlug(methodKey);
  const versionGroup = latest.version_group ? formatSlug(latest.version_group.name) : 'Unknown';
  const level = latest.level_learned_at > 0 ? latest.level_learned_at : null;
  const levelText = level ? `Lv.${level}` : method;
  return {
    methodKey,
    methodLabel: method,
    text: `${levelText} / ${targetGenerationLabel} / ${versionGroup}`,
    level
  };
}

function showError(message) {
  elements.status.textContent = message;
  elements.shell.hidden = true;
}

function renderOverview(pokemon, species, query, localizedNames) {
  const isShiny = Boolean(elements.shinyToggle.checked);
  const form = parseForm(pokemon.name);
  const japaneseBaseName = findJapaneseName(species);
  const displayName = form ? `${japaneseBaseName} (${form.label})` : japaneseBaseName;

  document.title = `${displayName} | ポケモン詳細`;
  elements.status.hidden = true;
  elements.shell.hidden = false;
  elements.number.textContent = `#${query.dex || species.id}`;
  elements.name.textContent = displayName;
  elements.subtitle.textContent = `${formatSlug(pokemon.name)} / ${species.genera?.find((entry) => entry.language?.name === 'ja')?.genus || ''}`;
  elements.generation.textContent = GENERATION_LABELS[species.generation?.name] || formatSlug(species.generation?.name || 'unknown');
  elements.height.textContent = `${pokemon.height / 10} m`;
  elements.weight.textContent = `${pokemon.weight / 10} kg`;
  elements.abilities.textContent = pokemon.abilities
    .slice()
    .sort((a, b) => Number(a.slot) - Number(b.slot))
    .map((entry) => localizedNames.abilities[entry.ability?.name] || formatSlug(entry.ability?.name || 'unknown'))
    .join(' / ');

  elements.types.innerHTML = '';
  pokemon.types
    .slice()
    .sort((a, b) => Number(a.slot) - Number(b.slot))
    .forEach((entry) => elements.types.appendChild(
      createTag(localizedNames.types[entry.type?.name] || formatSlug(entry.type?.name || 'unknown'))
    ));

  setSpriteWithFallback(elements.sprite, pokemon.id, Number(query.dex || species.id), isShiny);
  elements.sprite.alt = `${displayName} の画像`;
}

function renderAppearanceInfo(appearanceData) {
  elements.appearanceGenerations.innerHTML = '';
  elements.versions.innerHTML = '';

  if (!appearanceData.generations.length) {
    elements.appearanceGenerations.appendChild(createTag('出現世代情報なし'));
  } else {
    appearanceData.generations.forEach((generation) => {
      elements.appearanceGenerations.appendChild(createTag(generation));
    });
  }

  if (!appearanceData.versions.length) {
    elements.versions.appendChild(createTag('バージョン情報なし'));
  } else {
    appearanceData.versions.forEach((version) => {
      elements.versions.appendChild(createTag(version));
    });
  }

  elements.versionNote.textContent = `${appearanceData.generations.length}世代 / ${appearanceData.versions.length}作品に出現`;
}

function renderMoves(moves, latestGenerationLabel) {
  const grouped = new Map();

  for (const move of moves) {
    const bucket = grouped.get(move.methodKey) || [];
    bucket.push(move);
    grouped.set(move.methodKey, bucket);
  }

  elements.moveCount.textContent = `${moves.length}件 / ${latestGenerationLabel}`;
  elements.moves.innerHTML = '';

  for (const methodKey of MOVE_METHOD_ORDER) {
    const bucket = grouped.get(methodKey);
    if (!bucket || !bucket.length) {
      continue;
    }

    if (methodKey === 'level-up') {
      bucket.sort((a, b) => {
        const levelA = a.level ?? Number.MAX_SAFE_INTEGER;
        const levelB = b.level ?? Number.MAX_SAFE_INTEGER;
        if (levelA !== levelB) {
          return levelA - levelB;
        }
        return a.nameJa.localeCompare(b.nameJa, 'ja');
      });
    } else {
      bucket.sort((a, b) => a.nameJa.localeCompare(b.nameJa, 'ja'));
    }

    const section = document.createElement('section');
    section.className = 'move-group';

    const header = document.createElement('div');
    header.className = 'move-group-header';

    const title = document.createElement('h3');
    title.className = 'move-group-title';
    title.textContent = bucket[0].methodLabel;

    const count = document.createElement('span');
    count.className = 'move-group-count';
    count.textContent = `${bucket.length}件`;

    header.appendChild(title);
    header.appendChild(count);

    const list = document.createElement('ul');
    list.className = 'move-list';

    for (const move of bucket) {
      const item = document.createElement('li');
      item.className = 'move-item';

      const name = document.createElement('span');
      name.className = 'move-name';
      name.textContent = move.nameJa;

      const meta = document.createElement('span');
      meta.className = 'move-meta';
      meta.textContent = `${move.meta} / ${move.nameEn}`;

      item.appendChild(name);
      item.appendChild(meta);
      list.appendChild(item);
    }

    section.appendChild(header);
    section.appendChild(list);
    elements.moves.appendChild(section);
  }

  if (!elements.moves.childElementCount) {
    const empty = document.createElement('p');
    empty.className = 'card-note';
    empty.textContent = '習得技データがありません。';
    elements.moves.appendChild(empty);
  }
}

function collectMoveGenerationOptions(pokemon, versionGroupMap) {
  const seen = new Set();
  const options = [];

  for (const move of pokemon.moves || []) {
    for (const detail of move.version_group_details || []) {
      const versionGroupName = detail.version_group?.name;
      const versionGroupDetail = normalizeVersionGroupCacheEntry(versionGroupMap[versionGroupName]);
      if (!versionGroupDetail || !versionGroupDetail.generationKey) {
        continue;
      }

      const key = versionGroupDetail.generationKey;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      options.push({
        key,
        label: versionGroupDetail.generationLabel || GENERATION_LABELS[key] || formatSlug(key)
      });
    }
  }

  return options.sort((a, b) => {
    const rankA = GENERATION_ORDER[a.key] || 0;
    const rankB = GENERATION_ORDER[b.key] || 0;
    return rankA - rankB;
  });
}

function renderMoveGenerationSelect(options, selectedKey) {
  const select = elements.moveGenerationSelect;
  if (!select) {
    return;
  }

  select.innerHTML = '';

  if (!options.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '世代情報なし';
    select.appendChild(option);
    select.disabled = true;
    return;
  }

  for (const generation of options) {
    const option = document.createElement('option');
    option.value = generation.key;
    option.textContent = generation.label;
    select.appendChild(option);
  }

  select.disabled = false;
  select.value = selectedKey;
}

async function fetchMoveNameMap(moves) {
  const cache = readSessionCache(MOVE_NAME_CACHE_KEY);
  const uniqueMoveNames = [...new Set(moves.map((entry) => entry.move?.name).filter(Boolean))];
  const missingNames = uniqueMoveNames.filter((name) => !cache[name]);

  for (const group of chunk(missingNames, FETCH_CONCURRENCY)) {
    const results = await Promise.all(group.map(async (moveName) => {
      const payload = await fetchJson(`https://pokeapi.co/api/v2/move/${moveName}`);
      const localized = findLocalizedText(payload.names) || formatSlug(moveName);
      return [moveName, localized];
    }));

    for (const [moveName, localized] of results) {
      cache[moveName] = localized;
    }
  }

  writeSessionCache(MOVE_NAME_CACHE_KEY, cache);
  return cache;
}

async function fetchAppearanceData(pokemon, species) {
  const versionCache = readSessionCache(VERSION_CACHE_KEY);
  const versionGroupCache = readSessionCache(VERSION_GROUP_CACHE_KEY);
  const versionGroupNames = [...new Set((pokemon.moves || [])
    .flatMap((move) => move.version_group_details || [])
    .map((detail) => detail.version_group?.name)
    .filter(Boolean))];

  const missingVersionGroups = versionGroupNames.filter((name) => {
    const normalized = normalizeVersionGroupCacheEntry(versionGroupCache[name]);
    if (!normalized) {
      return true;
    }

    versionGroupCache[name] = normalized;
    return !normalized.generationKey || !normalized.versions.length;
  });

  for (const group of chunk(missingVersionGroups, FETCH_CONCURRENCY)) {
    const results = await Promise.all(group.map(async (versionGroupName) => {
      const payload = await fetchJson(`https://pokeapi.co/api/v2/version-group/${versionGroupName}`);
      return [versionGroupName, {
        generationKey: payload.generation?.name || '',
        generationLabel: GENERATION_LABELS[payload.generation?.name] || formatSlug(payload.generation?.name || 'unknown'),
        versions: (payload.versions || []).map((entry) => entry.name)
      }];
    }));

    for (const [versionGroupName, detail] of results) {
      versionGroupCache[versionGroupName] = detail;
    }
  }

  writeSessionCache(VERSION_GROUP_CACHE_KEY, versionGroupCache);

  const generations = [];
  const seenGenerations = new Set();
  const versions = [];
  const seenVersions = new Set();
  let latestGenerationKey = '';
  let latestGenerationLabel = '';

  const versionNames = [...new Set(versionGroupNames
    .flatMap((versionGroupName) => versionGroupCache[versionGroupName]?.versions || []))];

  const missingVersions = versionNames.filter((name) => !versionCache[name]);
  for (const group of chunk(missingVersions, FETCH_CONCURRENCY)) {
    const results = await Promise.all(group.map(async (versionName) => {
      const payload = await fetchJson(`https://pokeapi.co/api/v2/version/${versionName}`);
      return [versionName, {
        label: findLocalizedText(payload.names) || formatSlug(versionName)
      }];
    }));

    for (const [versionName, detail] of results) {
      versionCache[versionName] = detail;
    }
  }

  writeSessionCache(VERSION_CACHE_KEY, versionCache);

  versionGroupNames.forEach((versionGroupName) => {
    const versionGroupDetail = normalizeVersionGroupCacheEntry(versionGroupCache[versionGroupName]);
    if (!versionGroupDetail) {
      return;
    }

    if (versionGroupDetail.generationLabel && !seenGenerations.has(versionGroupDetail.generationLabel)) {
      seenGenerations.add(versionGroupDetail.generationLabel);
      generations.push(versionGroupDetail.generationLabel);
    }

    const generationRank = GENERATION_ORDER[versionGroupDetail.generationKey] || 0;
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
    const form = parseForm(pokemon.name);
    const formFallback = getFormAppearanceFallback(form);
    if (formFallback) {
      return {
        generations: formFallback.generations.slice(),
        versions: formFallback.versions.slice(),
        latestGenerationKey: '',
        latestGenerationLabel: formFallback.generations[formFallback.generations.length - 1] || '世代情報なし',
        versionGroupMap: Object.fromEntries(versionGroupNames.map((name) => [name, versionGroupCache[name]]))
      };
    }

    const baseGenerationKey = species.generation?.name || '';
    const baseGeneration = GENERATION_LABELS[baseGenerationKey] || formatSlug(baseGenerationKey || 'unknown');
    if (baseGeneration && baseGeneration !== 'Unknown') {
      generations.push(baseGeneration);
      latestGenerationKey = baseGenerationKey;
      latestGenerationLabel = baseGeneration;
    }
  }

  return {
    generations,
    versions,
    latestGenerationKey,
    latestGenerationLabel: latestGenerationLabel || '世代情報なし',
    versionGroupMap: Object.fromEntries(versionGroupNames.map((name) => [name, versionGroupCache[name]]))
  };
}

function buildMoveRecords(pokemon, moveNameMap, versionGroupMap, targetGenerationKey, targetGenerationLabel) {
  if (!targetGenerationKey) {
    return [];
  }

  return pokemon.moves
    .map((entry) => {
      const moveNameEn = formatSlug(entry.move?.name || 'unknown');
      const meta = getLatestMoveMeta(
        entry,
        versionGroupMap,
        targetGenerationKey,
        targetGenerationLabel
      );
      if (!meta) {
        return null;
      }
      return {
        nameJa: moveNameMap[entry.move?.name] || moveNameEn,
        nameEn: moveNameEn,
        methodKey: MOVE_METHOD_ORDER.includes(meta.methodKey) ? meta.methodKey : 'other',
        methodLabel: meta.methodLabel || 'その他',
        meta: meta.text,
        level: meta.level
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.nameJa.localeCompare(b.nameJa, 'ja'));
}

async function fetchPokemonDetail(pokemonName) {
  return fetchJson(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
}

async function fetchSpeciesDetail(speciesUrl) {
  return fetchJson(speciesUrl);
}

async function init() {
  const query = readQuery();
  if (!query.pokemon) {
    showError('ポケモン情報が指定されていません。');
    return;
  }

  elements.shinyToggle.checked = query.shiny;

  try {
    const pokemon = await fetchPokemonDetail(query.pokemon);
    const species = await fetchSpeciesDetail(pokemon.species.url);
    const [moveNameMap, appearanceData, typeNameMap, abilityNameMap] = await Promise.all([
      fetchMoveNameMap(pokemon.moves),
      fetchAppearanceData(pokemon, species),
      fetchResourceNameMap(pokemon.types.map((entry) => entry.type?.name), TYPE_NAME_CACHE_KEY, 'type'),
      fetchResourceNameMap(pokemon.abilities.map((entry) => entry.ability?.name), ABILITY_NAME_CACHE_KEY, 'ability')
    ]);

    const moveGenerationOptions = collectMoveGenerationOptions(pokemon, appearanceData.versionGroupMap);
    const generationByKey = Object.fromEntries(moveGenerationOptions.map((entry) => [entry.key, entry]));
    const initialGenerationKey = moveGenerationOptions.at(-1)?.key || '';

    const localizedNames = {
      types: typeNameMap,
      abilities: abilityNameMap
    };

    const renderMovesByGeneration = (generationKey) => {
      const generationLabel = generationByKey[generationKey]?.label || '世代情報なし';
      const moveRecords = buildMoveRecords(
        pokemon,
        moveNameMap,
        appearanceData.versionGroupMap,
        generationKey,
        generationLabel
      );
      renderMoves(moveRecords, generationLabel);
    };

    renderOverview(pokemon, species, query, localizedNames);
    renderAppearanceInfo(appearanceData);
    renderMoveGenerationSelect(moveGenerationOptions, initialGenerationKey);
    renderMovesByGeneration(initialGenerationKey);

    if (elements.moveGenerationSelect) {
      elements.moveGenerationSelect.addEventListener('change', (event) => {
        renderMovesByGeneration(event.target.value);
      });
    }

    elements.shinyToggle.addEventListener('change', () => {
      renderOverview(pokemon, species, query, localizedNames);
      const url = new URL(window.location.href);
      if (elements.shinyToggle.checked) {
        url.searchParams.set('shiny', '1');
      } else {
        url.searchParams.delete('shiny');
      }
      window.history.replaceState({}, '', url);
    });
  } catch (error) {
    console.error(error);
    showError('詳細データの取得に失敗しました。時間をおいて再読み込みしてください。');
  }
}

init();