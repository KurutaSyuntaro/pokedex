# PokeAPI 図鑑 改善アイデアメモ

調査日: 2026-05-09 / 出典: <https://pokeapi.co/docs/v2>

## 現状使用中のリソース

- `pokemon` / `pokemon-species`（基本情報・種族値・タイプ・特性・名称）
- `pokemon`（フォルム一覧・スプライト）
- `type` / `ability` / `move`（日本語名のみ）
- `version-group` / `version` / `generation`（出現作品・覚える技フィルタ）
- `pokedex`（地方図鑑エントリ）

## 優先度：高（コア体験の底上げ）

### 1. タイプ相性（`type.damage_relations`）

詳細ページに「ばつぐん / いまひとつ / こうかなし」マトリクス。
複合タイプは両 type の `damage_relations` を掛け合わせ 4倍 / 2倍 / 1倍 / 0.5倍 / 0.25倍 / 0倍 を算出。
タイプは18種のみでキャッシュも容易。実装コスト低・効果大。

### 2. 進化チェイン（`evolution-chain`, `species.evolution_chain.url`）

進化系統ツリー＋進化条件（`min_level` / `item` / `min_happiness` / `time_of_day` / `region` 等）。
イーブイ系の分岐進化可視化が映える。

### 3. 図鑑説明文（`pokemon-species.flavor_text_entries`）

`language.name === "ja-Hrkt"` でフィルタ、バージョン切替 UI で読み比べ。
`form_descriptions` も活用。図鑑らしさが格段に上がる。

### 4. 鳴き声（`pokemon.cries.latest` / `legacy`）

URL: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/{id}.ogg`
スプライト横に再生ボタンを追加するだけ。実装数行。

## 優先度：中（深掘り系）

### 5. 種族メタ情報（`pokemon-species` 拡張）

- `is_legendary` / `is_mythical` / `is_baby` → バッジ
- `capture_rate` → 捕まえやすさバー
- `base_happiness` / `hatch_counter` → 育成情報
- `gender_rate` → ♂♀比率円グラフ
- `egg_groups` / `growth_rate` / `habitat` / `color` / `shape`

### 6. 出現場所（`pokemon/{id}/encounters`）

バージョン別出現場所・遭遇手段（草むら / 釣り / 化石）・遭遇率・条件（時間帯 / swarm）。

### 7. 技詳細（`move`）

`power` / `accuracy` / `pp` / `priority` / `damage_class`（物理 / 特殊 / 変化）/ `type` /
`effect_entries.short_effect` / `meta`（ひるみ・状態異常確率）。
`MoveList.vue` 拡張のみで攻略ツール化。データ量が多いので段階的キャッシュ推奨。

### 8. 特性説明（`ability.effect_entries` / `flavor_text_entries`）

特性名にツールチップで `ja` の effect 文。

### 9. 性格（`nature`）

増減ステータス・好む味・きらう味の対応表。

## 優先度：中（UI/UX）

### 10. スプライトのバリエーション

- `back_default` / `back_shiny`（裏面）
- `front_female` / `back_female`（メス個体差）
- `versions.generation-v.black-white.animated`（BW ドットアニメ GIF）
- `other.dream_world.front_default`（SVG）
- `other.home.front_default`（HOME 風 3D）

### 11. アイテム / マシン（`item` / `machine`）

持ち物（`held_items`）・進化アイテム・わざマシン。`sprites.default` がアイコン URL。

### 12. 地方図鑑の充実

`pokedex/{name}` の `pokemon_entries[].entry_number` でローカル番号並び替え・表示。

## 優先度：低〜中（インフラ / 運用）

### 13. GraphQL 活用

`https://beta.pokeapi.co/graphql/v1beta2`
1リクエストで詳細ページに必要なデータを一括取得。N+1 解消。

### 14. キャッシュ強化

- `pokeapi-js-wrapper`（IndexedDB 自動キャッシュの公式ラッパ）
- Service Worker + Cache API でオフライン対応図鑑

### 15. お気に入り / 比較機能

`useLocalStorage` で⭐お気に入り、種族値レーダー比較、パーティ構築（タイプ相性カバー率）。

### 16. アクセシビリティ・i18n

`language` エンドポイントで多言語切替、`aria-label` 強化。

## 注意（フェアユース）

- 起動時に全件ループで叩かない
- 詳細ページ表示時に必要分のみ取得 → localStorage に蓄積
  （既存 `SPECIES_NAME_CACHE_KEY` と同様パターン）
- 並列フェッチ上限 16（既存 `FETCH_CONCURRENCY` 踏襲）

## おすすめ実装順

1. タイプ相性表（即効性・実装小）
2. 図鑑説明文 + 鳴き声（"図鑑らしさ" の演出）
3. 進化チェイン（一番映える）
4. 技の威力 / 命中 / 効果（`MoveList` 拡張）
5. 種族メタ情報バッジ
6. 出現場所マップ
7. GraphQL 移行 or ServiceWorker キャッシュ
