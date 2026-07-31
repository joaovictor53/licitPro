import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace neste diretório. Sem isso, um package.json ou
  // lockfile no diretório pai faz o Turbopack inferir a raiz errada, e os
  // caminhos do React Client Manifest saem com o prefixo "licitpro/",
  // quebrando o carregamento dos Client Components.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
