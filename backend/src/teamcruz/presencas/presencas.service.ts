import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Presenca } from './entities/presenca.entity';
import { Person, TipoCadastro } from '../../people/entities/person.entity';
import { GraduacaoService } from '../../graduacao/graduacao.service';

@Injectable()
export class PresencasService {
  constructor(
    @InjectRepository(Presenca) private presencasRepo: Repository<Presenca>,
    @InjectRepository(Person) private personRepo: Repository<Person>,
    @Inject(forwardRef(() => GraduacaoService))
    private graduacaoService: GraduacaoService,
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

  async checkin(pessoaId: string) {
    const pessoa = await this.personRepo.findOne({
      where: {
        id: pessoaId,
        tipo_cadastro: TipoCadastro.ALUNO,
      },
    });
    if (!pessoa) throw new Error('Aluno não encontrado');

    // Salvar presença
    const p = this.presencasRepo.create({
      aluno_id: pessoaId,
      aluno: pessoa,
      data: new Date(),
    });
    const presencaSalva = await this.presencasRepo.save(p);

    // Incrementar contador de graduação e verificar se deve conceder grau
    try {
      const { grauConcedido, statusAtualizado } =
        await this.graduacaoService.incrementarPresenca(pessoaId);

      // Retornar presença com informação adicional sobre graduação
      return {
        ...presencaSalva,
        graduacao: {
          grauConcedido,
          statusAtual: statusAtualizado,
        },
      };
    } catch (error) {
      // Se não houver faixa ativa, apenas retornar a presença
      return presencaSalva;
    }
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
      relations: ['pessoa'],
      order: { id: 'DESC' },
    });
  }
}
