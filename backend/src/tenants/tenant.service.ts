import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantService {
  private cache = new Map<string, Tenant>();

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async findBySlug(slug: string): Promise<Tenant> {
    // Cache simples para não bater no banco em cada requisição
    if (this.cache.has(slug)) {
      return this.cache.get(slug)!;
    }
    const tenant = await this.tenantRepository.findOne({
      where: { slug, ativo: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant '${slug}' não encontrado`);
    this.cache.set(slug, tenant);
    return tenant;
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({ where: { ativo: true } });
  }

  invalidateCache(slug: string) {
    this.cache.delete(slug);
  }

  // Config pública (sem dados sensíveis) — consumida pelo frontend
  async getPublicConfig(slug: string) {
    const tenant = await this.findBySlug(slug);
    return {
      slug: tenant.slug,
      nome: tenant.nome,
      logoUrl: tenant.logoUrl,
      corPrimaria: tenant.corPrimaria ?? '#111827',
      corSecundaria: tenant.corSecundaria ?? '#dc2626',
      lojaUrl: tenant.lojaUrl ?? null,
    };
  }
}
