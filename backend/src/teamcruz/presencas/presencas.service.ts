import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Presenca } from './entities/presenca.entity';
import { Aluno } from '../alunos/entities/aluno.entity';

@Injectable()
export class PresencasService {
  constructor(
    @InjectRepository(Presenca) private presencasRepo: Repository<Presenca>,
    @InjectRepository(Aluno) private alunosRepo: Repository<Aluno>,
  ) {}

  async aulasAbertas() {
    return [
      {
        id: 1,
        horario: '07:00',
        turma: 'Adulto Manhã',
        instrutor: 'Carlos Cruz',
        vagas: 7,
      },
      {
        id: 2,
        horario: '09:00',
        turma: 'Competição',
        instrutor: 'Carlos Cruz',
        vagas: 3,
      },
      {
        id: 3,
        horario: '16:00',
        turma: 'Kids Tarde',
        instrutor: 'João Silva',
        vagas: 10,
      },
      {
        id: 4,
        horario: '19:00',
        turma: 'Adulto Noite',
        instrutor: 'Carlos Cruz',
        vagas: 5,
      },
    ];
  }

  async checkin(alunoId: string) {
    const aluno = await this.alunosRepo.findOne({ where: { id: alunoId } });
    if (!aluno) throw new Error('Aluno não encontrado');
    const p = this.presencasRepo.create({ aluno, data: new Date() });
    return this.presencasRepo.save(p);
  }

  async listarPorData(dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1,
    );
    return this.presencasRepo.find({
      where: { data: (p: any) => p >= start && p < end } as any,
      relations: ['aluno'],
      order: { id: 'DESC' },
    });
  }
}
