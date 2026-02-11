import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCatracaConfigToUnidades1739127600000 implements MigrationInterface {
  name = 'AddCatracaConfigToUnidades1739127600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna JSONB para configuração da catraca biométrica
    await queryRunner.addColumn(
      'unidades',
      new TableColumn({
        name: 'catraca_config',
        type: 'jsonb',
        isNullable: true,
        comment: 'Configuração da catraca biométrica (Henry8X, ControlID, etc)',
      }),
    );

    // Adicionar coluna para habilitar/desabilitar integração com catraca
    await queryRunner.addColumn(
      'unidades',
      new TableColumn({
        name: 'catraca_habilitada',
        type: 'boolean',
        default: false,
        comment: 'Se a integração com catraca biométrica está habilitada',
      }),
    );

    // Comentário explicativo sobre a estrutura do JSON
    await queryRunner.query(`
      COMMENT ON COLUMN teamcruz.unidades.catraca_config IS 'Configuração da catraca biométrica
      Estrutura JSON: {
        "tipo": "HENRY8X" | "CONTROLID" | "INTELBRAS" | "HIKVISION" | "ZKTECO",
        "ip": "192.168.100.163",
        "porta": 3000,
        "modelo_placa": "Primme SF A",
        "sentido": "ANTI_HORARIO" | "HORARIO",
        "giro": "ENTRADA" | "SAIDA" | "BIDIRECIONAL",
        "qtd_digitos_matricula": 6,
        "tempo_liberacao_segundos": 6,
        "modelo_biometria": "PADRAO" | "FACIAL" | "DIGITAL",
        "url_callback": "https://seu-dominio.com/api/catraca/webhook",
        "api_key": "chave_secreta_para_autenticacao",
        "permite_entrada_manual": true,
        "permite_saida_automatica": false,
        "horario_funcionamento": {
          "inicio": "06:00",
          "fim": "22:00"
        }
      }';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('unidades', 'catraca_habilitada');
    await queryRunner.dropColumn('unidades', 'catraca_config');
  }
}
