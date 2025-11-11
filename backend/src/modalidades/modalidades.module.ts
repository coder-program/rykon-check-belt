import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModalidadesService } from './modalidades.service';
import { ModalidadesController } from './modalidades.controller';
import { Modalidade } from './entities/modalidade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Modalidade])],
  controllers: [ModalidadesController],
  providers: [ModalidadesService],
  exports: [ModalidadesService],
})
export class ModalidadesModule {}
