export function cn(...inputs: unknown[]) {
  // Deixa igual ao projeto original: clsx + tailwind-merge
  // Import dinâmico para reduzir carga inicial se não usado
  // mas aqui é simples re-export; Next trata no bundle
  // Obs: manter tipagem simples para não travar builds
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { clsx } = require("clsx");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { twMerge } = require("tailwind-merge");
  return twMerge(clsx(inputs));
}
