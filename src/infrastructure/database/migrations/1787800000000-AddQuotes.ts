import { MigrationInterface, QueryRunner } from 'typeorm';
import { ensureQuotesSchema } from '../ensure-quotes-schema';

export class AddQuotes1787800000000 implements MigrationInterface {
  name = 'AddQuotes1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mismo DDL que el paso de arranque de Vercel (idempotente)
    await ensureQuotesSchema({ query: (sql: string) => queryRunner.query(sql) } as any);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `quotes`');
  }
}
