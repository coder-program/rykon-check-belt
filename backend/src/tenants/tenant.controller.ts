import { Controller, Get, Param } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /** GET /tenants — lista todos os tenants ativos (interno/admin) */
  @Get()
  findAll() {
    return this.tenantService.findAll();
  }

  /** GET /tenants/:slug/config — público, sem auth, consumido pelo frontend */
  @Get(':slug/config')
  getPublicConfig(@Param('slug') slug: string) {
    return this.tenantService.getPublicConfig(slug);
  }
}
