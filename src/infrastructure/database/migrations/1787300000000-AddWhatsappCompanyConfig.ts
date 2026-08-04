import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhatsappCompanyConfig1787300000000 implements MigrationInterface {
  name = 'AddWhatsappCompanyConfig1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add whatsapp_company_id column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE \`company_settings\`
      ADD COLUMN IF NOT EXISTS \`whatsapp_company_id\`
        VARCHAR(100) NOT NULL DEFAULT 'empresa_demo'
    `);

    // Add whatsapp_api_url column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE \`company_settings\`
      ADD COLUMN IF NOT EXISTS \`whatsapp_api_url\`
        VARCHAR(300) NOT NULL DEFAULT 'https://apiwatsapp-production.up.railway.app'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
