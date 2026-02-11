import { Injectable, Inject, forwardRef, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Presenca } from '../../presenca/entities/presenca.entity';
import { Person, TipoCadastro } from '../../people/entities/person.entity';
import { AlunoFaixa } from '../../graduacao/entities/aluno-faixa.entity';
import { GraduacaoService } from '../../graduacao/graduacao.service';

@Injectable()
export class PresencasService {
  constructor(
    @InjectRepository(Presenca) private presencasRepo: Repository<Presenca>,
    @InjectRepository(Person) private personRepo: Repository<Person>,
    @InjectRepository(AlunoFaixa) private alunoFaixaRepo: Repository<AlunoFaixa>,
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

  // MÉTODO DESABILITADO - Usar presenca.service.ts principal
  async checkin(pessoaId: string) {
    throw new Error('Método checkin desabilitado neste módulo. Use /presenca/registrar');
  }

  // MÉTODO DESABILITADO - Usar presenca.service.ts principal
  async listarPorData(dateStr?: string) {
    throw new Error('Método listarPorData desabilitado neste módulo. Use /presenca/relatorio-presencas');
  }

  async deletarPresenca(presencaId: string, user: any) {
    console.log(`🗑️  [DELETAR PRESENÇA] ID: ${presencaId}, User: ${user?.id}`);

    // Verificar permissões - apenas franqueado, gerente, recepcionista e professor podem deletar
    const perfis = user?.perfis?.map((p: any) => 
      (typeof p === 'string' ? p : p.nome)?.toLowerCase()
    ) || [];

    const temPermissao = perfis.some((perfil: string) =>
      ['admin_master', 'franqueado', 'gerente_unidade', 'recepcionista', 'professor', 'instrutor'].includes(perfil)
    );

    if (!temPermissao) {
      console.error('🚫 [DELETAR PRESENÇA] Permissão negada para usuário:', user?.id);
      throw new ForbiddenException('Você não tem permissão para deletar presenças');
    }

    // Verificar se presença existe
    const presenca = await this.presencasRepo.findOne({
      where: { id: presencaId },
    });

    if (!presenca) {
      console.error('❌ [DELETAR PRESENÇA] Presença não encontrada:', presencaId);
      throw new NotFoundException('Presença não encontrada');
    }

    console.log(`✅ [DELETAR PRESENÇA] Presença encontrada - Aluno: ${presenca.aluno_id}`);

    // Buscar registro ativo de aluno_faixa para decrementar contadores
    const alunoFaixa = await this.alunoFaixaRepo.findOne({
      where: {
        aluno_id: presenca.aluno_id,
        ativa: true,
      },
    });

    if (alunoFaixa) {
      console.log(`📊 [DELETAR PRESENÇA] Decrementando contadores - presencas_no_ciclo: ${alunoFaixa.presencas_no_ciclo} → ${Math.max(0, alunoFaixa.presencas_no_ciclo - 1)}, presencas_total_fx: ${alunoFaixa.presencas_total_fx} → ${Math.max(0, alunoFaixa.presencas_total_fx - 1)}`);
      
      // Decrementar contadores (nunca deixar negativo)
      alunoFaixa.presencas_no_ciclo = Math.max(0, alunoFaixa.presencas_no_ciclo - 1);
      alunoFaixa.presencas_total_fx = Math.max(0, alunoFaixa.presencas_total_fx - 1);
      
      await this.alunoFaixaRepo.save(alunoFaixa);
      console.log(`✅ [DELETAR PRESENÇA] Contadores atualizados em aluno_faixa`);
    } else {
      console.log(`⚠️ [DELETAR PRESENÇA] Nenhum registro ativo encontrado em aluno_faixa para aluno ${presenca.aluno_id}`);
    }

    // Deletar presença do banco
    await this.presencasRepo.delete(presencaId);

    console.log(`✅ [DELETAR PRESENÇA] Presença ${presencaId} deletada com sucesso`);

    return {
      message: 'Presença deletada com sucesso',
      presencaId,
      alunoFaixaAtualizado: !!alunoFaixa,
    };
  }
}