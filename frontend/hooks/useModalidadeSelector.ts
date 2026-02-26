import { useState, useEffect, useCallback } from "react";
import { Modalidade } from "@/lib/peopleApi";

const STORAGE_KEY = "rykon_modalidade";

export interface ModalidadeSelection {
  selectedModalidade: Modalidade | null; // null = "todas"
  showSelector: boolean;
  setShowSelector: (v: boolean) => void;
  selectModalidade: (m: Modalidade | null) => void;
  initialized: boolean;
}

/**
 * Gerencia a seleção de modalidade do dashboard.
 * - Se 0 ou 1 modalidade: auto-seleciona (sem mostrar modal).
 * - Se > 1 e sem escolha salva: abre o seletor automaticamente.
 * - Persiste em sessionStorage por userId.
 */
export function useModalidadeSelector(
  userId?: string,
  modalidades?: Modalidade[]
): ModalidadeSelection {
  const storageKey = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;

  const [selectedModalidade, setSelectedModalidade] =
    useState<Modalidade | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!userId || !modalidades) return;

    const ativas = modalidades.filter((m) => m.ativo !== false);

    if (ativas.length === 0) {
      // Sem modalidades: não mostra seletor
      setInitialized(true);
      return;
    }

    if (ativas.length === 1) {
      // Só uma: auto-seleciona sem abrir modal
      setSelectedModalidade(ativas[0]);
      sessionStorage.setItem(storageKey, JSON.stringify(ativas[0]));
      setInitialized(true);
      return;
    }

    // Mais de uma: checar sessão salva
    const stored = sessionStorage.getItem(storageKey);

    if (stored === "all") {
      setSelectedModalidade(null);
      setInitialized(true);
      return;
    }

    if (stored) {
      try {
        const parsed: Modalidade = JSON.parse(stored);
        const found = ativas.find((m) => m.id === parsed.id);
        if (found) {
          setSelectedModalidade(found);
          setInitialized(true);
          return;
        }
      } catch {
        // fallthrough
      }
    }

    // Nenhuma seleção válida → abre o seletor
    setShowSelector(true);
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, JSON.stringify(modalidades?.map((m) => m.id))]);

  const selectModalidade = useCallback(
    (m: Modalidade | null) => {
      setSelectedModalidade(m);
      setShowSelector(false);
      if (m) {
        sessionStorage.setItem(storageKey, JSON.stringify(m));
      } else {
        sessionStorage.setItem(storageKey, "all");
      }
    },
    [storageKey]
  );

  return {
    selectedModalidade,
    showSelector,
    setShowSelector,
    selectModalidade,
    initialized,
  };
}
