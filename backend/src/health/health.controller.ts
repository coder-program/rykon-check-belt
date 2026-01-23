import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'teamcruz-backend',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('api/health')
  apiHealthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'teamcruz-backend',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}