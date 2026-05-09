import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw,
} from "vue-router";
import PokedexView from "@/views/PokedexView.vue";
import PokemonDetailView from "@/views/PokemonDetailView.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "pokedex",
    component: PokedexView,
  },
  {
    path: "/pokemon/:name",
    name: "detail",
    component: PokemonDetailView,
    props: true,
  },
];

export const router = createRouter({
  // GitHub Pages 配下でも壊れにくい hash モードを採用
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
