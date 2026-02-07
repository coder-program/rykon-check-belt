import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaytimeController } from './paytime.controller';
import { PaytimeWebhookController } from './paytime-webhook.controller';
import { PaytimeService } from './paytime.service';
import { PaytimeWebhookService } from './paytime-webhook.service';
import { Unidade } from '../people/entities/unidade.entity';
import { Transacao } from '../financeiro/entities/transacao.entity';
import { Fatura } from '../financeiro/entities/fatura.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Unidade, Transacao, Fatura])],
  controllers: [PaytimeController, PaytimeWebhookController],
  providers: [PaytimeService, PaytimeWebhookService],
  exports: [PaytimeService, PaytimeWebhookService],
})
export class PaytimeModule {}