"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddWhatsappCompanyConfig1787300000000 = void 0;
class AddWhatsappCompanyConfig1787300000000 {
    constructor() {
        this.name = 'AddWhatsappCompanyConfig1787300000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`company_settings\`
      ADD COLUMN IF NOT EXISTS \`whatsapp_company_id\`
        VARCHAR(100) NOT NULL DEFAULT 'empresa_demo'
    `);
        await queryRunner.query(`
      ALTER TABLE \`company_settings\`
      ADD COLUMN IF NOT EXISTS \`whatsapp_api_url\`
        VARCHAR(300) NOT NULL DEFAULT 'https://apiwatsapp-production.up.railway.app'
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`company_settings\`
      DROP COLUMN IF EXISTS \`whatsapp_api_url\`
    `);
        await queryRunner.query(`
      ALTER TABLE \`company_settings\`
      DROP COLUMN IF EXISTS \`whatsapp_company_id\`
    `);
    }
}
exports.AddWhatsappCompanyConfig1787300000000 = AddWhatsappCompanyConfig1787300000000;
//# sourceMappingURL=1787300000000-AddWhatsappCompanyConfig.js.map