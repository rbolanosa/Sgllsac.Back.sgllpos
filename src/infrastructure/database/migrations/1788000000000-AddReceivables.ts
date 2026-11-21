import { MigrationInterface, QueryRunner } from 'typeorm';
import { ensureReceivablesSchema } from '../ensure-receivables-schema';

export class AddReceivables1788000000000 implements MigrationInterface {
  name = 'AddReceivables1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mismo DDL que el paso de arranque de Vercel (idempotente)
    await ensureReceivablesSchema({ query: (sql: string, p?: any[]) => queryRunner.query(sql, p).then((r: any) => [r]) } as any);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `sunat_voids`');
    await queryRunner.query('DROP TABLE IF EXISTS `receivable_payments`');
    await queryRunner.query('DROP TABLE IF EXISTS `receivable_installments`');
    await queryRunner.query('DROP TABLE IF EXISTS `receivables`');
  }
}
