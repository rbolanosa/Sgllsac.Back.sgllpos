"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateProductBatches1784800000000 = void 0;
class CreateProductBatches1784800000000 {
    constructor() {
        this.name = 'CreateProductBatches1784800000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`product_batches\` (
        \`id\`               INT           NOT NULL AUTO_INCREMENT,
        \`product_id\`       INT           NOT NULL,
        \`supplier_id\`      INT           NULL,
        \`document_ref\`     VARCHAR(100)  NULL,
        \`cost_price\`       DECIMAL(10,4) NOT NULL DEFAULT 0,
        \`initial_quantity\` DECIMAL(10,3) NOT NULL DEFAULT 0,
        \`current_quantity\` DECIMAL(10,3) NOT NULL DEFAULT 0,
        \`expiration_date\`  DATE          NULL,
        \`is_active\`        TINYINT(1)    NOT NULL DEFAULT 1,
        \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_batches_product_id\` (\`product_id\`),
        CONSTRAINT \`FK_product_batches_product\`
          FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_product_batches_supplier\`
          FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`product_batches\``);
    }
}
exports.CreateProductBatches1784800000000 = CreateProductBatches1784800000000;
//# sourceMappingURL=1784800000000-CreateProductBatches.js.map