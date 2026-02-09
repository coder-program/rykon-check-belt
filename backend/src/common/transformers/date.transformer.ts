import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Transformer para campos DATE do PostgreSQL
 * Garante que datas sejam sempre retornadas no formato YYYY-MM-DD
 * sem problemas de timezone
 */
export const DateTransformer = {
  to: (value: any): Date | null => {
    if (!value) return null;
    
    // Se for string no formato YYYY-MM-DD, converter para Date
    if (typeof value === 'string') {
      // Parse da string como UTC para evitar conversão de timezone
      const date = dayjs.utc(value).toDate();
      return date;
    }
    
    // Se já for Date, retornar como está
    if (value instanceof Date) {
      return value;
    }
    
    return null;
  },
  
  from: (value: any): string | null => {
    if (!value) return null;
    
    // DEBUG: Log para ver o que está chegando do banco
    console.log('🔍 DateTransformer.from recebeu:', {
      value,
      type: typeof value,
      isDate: value instanceof Date,
      isString: typeof value === 'string',
    });
    
    // Se já é string no formato YYYY-MM-DD, retornar direto
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      console.log('✅ Retornando string direto:', value);
      return value;
    }
    
    // Se for Date, converter para string YYYY-MM-DD usando UTC para evitar mudança de dia
    if (value instanceof Date) {
      const result = dayjs.utc(value).format('YYYY-MM-DD');
      console.log('📅 Convertendo Date para string:', { original: value, result });
      return result;
    }
    
    // Caso geral: tentar parsear e formatar
    try {
      const result = dayjs.utc(value).format('YYYY-MM-DD');
      console.log('🔄 Parseando e formatando:', { original: value, result });
      return result;
    } catch (error) {
      console.error('❌ Erro ao converter data:', error);
      return null;
    }
  },
};

/**
 * Transformer para campos TIMESTAMP do PostgreSQL
 * Retorna ISO string com timezone
 */
export const TimestampTransformer = {
  to: (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    return dayjs(value).toDate();
  },
  
  from: (value: any): string | null => {
    if (!value) return null;
    return dayjs(value).toISOString();
  },
};
