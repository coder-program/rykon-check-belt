import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Entities
import { Plano } from './entities/plano.entity';
import { Assinatura } from './entities/assinatura.entity';
import { Fatura } from './entities/fatura.entity';
import { Transacao } from './entities/transacao.entity';
import { Despesa } from './entities/despesa.entity';
import { ConfiguracaoCobranca } from './entities/configuracao-cobranca.entity';
import { Venda } from './entities/venda.entity';
import { Convenio } from './entities/convenio.entity';
import { AlunoConvenio } from './entities/aluno-convenio.entity';
import { ConfiguracaoConvenioUnidade } from './entities/configuracao-convenio-unidade.entity';
import { EventoConvenio } from './entities/evento-convenio.entity';
import { UnidadeConvenio } from './entities/unidade-convenio.entity';

// Entities externas necessárias
import { Aluno } from '../people/entities/aluno.entity';
import { Unidade } from '../people/entities/unidade.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Presenca } from '../presenca/entities/presenca.entity';

// Services
import { PlanosService } from './services/planos.service';
import { AssinaturasService } from './services/assinaturas.service';
import { FaturasService } from './services/faturas.service';
import { TransacoesService } from './services/transacoes.service';
import { DespesasService } from './services/despesas.service';
import { ConfiguracoesCobrancaService } from './services/configuracoes-cobranca.service';
import { DashboardFinanceiroService } from './services/dashboard-financeiro.service';
import { VendasService } from './services/vendas.service';
import { AutomacoesService } from './services/automacoes.service';
import { NotificacoesService } from './services/notificacoes.service';
import { WhatsappService } from './services/whatsapp.service';
import { GympassService } from './services/gympass.service';
import { AnexosService } from './services/anexos.service';

// Controllers
import { PlanosController } from './controllers/planos.controller';
import { AssinaturasController } from './controllers/assinaturas.controller';
import { FaturasController } from './controllers/faturas.controller';
import { TransacoesController } from './controllers/transacoes.controller';
import { DespesasController } from './controllers/despesas.controller';
import { ConfiguracoesCobrancaController } from './controllers/configuracoes-cobranca.controller';
import { DashboardFinanceiroController } from './controllers/dashboard-financeiro.controller';
import { VendasController } from './controllers/vendas.controller';
import { AutomacoesController } from './controllers/automacoes.controller';
import { GympassController } from './controllers/gympass.controller';
import { AnexosController } from './controllers/anexos.controller';
import { PagamentosOnlineController } from './controllers/pagamentos-online.controller';
import { WebhooksController } from './controllers/webhooks.controller';

// Services externos
import { PaytimeService } from '../paytime/paytime.service';
import { PaytimeIntegrationService } from './services/paytime-integration.service';
import { PaytimeWebhookService } from './services/paytime-webhook.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      // Entities financeiras
      Plano,
      Assinatura,
      Fatura,
      Transacao,
      Despesa,
      ConfiguracaoCobranca,
      Venda,
      Convenio,
      AlunoConvenio,
      ConfiguracaoConvenioUnidade,
      EventoConvenio,
      UnidadeConvenio,
      // Entities externas
      Aluno,
      Unidade,
      Usuario,
      Presenca,
    ]),
  ],
  controllers: [
    PlanosController,
    AssinaturasController,
    FaturasController,
    TransacoesController,
    DespesasController,
    ConfiguracoesCobrancaController,
    DashboardFinanceiroController,
    VendasController,
    AutomacoesController,
    GympassController,
    AnexosController,
    PagamentosOnlineController,
    WebhooksController,
  ],
  providers: [
    PlanosService,
    AssinaturasService,
    FaturasService,
    TransacoesService,
    DespesasService,
    ConfiguracoesCobrancaService,
    DashboardFinanceiroService,
    VendasService,
    AutomacoesService,
    NotificacoesService,
    WhatsappService,
    PaytimeService,
    PaytimeIntegrationService,
    PaytimeWebhookService,
    GympassService,
    AnexosService,
  ],
  exports: [
    PlanosService,
    AssinaturasService,
    FaturasService,
    TransacoesService,
    DespesasService,
    ConfiguracoesCobrancaService,
    DashboardFinanceiroService,
    VendasService,
    AutomacoesService,
    NotificacoesService,
    WhatsappService,
    GympassService,
    AnexosService,
  ],
})
export class FinanceiroModule {}
