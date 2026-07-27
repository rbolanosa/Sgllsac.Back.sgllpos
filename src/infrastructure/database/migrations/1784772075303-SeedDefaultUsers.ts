import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export class SeedDefaultUsers1784772075303 implements MigrationInterface {
  name = 'SeedDefaultUsers1784772075303';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const adminPassHash = await bcrypt.hash('admin123', 10);
    const cashierPassHash = await bcrypt.hash('cajero123', 10);

    // Insert admin@sgll.com if not exists
    const existingAdmin = await queryRunner.query(
      `SELECT id FROM \`users\` WHERE \`email\` = 'admin@sgll.com' LIMIT 1`,
    );
    if (!existingAdmin || existingAdmin.length === 0) {
      await queryRunner.query(
        `INSERT INTO \`users\` (\`name\`, \`email\`, \`password\`, \`role\`, \`is_active\`)
         VALUES ('Administrador General', 'admin@sgll.com', '${adminPassHash}', 'admin', 1)`,
      );
    }

    // Insert cajero@sgll.com if not exists
    const existingCashier = await queryRunner.query(
      `SELECT id FROM \`users\` WHERE \`email\` = 'cajero@sgll.com' LIMIT 1`,
    );
    if (!existingCashier || existingCashier.length === 0) {
      await queryRunner.query(
        `INSERT INTO \`users\` (\`name\`, \`email\`, \`password\`, \`role\`, \`is_active\`)
         VALUES ('Cajero Principal', 'cajero@sgll.com', '${cashierPassHash}', 'cashier', 1)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`users\` WHERE \`email\` IN ('admin@sgll.com', 'cajero@sgll.com')`,
    );
  }
}
