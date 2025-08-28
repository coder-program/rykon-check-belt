import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

export interface AuditLogData {
  action: AuditAction;
  entityName: string;
  entityId?: string;
  userId: string;
  username: string;
  ipAddress: string;
  userAgent?: string;
  oldValues?: any;
  newValues?: any;
  description?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: data.action,
        entity_name: data.entityName,
        entity_id: data.entityId,
        user_id: data.userId,
        username: data.username,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        old_values: data.oldValues ? JSON.stringify(data.oldValues) : null,
        new_values: data.newValues ? JSON.stringify(data.newValues) : null,
        description: data.description,
      } as any);

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      console.error('Erro ao salvar log de auditoria:', error);
      // Não lançar erro para não interromper a operação principal
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    filters?: {
      action?: AuditAction;
      entityName?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (filters?.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters?.entityName) {
      query.andWhere('audit.entity_name = :entityName', { entityName: filters.entityName });
    }

    if (filters?.userId) {
      query.andWhere('audit.user_id = :userId', { userId: filters.userId });
    }

    if (filters?.startDate) {
      query.andWhere('audit.created_at >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('audit.created_at <= :endDate', { endDate: filters.endDate });
    }

    query
      .orderBy('audit.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findByEntity(entityName: string, entityId: string): Promise<AuditLog[]> {
    return await this.auditLogRepository.find({
      where: {
        entity_name: entityName,
        entity_id: entityId,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }
}
