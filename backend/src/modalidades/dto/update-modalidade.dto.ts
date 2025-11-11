import { PartialType } from '@nestjs/swagger';
import { CreateModalidadeDto } from './create-modalidade.dto';

export class UpdateModalidadeDto extends PartialType(CreateModalidadeDto) {}
