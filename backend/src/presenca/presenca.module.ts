import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresencaController } from './presenca.controller';
import { PresencaService } from './presenca.service';
import { Person } from '../people/entities/person.entity';
import { Presenca } from '../teamcruz/presencas/entities/presenca.entity';
import { GraduacaoModule } from '../graduacao/graduacao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Person, Presenca]),
    forwardRef(() => GraduacaoModule),
  ],
  controllers: [PresencaController],
  providers: [PresencaService],
  exports: [PresencaService],
})
export class PresencaModule {}
