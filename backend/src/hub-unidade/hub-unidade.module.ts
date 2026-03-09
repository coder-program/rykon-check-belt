import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HubUnidadeController } from './hub-unidade.controller';
import { HubUnidadeService }    from './hub-unidade.service';
import { UnidadeVideo }         from './entities/unidade-video.entity';
import { UnidadeRecado }        from './entities/unidade-recado.entity';
import { UnidadeRecadoLido }    from './entities/unidade-recado-lido.entity';
import { UnidadeProduto }       from './entities/unidade-produto.entity';
import { ProdutoPedido }        from './entities/produto-pedido.entity';
import { ProdutoPedidoItem }    from './entities/produto-pedido-item.entity';
import { Unidade }              from '../people/entities/unidade.entity';
import { Aluno }                from '../people/entities/aluno.entity';
import { Fatura }               from '../financeiro/entities/fatura.entity';
import { EmailModule }          from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UnidadeVideo,
      UnidadeRecado,
      UnidadeRecadoLido,
      UnidadeProduto,
      ProdutoPedido,
      ProdutoPedidoItem,
      Unidade,
      Aluno,
      Fatura,
    ]),
    EmailModule,
  ],
  controllers: [HubUnidadeController],
  providers: [HubUnidadeService],
  exports: [HubUnidadeService],
})
export class HubUnidadeModule {}
