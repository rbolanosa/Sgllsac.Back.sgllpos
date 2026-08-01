"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddSunatClientCredentials1787200000000 = void 0;
class AddSunatClientCredentials1787200000000 {
    constructor() {
        this.name = 'AddSunatClientCredentials1787200000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`company_settings\`
      ADD COLUMN IF NOT EXISTS \`sunat_client_id\` VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS \`sunat_client_secret\` VARCHAR(255) NULL
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`company_settings\`
      DROP COLUMN IF EXISTS \`sunat_client_id\`,
      DROP COLUMN IF EXISTS \`sunat_client_secret\`
    `);
    }
}
exports.AddSunatClientCredentials1787200000000 = AddSunatClientCredentials1787200000000;
//# sourceMappingURL=1787200000000-AddSunatClientCredentials.js.map