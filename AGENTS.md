# AGENTS.md

このファイルは、本リポジトリで AI コーディングエージェント（GitHub Copilot, Claude, Codex 等）が作業する際の規約をまとめたものです。

## プロジェクト概要

PokeAPI を利用したポケモン図鑑 SPA。**バニラ JS 構成 (v1) から Vue 3 + Vite + TypeScript 構成 (v2) への移行作業中**です。詳細は [README.md](README.md) を参照。

## 技術スタック（v2 移行後）

- Vue 3 (`<script setup>` / Composition API)
- TypeScript（strict）
- Vite
- Vue Router 4
- Pinia
- VueUse
- Node.js 20 LTS 以降

## ディレクトリ規約

- `src/views/` … ルートに対応する画面コンポーネント
- `src/components/` … 再利用可能な UI コンポーネント（プレゼンテーション層）
- `src/composables/` … `useXxx` 形式の Composition 関数。副作用・API 通信はここに集約
- `src/stores/` … Pinia ストア。永続化が必要な状態は VueUse の `useLocalStorage` を併用
- `src/data/` … 静的な定数（世代定義 / フォルム規則 / 日本語名オーバーライド）
- `src/types/` … 型定義（`Pokemon`, `PokemonDetail`, `MoveEntry` など）

## コーディング規約

### Vue / TypeScript

- 単一ファイルコンポーネントは **`<script setup lang="ts">`** を使用
- Props / Emits は `defineProps<T>()` / `defineEmits<T>()` で型定義
- `any` 禁止。外部 API レスポンスは `src/types/pokeapi.ts` で型を定義
- コンポーネント名は **PascalCase**（ファイル名も同様）
- composable / store は **camelCase**、`useXxx` / `useXxxStore`
- ストアは Setup Stores 形式（`defineStore('xxx', () => { ... })`）を推奨

### スタイル

- スコープ付き CSS（`<style scoped>`）を基本とする
- 色・スペーシング等のデザイントークンは CSS カスタムプロパティで定義
- 既存 v1 の見た目（`css/style.css`, `css/detail.css`）をベースに移植する。配色やフォント（Zen Kaku Gothic New）を維持

### API アクセス

- すべての PokeAPI 通信は `src/composables/usePokeApi.ts` 経由に集約
- レスポンスはセッションストレージ or Pinia でキャッシュし、不要な再フェッチを避ける
- 並列フェッチは **同時実行数 16** を上限（v1 の `FETCH_CONCURRENCY` を踏襲）
- スプライト URL は v1 のフォールバック戦略（official-artwork → 通常 sprite、id → dexId の順）を維持

### 日本語化

- 既存の `JA_NAME_OVERRIDES` は `src/data/jaNameOverrides.ts` に移植する
- PokeAPI から取得できる日本語名（`ja-Hrkt` 優先、次に `ja`）を最優先で使用
- フォルム表記（メガ / アローラ / ガラル / ヒスイ / パルデア / キョダイマックス 等）は `src/data/formRules.ts` で管理

## エージェントが守るべき原則

1. **段階的移植**: v1 のロジックは可能な限り型定義・命名を維持して composable / store に分割移植する。挙動を変えない
2. **過剰な改変を避ける**: 依頼されていないリファクタリングや「改善」は行わない
3. **ファイル削除は確認**: v1 のファイル (`index.html`, `detail.html`, `js/`, `css/`) を削除する作業は、ユーザーの明示的な確認を得てから行う
4. **依存追加は最小限**: README の「予定スタック」以外のライブラリ追加は事前に提案する
5. **PokeAPI のレート尊重**: テストやデバッグ目的で大量フェッチをループ実行しない
6. **コミット粒度**: 1 コミット 1 トピック。コミットメッセージは日本語可、Conventional Commits 風（`feat:`, `fix:`, `refactor:`, `chore:`）

## よく使うコマンド（v2 後）

```powershell
npm install            # 依存インストール
npm run dev            # 開発サーバ起動
npm run build          # 本番ビルド
npm run preview        # ビルド結果のプレビュー
npm run typecheck      # vue-tsc による型チェック
npm run lint           # ESLint
```

## デプロイ

GitHub Pages（`gh-pages` ブランチ）。`vite.config.ts` の `base` をリポジトリ名に揃えること。

## 移行ロードマップ

- [ ] Vite + Vue 3 + TS プロジェクト雛形作成（`npm create vite@latest`）
- [ ] Vue Router / Pinia / VueUse のセットアップ
- [ ] 既存定数（世代 / フォルム規則 / 日本語名）を `src/data/` へ移植
- [ ] `usePokeApi` composable で v1 のフェッチロジックを再実装
- [ ] `PokedexView`（一覧）コンポーネント実装
- [ ] `PokemonDetailView`（詳細）コンポーネント実装
- [ ] 色違いトグル / 世代フィルターを Pinia store 化
- [ ] スタイル移植・レスポンシブ確認
- [ ] GitHub Pages デプロイワークフロー追加
- [ ] v1 ファイルの削除（ユーザー確認後）
