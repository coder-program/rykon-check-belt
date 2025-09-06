import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campanha } from './entities/campanha.entity';

@Injectable()
export class CampanhasService {
  constructor(
    @InjectRepository(Campanha)
    private repo: Repository<Campanha>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  create(data: Partial<Campanha>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  update(id: string, data: Partial<Campanha>) {
    return this.repo.save({ id, ...data });
  }

  remove(id: string) {
    return this.repo.delete({ id });
  }

  async enviar(id: string) {
    const c = await this.repo.findOneBy({ id });
    if (!c) return null;
    c.status = 'ativa' as any;
    c.enviados = Math.max(c.enviados, Math.floor(Math.random() * 200) + 100);
    return this.repo.save(c);
  }
}
