import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega columnas sunat_client_id y sunat_client_secret a la tabla company_settings.
 * Permite configurar las credenciales API SOL (GRE) directamente desde el Frontend.
 */
export class AddSunatClientCredentials1787200000000 implements MigrationInterface {
  name = 'AddSunatClientCredentials1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`company_settings\`
      ADD COLUMN IF NOT EXISTS \`sunat_client_id\` VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS \`sunat_client_secret\` VARCHAR(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`company_settings\`
      DROP COLUMN IF EXISTS \`sunat_client_id\`,
      DROP COLUMN IF EXISTS \`sunat_client_secret\`
    `);
  }
}
