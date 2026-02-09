/**
 * Utilitários para trabalhar com datas no formato brasileiro
 */

/**
 * Formata uma data para o padrão brasileiro (dd/mm/yyyy)
 * Garante que não há problema de timezone ao exibir datas
 * 
 * @param dateString - String de data no formato ISO (YYYY-MM-DD) ou objeto Date
 * @returns String formatada como dd/mm/yyyy
 */
export function formatarData(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  
  try {
    // Se vier como string no formato ISO (YYYY-MM-DD)
    if (typeof dateString === 'string' && dateString.includes('-')) {
      const [year, month, day] = dateString.split('T')[0].split('-');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    
    // Se vier como Date object
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '-';
  }
}

/**
 * Converte uma data brasileira (dd/mm/yyyy) para formato ISO (YYYY-MM-DD)
 * Usado para enviar ao backend
 * 
 * @param dataBrasileira - String no formato dd/mm/yyyy
 * @returns String no formato YYYY-MM-DD
 */
export function converterParaISO(dataBrasileira: string): string {
  if (!dataBrasileira) return '';
  
  try {
    const [day, month, year] = dataBrasileira.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    console.error('Erro ao converter data para ISO:', error);
    return '';
  }
}

/**
 * Retorna a data atual no formato ISO (YYYY-MM-DD)
 * Usado para campos de input type="date"
 * 
 * @returns String no formato YYYY-MM-DD
 */
export function dataAtualISO(): string {
  const hoje = new Date();
  const year = hoje.getFullYear();
  const month = (hoje.getMonth() + 1).toString().padStart(2, '0');
  const day = hoje.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data com hora no padrão brasileiro
 * 
 * @param dateString - String de data ISO ou objeto Date
 * @returns String formatada como dd/mm/yyyy às HH:mm
 */
export function formatarDataHora(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    const dataFormatada = formatarData(dateString);
    const hora = date.getHours().toString().padStart(2, '0');
    const minuto = date.getMinutes().toString().padStart(2, '0');
    return `${dataFormatada} às ${hora}:${minuto}`;
  } catch (error) {
    console.error('Erro ao formatar data/hora:', error);
    return '-';
  }
}

/**
 * Formata moeda brasileira
 * 
 * @param valor - Valor numérico
 * @returns String formatada como R$ X.XXX,XX
 */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}
