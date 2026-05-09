'use strict';

const API_LIMIT = 1025;
const API_FORM_LIMIT = 20000;
const NAME_FETCH_CONCURRENCY = 16;
const SPRITE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{}.png';
const SPRITE_SHINY_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/{}.png';
const SPRITE_FALLBACK_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{}.png';
const SPRITE_FALLBACK_SHINY_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{}.png';

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

const SPECIAL_BASE_NAME_FALLBACKS = {
  tatsugiri: ['tatsugiri-curly'],
  'urshifu-rapid-strike': ['urshifu-single-strike', 'urshifu'],
  'toxtricity-low-key': ['toxtricity-amped', 'toxtricity']
};

const GENERATION_RANGES = {
  all: [1, API_LIMIT],
  gen1: [1, 151],
  gen2: [152, 251],
  gen3: [252, 386],
  gen4: [387, 493],
  gen5: [494, 649],
  gen6: [650, 721],
  gen7: [722, 809],
  gen8: [810, 905],
  gen9: [906, API_LIMIT]
};

const JA_NAME_OVERRIDES = {
  bulbasaur: 'フシギダネ',
  ivysaur: 'フシギソウ',
  venusaur: 'フシギバナ',
  charmander: 'ヒトカゲ',
  charmeleon: 'リザード',
  charizard: 'リザードン',
  squirtle: 'ゼニガメ',
  wartortle: 'カメール',
  blastoise: 'カメックス',
  caterpie: 'キャタピー',
  metapod: 'トランセル',
  butterfree: 'バタフリー',
  weedle: 'ビードル',
  kakuna: 'コクーン',
  beedrill: 'スピアー',
  pidgey: 'ポッポ',
  pidgeotto: 'ピジョン',
  pidgeot: 'ピジョット',
  rattata: 'コラッタ',
  raticate: 'ラッタ',
  spearow: 'オニスズメ',
  fearow: 'オニドリル',
  ekans: 'アーボ',
  arbok: 'アーボック',
  pikachu: 'ピカチュウ',
  raichu: 'ライチュウ',
  sandshrew: 'サンド',
  sandslash: 'サンドパン',
  nidoran_f: 'ニドラン♀',
  nidorina: 'ニドリーナ',
  nidoqueen: 'ニドクイン',
  nidoran_m: 'ニドラン♂',
  nidorino: 'ニドリーノ',
  nidoking: 'ニドキング',
  clefairy: 'ピッピ',
  clefable: 'ピクシー',
  vulpix: 'ロコン',
  ninetales: 'キュウコン',
  jigglypuff: 'プリン',
  wigglytuff: 'プクリン',
  zubat: 'ズバット',
  golbat: 'ゴルバット',
  oddish: 'ナゾノクサ',
  gloom: 'クサイハナ',
  vileplume: 'ラフレシア',
  paras: 'パラス',
  parasect: 'パラセクト',
  venonat: 'コンパン',
  venomoth: 'モルフォン',
  diglett: 'ディグダ',
  dugtrio: 'ダグトリオ',
  meowth: 'ニャース',
  persian: 'ペルシアン',
  psyduck: 'コダック',
  golduck: 'ゴルダック',
  mankey: 'マンキー',
  primeape: 'オコリザル',
  growlithe: 'ガーディ',
  arcanine: 'ウインディ',
  poliwag: 'ニョロモ',
  poliwhirl: 'ニョロゾ',
  poliwrath: 'ニョロボン',
  abra: 'ケーシィ',
  kadabra: 'ユンゲラー',
  alakazam: 'フーディン',
  machop: 'ワンリキー',
  machoke: 'ゴーリキー',
  machamp: 'カイリキー',
  bellsprout: 'マダツボミ',
  weepinbell: 'ウツドン',
  victreebel: 'ウツボット',
  tentacool: 'メノクラゲ',
  tentacruel: 'ドククラゲ',
  geodude: 'イシツブテ',
  graveler: 'ゴローン',
  golem: 'ゴローニャ',
  ponyta: 'ポニータ',
  rapidash: 'ギャロップ',
  slowpoke: 'ヤドン',
  slowbro: 'ヤドラン',
  magnemite: 'コイル',
  magneton: 'レアコイル',
  farfetchd: 'カモネギ',
  doduo: 'ドードー',
  dodrio: 'ドードリオ',
  seel: 'パウワウ',
  dewgong: 'ジュゴン',
  grimer: 'ベトベター',
  muk: 'ベトベトン',
  shellder: 'シェルダー',
  cloyster: 'パルシェン',
  gastly: 'ゴース',
  haunter: 'ゴースト',
  gengar: 'ゲンガー',
  onix: 'イワーク',
  drowzee: 'スリープ',
  hypno: 'スリーパー',
  krabby: 'クラブ',
  kingler: 'キングラー',
  voltorb: 'ビリリダマ',
  electrode: 'マルマイン',
  exeggcute: 'タマタマ',
  exeggutor: 'ナッシー',
  cubone: 'カラカラ',
  marowak: 'ガラガラ',
  hitmonlee: 'サワムラー',
  hitmonchan: 'エビワラー',
  lickitung: 'ベロリンガ',
  koffing: 'ドガース',
  weezing: 'マタドガス',
  rhyhorn: 'サイホーン',
  rhydon: 'サイドン',
  chansey: 'ラッキー',
  tangela: 'モンジャラ',
  kangaskhan: 'ガルーラ',
  horsea: 'タッツー',
  seadra: 'シードラ',
  goldeen: 'トサキント',
  seaking: 'アズマオウ',
  staryu: 'ヒトデマン',
  starmie: 'スターミー',
  mr_mime: 'バリヤード',
  scyther: 'ストライク',
  jynx: 'ルージュラ',
  electabuzz: 'エレブー',
  magmar: 'ブーバー',
  pinsir: 'カイロス',
  tauros: 'ケンタロス',
  magikarp: 'コイキング',
  gyarados: 'ギャラドス',
  lapras: 'ラプラス',
  ditto: 'メタモン',
  eevee: 'イーブイ',
  vaporeon: 'シャワーズ',
  jolteon: 'サンダース',
  flareon: 'ブースター',
  porygon: 'ポリゴン',
  omanyte: 'オムナイト',
  omastar: 'オムスター',
  kabuto: 'カブト',
  kabutops: 'カブトプス',
  aerodactyl: 'プテラ',
  snorlax: 'カビゴン',
  articuno: 'フリーザー',
  zapdos: 'サンダー',
  moltres: 'ファイヤー',
  dratini: 'ミニリュウ',
  dragonair: 'ハクリュー',
  dragonite: 'カイリュー',
  mewtwo: 'ミュウツー',
  mew: 'ミュウ',
  tatsugiri: 'シャリタツ'
};

const elements = {
  searchInput: document.getElementById('search-input'),
  limitSelect: document.getElementById('limit-select'),
  shinyToggle: document.getElementById('shiny-toggle'),
  resultCount: document.getElementById('result-count'),
  grid: document.getElementById('pokedex-grid'),
  cardTemplate: document.getElementById('pokemon-card-template')
};

const state = {
  allPokemon: [],
  filteredPokemon: []
};

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '')
    .replace(/-/g, '_');
}

function formatDexNumber(id) {
  return `#${id}`;
}

function toSpriteUrl(id) {
  return SPRITE_URL.replace('{}', String(id));
}

function toShinySpriteUrl(id) {
  return SPRITE_SHINY_URL.replace('{}', String(id));
}

function toFallbackSpriteUrl(id) {
  return SPRITE_FALLBACK_URL.replace('{}', String(id));
}

function toFallbackShinySpriteUrl(id) {
  return SPRITE_FALLBACK_SHINY_URL.replace('{}', String(id));
}

function transparentPixelDataUrl() {
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
}

function buildSpriteCandidates(pokemon, isShiny) {
  if (isShiny) {
    return [
      toShinySpriteUrl(pokemon.id),
      toFallbackShinySpriteUrl(pokemon.id),
      toShinySpriteUrl(pokemon.dexId),
      toFallbackShinySpriteUrl(pokemon.dexId),
      toSpriteUrl(pokemon.id),
      toFallbackSpriteUrl(pokemon.id),
      toSpriteUrl(pokemon.dexId),
      toFallbackSpriteUrl(pokemon.dexId)
    ];
  }

  return [
    toSpriteUrl(pokemon.id),
    toFallbackSpriteUrl(pokemon.id),
    toSpriteUrl(pokemon.dexId),
    toFallbackSpriteUrl(pokemon.dexId)
  ];
}

function setSpriteWithFallback(imgElement, pokemon, isShiny) {
  const candidates = buildSpriteCandidates(pokemon, isShiny);

  let index = 0;

  imgElement.onerror = () => {
    index += 1;
    if (index >= candidates.length) {
      imgElement.onerror = null;
      imgElement.src = transparentPixelDataUrl();
      return;
    }

    imgElement.src = candidates[index];
  };

  imgElement.src = candidates[index];
}

function toDisplayName(enName) {
  const key = normalizeName(enName);
  return JA_NAME_OVERRIDES[key] || enName;
}

function parseIdFromUrl(url) {
  const match = String(url || '').match(/\/(\d+)\/?$/);
  return match ? Number.parseInt(match[1], 10) : Number.NaN;
}

function parseSupportedForm(name) {
  for (const rule of SUPPORTED_FORM_RULES) {
    if (name.endsWith(rule.suffix)) {
      return {
        baseName: name.slice(0, -rule.suffix.length),
        formLabel: rule.label
      };
    }
  }
  return null;
}

function resolveDexIdFromBaseName(baseNameToDexId, baseName) {
  const exact = baseNameToDexId.get(baseName);
  if (exact) {
    return exact;
  }

  const fallbackNames = SPECIAL_BASE_NAME_FALLBACKS[baseName] || [];
  for (const fallbackName of fallbackNames) {
    const fallbackDexId = baseNameToDexId.get(fallbackName);
    if (fallbackDexId) {
      return fallbackDexId;
    }
  }

  return undefined;
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

function findJapaneseName(speciesPayload) {
  const names = speciesPayload && Array.isArray(speciesPayload.names)
    ? speciesPayload.names
    : [];
  const jaHrkt = names.find((entry) => entry.language && entry.language.name === 'ja-Hrkt');
  if (jaHrkt && jaHrkt.name) {
    return jaHrkt.name;
  }
  const ja = names.find((entry) => entry.language && entry.language.name === 'ja');
  if (ja && ja.name) {
    return ja.name;
  }
  return '';
}

async function fetchJapaneseNameMap(maxDexId) {
  const ids = Array.from({ length: maxDexId }, (_, i) => i + 1);
  const map = new Map();

  for (const group of chunk(ids, NAME_FETCH_CONCURRENCY)) {
    const results = await Promise.all(
      group.map(async (id) => {
        const url = `https://pokeapi.co/api/v2/pokemon-species/${id}`;
        const response = await fetch(url);
        if (!response.ok) {
          return [id, ''];
        }
        const payload = await response.json();
        return [id, findJapaneseName(payload)];
      })
    );

    for (const [id, nameJa] of results) {
      if (nameJa) {
        map.set(id, nameJa);
      }
    }
  }

  return map;
}

function applyJapaneseNamesToList(pokemonList, nameMap) {
  return pokemonList.map((pokemon) => {
    const baseJa = nameMap.get(pokemon.dexId);
    if (!baseJa) {
      return pokemon;
    }

    if (!pokemon.isForm) {
      return {
        ...pokemon,
        nameJa: baseJa
      };
    }

    return {
      ...pokemon,
      nameJa: `${baseJa} (${pokemon.formLabel})`
    };
  });
}

function setStatusMessage(message) {
  elements.grid.innerHTML = `<p class="status">${message}</p>`;
}

function renderGrid(list) {
  elements.grid.innerHTML = '';
  const isShiny = Boolean(elements.shinyToggle && elements.shinyToggle.checked);

  if (!list.length) {
    setStatusMessage('一致するポケモンがいません。');
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const pokemon of list) {
    const node = elements.cardTemplate.content.firstElementChild.cloneNode(true);
    const img = node.querySelector('.sprite');
    const dexNumber = formatDexNumber(pokemon.dexId);

    node.href = `detail.html?pokemon=${encodeURIComponent(pokemon.nameEn)}&dex=${encodeURIComponent(String(pokemon.dexId))}${isShiny ? '&shiny=1' : ''}`;
    setSpriteWithFallback(img, pokemon, isShiny);
    img.alt = `${pokemon.nameJa} の画像`;

    node.querySelector('.number').textContent = dexNumber;
    node.querySelector('.name').textContent = pokemon.nameJa;
    node.title = pokemon.isForm
      ? `${dexNumber} ${pokemon.nameJa} (${pokemon.nameEn}, form id: ${pokemon.id})`
      : `${dexNumber} ${pokemon.nameJa} (${pokemon.nameEn})`;

    fragment.appendChild(node);
  }

  elements.grid.appendChild(fragment);
}

function updateResultCount() {
  elements.resultCount.textContent =
    `${state.filteredPokemon.length}件表示 / 全${state.allPokemon.length}件`;
}

function applyFilters() {
  const searchWord = elements.searchInput.value.trim().toLowerCase();
  const selectedGeneration = elements.limitSelect.value;
  const [minDexId, maxDexId] = GENERATION_RANGES[selectedGeneration] || GENERATION_RANGES.all;

  state.filteredPokemon = state.allPokemon.filter((pokemon) => {
    const inRange = pokemon.dexId >= minDexId && pokemon.dexId <= maxDexId;
    if (!inRange) {
      return false;
    }

    if (!searchWord) {
      return true;
    }

    return (
      pokemon.nameJa.toLowerCase().includes(searchWord) ||
      pokemon.nameEn.includes(searchWord) ||
      String(pokemon.dexId).includes(searchWord)
    );
  });

  renderGrid(state.filteredPokemon);
  updateResultCount();
}

function toNationalDexList(rawList) {
  return rawList
    .map((entry) => {
      const id = parseIdFromUrl(entry.url);
      if (!Number.isFinite(id) || id < 1 || id > API_LIMIT) {
        return null;
      }

      return {
        id,
        dexId: id,
        nameEn: entry.name,
        nameJa: toDisplayName(entry.name),
        isForm: false,
        formLabel: ''
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dexId - b.dexId);
}

function toFormDexList(rawList, baseNameToDexId) {
  const formList = rawList
    .map((entry) => {
      const formId = parseIdFromUrl(entry.url);
      if (!Number.isFinite(formId) || formId <= API_LIMIT) {
        return null;
      }

      const form = parseSupportedForm(entry.name);
      if (!form) {
        return null;
      }

      const resolvedDexId = resolveDexIdFromBaseName(baseNameToDexId, form.baseName);
      if (!resolvedDexId) {
        return null;
      }

      const baseJa = toDisplayName(form.baseName);
      return {
        id: formId,
        dexId: resolvedDexId,
        nameEn: entry.name,
        nameJa: `${baseJa} (${form.formLabel})`,
        isForm: true,
        formLabel: form.formLabel
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.dexId !== b.dexId) {
        return a.dexId - b.dexId;
      }
      return a.id - b.id;
    });

  const tatsugiriMegaList = formList.filter((pokemon) =>
    pokemon.dexId === 978 &&
    pokemon.formLabel === 'メガ' &&
    pokemon.nameEn.startsWith('tatsugiri-') &&
    pokemon.nameEn.endsWith('-mega')
  );

  const preferredTatsugiriMegaId =
    tatsugiriMegaList.find((pokemon) => pokemon.id === 10324)?.id ||
    tatsugiriMegaList[0]?.id;

  return formList.filter((pokemon) => {
    const isTatsugiriMega =
      pokemon.dexId === 978 &&
      pokemon.formLabel === 'メガ' &&
      pokemon.nameEn.startsWith('tatsugiri-') &&
      pokemon.nameEn.endsWith('-mega');

    if (!isTatsugiriMega) {
      return true;
    }

    return pokemon.id === preferredTatsugiriMegaId;
  });
}

function mergeAndSortDexList(baseList, formList) {
  return [...baseList, ...formList].sort((a, b) => {
    if (a.dexId !== b.dexId) {
      return a.dexId - b.dexId;
    }
    if (a.isForm !== b.isForm) {
      return a.isForm ? 1 : -1;
    }
    return a.id - b.id;
  });
}

async function fetchPokemonList() {
  const url = `https://pokeapi.co/api/v2/pokemon?limit=${API_FORM_LIMIT}&offset=0`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch list: ${response.status}`);
  }

  const payload = await response.json();
  const rawList = payload.results || [];
  const baseList = toNationalDexList(rawList);
  const baseNameToDexId = new Map(baseList.map((pokemon) => [pokemon.nameEn, pokemon.dexId]));
  const formList = toFormDexList(rawList, baseNameToDexId);
  return mergeAndSortDexList(baseList, formList);
}

function bindEvents() {
  elements.searchInput.addEventListener('input', applyFilters);
  elements.limitSelect.addEventListener('change', applyFilters);
  if (elements.shinyToggle) {
    elements.shinyToggle.addEventListener('change', applyFilters);
  }
}

async function init() {
  bindEvents();
  setStatusMessage('図鑑データを読み込み中...');

  try {
    const pokemonList = await fetchPokemonList();
    elements.resultCount.textContent = '日本語名を取得中...';
    const nameMap = await fetchJapaneseNameMap(API_LIMIT);
    state.allPokemon = applyJapaneseNamesToList(pokemonList, nameMap);
    applyFilters();
  } catch (error) {
    console.error(error);
    setStatusMessage('図鑑データの取得に失敗しました。時間をおいて再読み込みしてください。');
    elements.resultCount.textContent = '0件表示';
  }
}

init();