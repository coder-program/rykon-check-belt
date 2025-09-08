import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresencasController } from './presencas.controller';
import { PresencasService } from './presencas.service';
import { Presenca } from './entities/presenca.entity';
import { Person } from '../../people/entities/person.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Presenca, Person])],
  controllers: [PresencasController],
  providers: [PresencasService],
  exports: [TypeOrmModule],
})
export class PresencasModule {}
