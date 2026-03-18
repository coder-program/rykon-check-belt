/**
 * Layout para as páginas /tv/* — sem header, sidebar ou qualquer UI do sistema.
 * Exibe somente o conteúdo filho em fullscreen.
 */
export default function TvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
