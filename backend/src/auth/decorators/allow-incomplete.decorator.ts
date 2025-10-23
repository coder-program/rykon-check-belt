import { SetMetadata } from '@nestjs/common';

/**
 * Decorator para permitir acesso a endpoints mesmo com cadastro incompleto
 * Use em endpoints que devem ser acessíveis antes da conclusão do perfil
 */
export const AllowIncomplete = () => SetMetadata('allowIncomplete', true);
