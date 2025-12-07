# Implementações Restantes para presenca.service.ts

## 1. getMeusFilhos - SUBSTITUIR MÉTODO COMPLETO

```typescript
async getMeusFilhos(responsavelUser: any) {

  // Buscar usuário responsável
  const usuario = await this.personRepository.findOne({
    where: { id: responsavelUser.id },
  });

  if (!usuario || !usuario.cpf) {
    return [];
  }

  // Buscar alunos que têm este CPF como responsável
  const filhos = await this.alunoRepository.find({
    where: {
      responsavel_cpf: usuario.cpf,
    },
    relations: ['unidade'],
  });


  // Verificar quais já fizeram check-in hoje
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const presencasHoje = await this.presencaRepository.find({
    where: {
      pessoaId: In(filhos.map((a) => a.id)),
      dataPresenca: Between(hoje, amanha),
    },
  });

  const idsComPresenca = new Set(presencasHoje.map((p) => p.pessoaId));

  return filhos.map((filho) => ({
    id: filho.id,
    nome: filho.nome_completo,
    graduacao: `${filho.faixa_atual} - ${filho.graus} graus`,
    jaFezCheckin: idsComPresenca.has(filho.id),
  }));
}
```

## 2. getMinhaHistorico - SUBSTITUIR MÉTODO COMPLETO

```typescript
async getMinhaHistorico(user: any, limit: number = 10) {

  // Buscar aluno
  const aluno = await this.alunoRepository.findOne({
    where: { usuario_id: user.id },
  });

  if (!aluno) {
    return [];
  }

  const presencas = await this.presencaRepository.find({
    where: { pessoaId: aluno.id },
    order: { dataPresenca: 'DESC', horaCheckin: 'DESC' },
    take: limit,
  });

  // Buscar aulas relacionadas
  const aulaIds = presencas.map(p => p.aulaId).filter(id => id);
  const aulas = await this.aulaRepository.find({
    where: { id: In(aulaIds) },
    relations: ['professor', 'unidade'],
  });

  const aulasMap = new Map(aulas.map(a => [a.id, a]));

  return presencas.map((p) => {
    const aula = p.aulaId ? aulasMap.get(p.aulaId) : null;

    return {
      id: p.id,
      data: p.dataPresenca,
      horario: p.horaCheckin.toTimeString().slice(0, 5),
      tipo: 'entrada',
      aula: {
        nome: aula?.nome || 'Aula não especificada',
        professor: aula?.professor?.nome_completo || 'Professor',
        unidade: aula?.unidade?.nome || 'Unidade',
      },
    };
  });
}
```

## 3. buscarAlunos - SUBSTITUIR MÉTODO COMPLETO

```typescript
async buscarAlunos(termo: string, user: any) {

  const query = this.alunoRepository
    .createQueryBuilder('aluno')
    .where(
      '(aluno.nome_completo ILIKE :termo OR aluno.cpf LIKE :cpfTermo)',
      {
        termo: `%${termo}%`,
        cpfTermo: `%${termo.replace(/\D/g, '')}%`,
      },
    )
    .take(20);

  const alunos = await query.getMany();

  return alunos.map((aluno) => ({
    id: aluno.id,
    nome: aluno.nome_completo,
    cpf: aluno.cpf,
    graduacao: `${aluno.faixa_atual} - ${aluno.graus} graus`,
  }));
}
```

## 4. checkInCPF - SUBSTITUIR MÉTODO COMPLETO

```typescript
async checkInCPF(cpf: string, aulaId: string, adminUser: any) {

  // Buscar aluno pelo CPF
  const aluno = await this.alunoRepository.findOne({
    where: {
      cpf: cpf.replace(/\D/g, ''),
    },
  });

  if (!aluno) {
    throw new NotFoundException('Aluno não encontrado com este CPF');
  }

  return this.realizarCheckInAdmin(aluno.id, aulaId, PresencaMetodo.CPF, adminUser);
}
```

## 5. realizarCheckInAdmin - ATUALIZAR MÉTODO

```typescript
private async realizarCheckInAdmin(
  alunoId: string,
  aulaId: string,
  metodo: PresencaMetodo,
  adminUser: any,
) {

  // Buscar aula
  const aula = await this.aulaRepository.findOne({
    where: { id: aulaId },
  });

  if (!aula) {
    throw new NotFoundException('Aula não encontrada');
  }

  // Verificar se já fez check-in hoje
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const presencaHoje = await this.presencaRepository.findOne({
    where: {
      pessoaId: alunoId,
      dataPresenca: Between(hoje, amanha),
    },
  });

  if (presencaHoje) {
    throw new BadRequestException('Aluno já fez check-in hoje');
  }

  // Registrar presença
  const presenca = this.presencaRepository.create({
    pessoaId: alunoId,
    unidadeId: aula.unidade_id,
    aulaId: aula.id,
    dataPresenca: hoje,
    horaCheckin: new Date(),
    metodoCheckin: metodo,
    status: PresencaStatus.PRESENTE,
    observacoes: `Registrado por admin: ${adminUser.username}`,
    validadoPor: adminUser.id,
  });

  const presencaSalva = await this.presencaRepository.save(presenca);

  // Incrementar contador de graduação
  try {
    const alunoFaixaAtiva = await this.alunoFaixaRepository.findOne({
      where: {
        aluno_id: alunoId,
        ativa: true,
      },
    });

    if (alunoFaixaAtiva) {
      alunoFaixaAtiva.presencas_no_ciclo += 1;
      alunoFaixaAtiva.presencas_total_fx += 1;
      await this.alunoFaixaRepository.save(alunoFaixaAtiva);
    }
  } catch (error) {
    console.error(' Erro ao incrementar graduação:', error.message);
  }

  return {
    success: true,
    message: 'Check-in administrativo realizado com sucesso!',
    presenca: presencaSalva,
  };
}
```

## 6. checkInResponsavel - SUBSTITUIR MÉTODO COMPLETO

```typescript
async checkInResponsavel(
  alunoId: string,
  aulaId: string,
  responsavelUser: any,
) {
  console.log('🔵 [checkInResponsavel] Responsável fazendo check-in do filho');

  // Verificar se o aluno existe
  const aluno = await this.alunoRepository.findOne({
    where: { id: alunoId },
  });

  if (!aluno) {
    throw new NotFoundException('Aluno não encontrado');
  }

  // Buscar usuário responsável
  const usuario = await this.personRepository.findOne({
    where: { id: responsavelUser.id },
  });

  // Verificar se o responsável tem permissão (CPF do responsável = responsavel_cpf do aluno)
  if (usuario && usuario.cpf !== aluno.responsavel_cpf) {
    throw new ForbiddenException('Você não é o responsável cadastrado por este aluno');
  }

  // Buscar aula
  const aula = await this.aulaRepository.findOne({
    where: { id: aulaId },
  });

  if (!aula) {
    throw new NotFoundException('Aula não encontrada');
  }

  // Verificar se já fez check-in hoje
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const presencaHoje = await this.presencaRepository.findOne({
    where: {
      pessoaId: alunoId,
      dataPresenca: Between(hoje, amanha),
    },
  });

  if (presencaHoje) {
    throw new BadRequestException('Este aluno já fez check-in hoje');
  }

  // Registrar presença pelo responsável
  const presenca = this.presencaRepository.create({
    pessoaId: alunoId,
    unidadeId: aula.unidade_id,
    aulaId: aula.id,
    dataPresenca: hoje,
    horaCheckin: new Date(),
    metodoCheckin: PresencaMetodo.RESPONSAVEL,
    status: PresencaStatus.PRESENTE,
    responsavelCheckinId: responsavelUser.id,
    observacoes: `Check-in realizado pelo responsável`,
  });

  const presencaSalva = await this.presencaRepository.save(presenca);

  // Incrementar contador de graduação do aluno
  try {
    const alunoFaixaAtiva = await this.alunoFaixaRepository.findOne({
      where: {
        aluno_id: alunoId,
        ativa: true,
      },
    });

    if (alunoFaixaAtiva) {
      alunoFaixaAtiva.presencas_no_ciclo += 1;
      alunoFaixaAtiva.presencas_total_fx += 1;
      await this.alunoFaixaRepository.save(alunoFaixaAtiva);
    }
  } catch (error) {
    console.log('Erro ao incrementar graduação:', error.message);
  }

  return {
    success: true,
    message: 'Check-in do aluno realizado com sucesso!',
    presenca: presencaSalva,
  };
}
```

## 7. Corrigir Frontend - page.tsx

No arquivo `frontend/app/presenca/page.tsx`, corrigir linha 706-739:

```typescript
// ANTES (linha ~706):
metodoCheckin === 'qr';

// DEPOIS:
metodoCheckin === 'QR_CODE';

// E assim por diante para todos os métodos:
// "qr" → "QR_CODE"
// "cpf" → "CPF"
// "facial" → "FACIAL"
// "responsavel" → "NOME" (para busca por nome)
```

## 8. Adicionar ao frontend o endpoint correto dos filhos

Alterar linha 186:

```typescript
// ANTES:
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/pessoas/meus-filhos`,

// DEPOIS:
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/presenca/meus-filhos`,
```

## Resumo das Migrations criadas:

1. `1759657127000-CreateAulasTable.ts` - Criar tabela aulas
2. `1759657200000-AddUsuarioIdToAlunos.ts` - Adicionar usuario_id em alunos

Execute as migrations:

```bash
npm run typeorm migration:run
```
