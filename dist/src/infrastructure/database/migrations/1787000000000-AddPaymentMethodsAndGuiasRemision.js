"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPaymentMethodsAndGuiasRemision1787000000000 = void 0;
class AddPaymentMethodsAndGuiasRemision1787000000000 {
    constructor() {
        this.name = 'AddPaymentMethodsAndGuiasRemision1787000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`sales\`
      MODIFY COLUMN \`payment_method\`
        ENUM('cash','card','transfer','mixed','yape','plin','deposit')
        NOT NULL DEFAULT 'cash'
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`guias_remision\` (
        \`id\`                          INT          NOT NULL AUTO_INCREMENT,
        \`serie\`                        VARCHAR(10)  NOT NULL DEFAULT 'T001',
        \`correlativo\`                  VARCHAR(20)  DEFAULT NULL,
        \`numero_completo\`              VARCHAR(40)  DEFAULT NULL,
        \`fecha_emision\`                DATE         NOT NULL,
        \`fecha_traslado\`               DATE         NOT NULL,
        \`dest_tipo_doc\`                VARCHAR(5)   NOT NULL,
        \`dest_num_doc\`                 VARCHAR(20)  NOT NULL,
        \`dest_razon_social\`            VARCHAR(200) NOT NULL,
        \`cod_traslado\`                 VARCHAR(5)   NOT NULL,
        \`mod_traslado\`                 VARCHAR(5)   NOT NULL,
        \`peso_total\`                   DECIMAL(12,3) NOT NULL DEFAULT 0,
        \`und_peso_total\`               VARCHAR(10)  NOT NULL DEFAULT 'KGM',
        \`num_bultos\`                   INT          DEFAULT NULL,
        \`partida_ubigeo\`               VARCHAR(10)  NOT NULL,
        \`partida_direccion\`            VARCHAR(300) NOT NULL,
        \`llegada_ubigeo\`               VARCHAR(10)  NOT NULL,
        \`llegada_direccion\`            VARCHAR(300) NOT NULL,
        \`transportista_json\`           TEXT         DEFAULT NULL,
        \`fecha_entrega_transportista\`  DATE         DEFAULT NULL,
        \`vehiculo_json\`                TEXT         DEFAULT NULL,
        \`conductor_json\`               TEXT         DEFAULT NULL,
        \`items_json\`                   LONGTEXT     NOT NULL,
        \`sunat_status\`                 VARCHAR(30)  NOT NULL DEFAULT 'PENDIENTE',
        \`sunat_message\`                VARCHAR(500) DEFAULT NULL,
        \`xml_url\`                      VARCHAR(500) DEFAULT NULL,
        \`pdf_url\`                      VARCHAR(500) DEFAULT NULL,
        \`cdr_url\`                      VARCHAR(500) DEFAULT NULL,
        \`apisunat_id\`                  INT          DEFAULT NULL,
        \`comprobante_ref\`              VARCHAR(30)  DEFAULT NULL,
        \`created_at\`                   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`                   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`sales\`
      MODIFY COLUMN \`payment_method\`
        ENUM('cash','card','transfer','mixed')
        NOT NULL DEFAULT 'cash'
    `);
        await queryRunner.query(`DROP TABLE IF EXISTS \`guias_remision\``);
    }
}
exports.AddPaymentMethodsAndGuiasRemision1787000000000 = AddPaymentMethodsAndGuiasRemision1787000000000;
//# sourceMappingURL=1787000000000-AddPaymentMethodsAndGuiasRemision.js.map