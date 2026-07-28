"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCashTables1784900000000 = void 0;
class CreateCashTables1784900000000 {
    constructor() {
        this.name = 'CreateCashTables1784900000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`cash_sessions\` (
        \`id\`               INT           NOT NULL AUTO_INCREMENT,
        \`cashier_id\`       INT           NOT NULL,
        \`establishment_id\` INT           NULL,
        \`status\`           ENUM('open','closed') NOT NULL DEFAULT 'open',
        \`opening_amount\`   DECIMAL(12,2) NOT NULL DEFAULT 0,
        \`expected_amount\`  DECIMAL(12,2) NOT NULL DEFAULT 0,
        \`closing_amount\`   DECIMAL(12,2) NULL,
        \`difference\`       DECIMAL(12,2) NULL,
        \`closing_notes\`    TEXT          NULL,
        \`opened_at\`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`closed_at\`        TIMESTAMP     NULL,
        \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_cash_sessions_cashier\` (\`cashier_id\`),
        INDEX \`IDX_cash_sessions_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`cash_movements\` (
        \`id\`             INT           NOT NULL AUTO_INCREMENT,
        \`session_id\`     INT           NOT NULL,
        \`type\`           ENUM(
          'opening','sale_cash','sale_card','sale_transfer',
          'sale_yape','sale_mixed','withdrawal','deposit',
          'expense','refund','closing'
        ) NOT NULL,
        \`amount\`         DECIMAL(12,2) NOT NULL DEFAULT 0,
        \`description\`    VARCHAR(300)  NULL,
        \`reference_id\`   INT           NULL,
        \`payment_method\` VARCHAR(50)   NULL,
        \`created_by\`     INT           NULL,
        \`created_at\`     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_cash_movements_session\` (\`session_id\`),
        CONSTRAINT \`FK_cash_movements_session\`
          FOREIGN KEY (\`session_id\`) REFERENCES \`cash_sessions\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`cash_movements\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`cash_sessions\``);
    }
}
exports.CreateCashTables1784900000000 = CreateCashTables1784900000000;
//# sourceMappingURL=1784900000000-CreateCashTables.js.map