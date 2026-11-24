import { MigrationInterface, QueryRunner } from 'typeorm';
import { ensureAuditSchema } from '../ensure-audit-schema';

export class AddAuditLog1788200000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> { await ensureAuditSchema(q); }
  async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE IF EXISTS `audit_log`'); }
}
