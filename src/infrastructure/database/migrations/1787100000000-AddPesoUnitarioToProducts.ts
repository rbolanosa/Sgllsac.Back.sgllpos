import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega columna peso_unitario a la tabla products.
 * Permite calcular el peso total de la Guía de Remisión
 * automáticamente desde los ítems del comprobante vinculado.
 */
export class AddPesoUnitarioToProducts1787100000000
  implements MigrationInterface
{
  name = 'AddPesoUnitarioToProducts1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`products\`
      ADD COLUMN IF NOT EXISTS \`peso_unitario\`
        DECIMAL(10, 3) NULL DEFAULT NULL
        COMMENT 'Peso unitario en KG. Se usa en la Guía de Remisión.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`products\` DROP COLUMN IF EXISTS \`peso_unitario\`
    `);
  }
}
