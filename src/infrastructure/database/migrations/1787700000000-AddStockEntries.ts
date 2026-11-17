import { MigrationInterface, QueryRunner } from 'typeorm';
import { ensureStockEntriesSchema } from '../ensure-stock-entries-schema';

export class AddStockEntries1787700000000 implements MigrationInterface {
  name = 'AddStockEntries1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mismo DDL que el paso de arranque de Vercel (idempotente)
    await ensureStockEntriesSchema({ query: (sql: string) => queryRunner.query(sql) } as any);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `supplier_product_maps`');
    await queryRunner.query('DROP TABLE IF EXISTS `stock_entries`');
  }
}
