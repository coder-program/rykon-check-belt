import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuditAction } from './entities/audit-log.entity';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('AUDIT_READ')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('action') action?: AuditAction,
    @Query('entityName') entityName?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      action,
      entityName,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.auditService.findAll(
      parseInt(page),
      parseInt(limit),
      filters
    );
  }

  @Get('entity/:entityName/:entityId')
  async findByEntity(
    @Param('entityName') entityName: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(entityName, entityId);
  }
}
