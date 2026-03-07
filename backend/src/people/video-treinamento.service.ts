import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoTreinamento } from './entities/video-treinamento.entity';
import {
  CriarVideoTreinamentoDto,
  AtualizarVideoTreinamentoDto,
} from './dto/video-treinamento.dto';

@Injectable()
export class VideoTreinamentoService {
  constructor(
    @InjectRepository(VideoTreinamento)
    private repo: Repository<VideoTreinamento>,
  ) {}

  /** Retorna apenas ativos, ordenados por ordem asc, criado_em desc */
  async listarAtivos(): Promise<VideoTreinamento[]> {
    return this.repo.find({
      where: { ativo: true },
      order: { ordem: 'ASC', criado_em: 'DESC' },
    });
  }

  /** Retorna todos (ativos e inativos) — apenas admin */
  async listarTodos(): Promise<VideoTreinamento[]> {
    return this.repo.find({
      order: { ordem: 'ASC', criado_em: 'DESC' },
    });
  }

  async criar(dto: CriarVideoTreinamentoDto, criadoPorId: string): Promise<VideoTreinamento> {
    const video = this.repo.create({
      titulo: dto.titulo,
      descricao: dto.descricao ?? null,
      youtube_url: dto.youtube_url,
      modalidade_tag: dto.modalidade_tag ?? null,
      ativo: dto.ativo ?? true,
      ordem: dto.ordem ?? 0,
      criado_por: criadoPorId,
    });
    return this.repo.save(video);
  }

  async atualizar(id: string, dto: AtualizarVideoTreinamentoDto): Promise<VideoTreinamento> {
    const video = await this.repo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('Vídeo não encontrado');

    Object.assign(video, {
      ...(dto.titulo !== undefined && { titulo: dto.titulo }),
      ...(dto.descricao !== undefined && { descricao: dto.descricao }),
      ...(dto.youtube_url !== undefined && { youtube_url: dto.youtube_url }),
      ...(dto.modalidade_tag !== undefined && { modalidade_tag: dto.modalidade_tag }),
      ...(dto.ativo !== undefined && { ativo: dto.ativo }),
      ...(dto.ordem !== undefined && { ordem: dto.ordem }),
    });

    return this.repo.save(video);
  }

  async remover(id: string): Promise<{ success: boolean }> {
    const video = await this.repo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('Vídeo não encontrado');
    await this.repo.remove(video);
    return { success: true };
  }
}
