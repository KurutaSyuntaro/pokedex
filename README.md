# ポケモン図鑑 (Pokedex)

[PokeAPI](https://pokeapi.co/) を利用した、世代 / タイプフィルター・名前検索・色違い表示・詳細ページ（タイプ / 特性 / 出現作品 / 覚える技）に対応したポケモン図鑑 SPA です。

**Vue 3 + Vite + TypeScript** 構成。

## 機能

- 全国図鑑 #1–#1025 の一覧表示
- 世代フィルター（第1〜第9世代 / 全世代、デフォルトは第1世代）
- タイプフィルター（18 タイプ）
- 名前検索（日本語名・英名・図鑑番号）
- 色違いスプライトの切り替え（localStorage で永続化）
- 詳細ページ
  - 基本情報（高さ / 重さ / 特性 / 初登場世代）
  - 出現世代・出現作品（PokeAPI の game indices ベース）
  - 覚える技（世代別フィルター付き）
- メガ進化 / リージョンフォルム / キョダイマックス / シャリタツのフォルムなどに対応
- PokeAPI レスポンスは sessionStorage / localStorage にキャッシュし、再表示は瞬時

## 技術スタック

- [Vue 3](https://vuejs.org/) (`<script setup>` / Composition API)
- [TypeScript](https://www.typescriptlang.org/)（strict）
- [Vite](https://vitejs.dev/)
- [Vue Router 4](https://router.vuejs.org/)（Hash モード）
- [Pinia](https://pinia.vuejs.org/)
- [VueUse](https://vueuse.org/)（`useLocalStorage`）

## ディレクトリ構成

```
src/
  main.ts
  App.vue
  router/index.ts
  stores/pokedex.ts
  views/
    PokedexView.vue          一覧
    PokemonDetailView.vue    詳細
  components/
    PokemonCard.vue
    TypeBadge.vue
    MoveList.vue
  composables/
    usePokeApi.ts            PokeAPI 通信 / キャッシュ / スプライト解決
  data/
    generations.ts
    formRules.ts
    pokemonTypes.ts
    jaNameOverrides.ts
  types/
    pokemon.ts
  styles/global.css
public/
legacy/                      v1 (バニラ JS) のアーカイブ
```

## ローカル実行

```bash
npm install
npm run dev      # http://localhost:5173/
```

その他のコマンド:

```bash
npm run build      # 本番ビルド (dist/)
npm run preview    # ビルド成果物のプレビュー
npm run typecheck  # vue-tsc による型チェック
```

## デプロイ（GitHub Pages）

公開先: <https://kurutasyuntaro.github.io/pokedex/>

リポジトリ [`KurutaSyuntaro/pokedex`](https://github.com/KurutaSyuntaro/pokedex) の **ルートにこの Vue アプリを配置**する構成で、`main` ブランチへの push をトリガーに GitHub Actions でビルド・デプロイします。

### 1. `vite.config.ts` の `base`

公開 URL がリポジトリ名サブパス配下になるため、`base` をリポジトリ名に合わせています:

```ts
export default defineConfig({
  base: "/pokedex/",
  // ...
});
```

### 2. GitHub Actions ワークフロー

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) を同梱しています。`main` ブランチへの push 時に `npm ci` → `npm run build` → `dist/` を Pages にデプロイします。

### 3. リポジトリ設定

GitHub の **Settings → Pages → Build and deployment** で **Source** を **GitHub Actions** に設定してください。

### 4. 初回 push の手順

このリポジトリ ([`KurutaSyuntaro/pokedex`](https://github.com/KurutaSyuntaro/pokedex)) に push する例:

```bash
git init
git branch -M main
git add .
git commit -m "feat: vue 3 + vite 移植"
git remote add origin https://github.com/KurutaSyuntaro/pokedex.git
git push -u origin main
```

### ルーティングについて

Hash モード (`/#/pokemon/...`) を採用しているため、Pages の SPA フォールバック（404.html リダイレクト等）は不要です。

## ライセンス / クレジット

- データ: [PokeAPI](https://pokeapi.co/)
- スプライト: [PokeAPI/sprites](https://github.com/PokeAPI/sprites)
- ポケモン関連の名称・画像の権利は株式会社ポケモン / 任天堂 / ゲームフリーク / クリーチャーズに帰属します。本リポジトリは非公式の学習目的プロジェクトです。
