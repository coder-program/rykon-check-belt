import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresencasController } from './presencas.controller';
import { PresencasService } from './presencas.service';
import { Presenca } from '../../presenca/entities/presenca.entity';
import { Person } from '../../people/entities/person.entity';
import { GraduacaoModule } from '../../graduacao/graduacao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Presenca, Person]),
    forwardRef(() => GraduacaoModule),
  ],
  controllers: [PresencasController],
  providers: [PresencasService],
  exports: [TypeOrmModule],
})
export class PresencasModule {}
