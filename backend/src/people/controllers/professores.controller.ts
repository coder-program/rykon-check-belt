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
import { ProfessoresService } from '../services/professores.service';

@Controller('professores')
export class ProfessoresController {
  constructor(private readonly service: ProfessoresService) {}

  @Get()
  list(@Query() q: any) {
    return this.service.list(q);
  }
  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
