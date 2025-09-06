import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { FranqueadosService } from '../services/franqueados.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('franqueados')
export class FranqueadosController {
  constructor(private readonly service: FranqueadosService) {}

  @Get()
  list(@Query() q: any) {
    return this.service.list(q);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master')
  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
