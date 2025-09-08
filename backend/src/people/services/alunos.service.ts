import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person, TipoCadastro, StatusCadastro } from '../entities/person.entity';
import { CreatePersonDto } from '../dto/create-person.dto';
import { UpdatePersonDto } from '../dto/update-person.dto';
import { FilterPersonDto } from '../dto/filter-person.dto';

@Injectable()
export class AlunosService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
  ) {}

  async list(params: FilterPersonDto) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    
    const query = this.personRepository.createQueryBuilder('person');
    
    // Filtrar por tipo de cadastro se especificado
    if (params.tipo_cadastro) {
      query.where('person.tipo_cadastro = :tipo', { tipo: params.tipo_cadastro });
    } else {
      // Se não especificado, buscar tanto alunos quanto professores
      query.where('person.tipo_cadastro IN (:...tipos)', { 
        tipos: [TipoCadastro.ALUNO, TipoCadastro.PROFESSOR] 
      });
    }
    
    // Busca por nome ou CPF
    if (params.search) {
      query.andWhere(
        '(LOWER(person.nome_completo) LIKE :search OR person.cpf LIKE :search)',
        { search: `%${params.search.toLowerCase()}%` }
      );
    }
    
    // Filtro por faixa
    if (params.faixa && params.faixa !== 'todos') {
      if (params.faixa === 'kids') {
        query.andWhere('person.faixa_atual IN (:...faixas)', {
          faixas: ['CINZA', 'AMARELA', 'LARANJA', 'VERDE']
        });
      } else {
        query.andWhere('person.faixa_atual NOT IN (:...faixas)', {
          faixas: ['CINZA', 'AMARELA', 'LARANJA', 'VERDE']
        });
      }
    }
    
    // Filtro por unidade
    if (params.unidade_id) {
      query.andWhere('person.unidade_id = :unidade', { unidade: params.unidade_id });
    }
    
    // Filtro por status
    if (params.status) {
      query.andWhere('person.status = :status', { status: params.status });
    }
    
    // Paginação
    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    
    return {
      items,
      page,
      pageSize,
      total,
      hasNextPage: page * pageSize < total,
    };
  }

  async create(dto: CreatePersonDto): Promise<Person> {
    // Verificar se CPF já existe
    const existingPerson = await this.personRepository.findOne({
      where: { cpf: dto.cpf }
    });
    
    if (existingPerson) {
      throw new ConflictException('CPF já cadastrado');
    }
    
    // Criar nova pessoa usando o tipo_cadastro do DTO
    const person = this.personRepository.create({
      ...dto,
      status: dto.status || StatusCadastro.ATIVO,
    });
    
    // Se for aluno, definir data_matricula
    if (dto.tipo_cadastro === TipoCadastro.ALUNO && !person.data_matricula) {
      person.data_matricula = new Date();
    }
    
    return await this.personRepository.save(person);
  }

  async update(id: string, dto: UpdatePersonDto): Promise<Person> {
    const person = await this.personRepository.findOne({ where: { id } });
    
    if (!person) {
      throw new NotFoundException('Aluno não encontrado');
    }
    
    // Se mudou o CPF, verificar se já não existe
    if (dto.cpf && dto.cpf !== person.cpf) {
      const existingPerson = await this.personRepository.findOne({
        where: { cpf: dto.cpf }
      });
      
      if (existingPerson) {
        throw new ConflictException('CPF já cadastrado');
      }
    }
    
    Object.assign(person, dto);
    return await this.personRepository.save(person);
  }

  async get(id: string): Promise<Person | null> {
    return await this.personRepository.findOne({ 
      where: { id, tipo_cadastro: TipoCadastro.ALUNO } 
    });
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.personRepository.delete({ 
      id, 
      tipo_cadastro: TipoCadastro.ALUNO 
    });
    return (result.affected ?? 0) > 0;
  }

}
