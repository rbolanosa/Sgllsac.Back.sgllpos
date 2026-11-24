import { MigrationInterface, QueryRunner } from 'typeorm';
import { ensureProfilesSchema } from '../ensure-profiles-schema';

export class AddProfiles1788100000000 implements MigrationInterface {
  name = 'AddProfiles1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await ensureProfilesSchema({ query: (sql, p) => queryRunner.query(sql, p) });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `user_profiles`');
    await queryRunner.query('DROP TABLE IF EXISTS `profiles`');
  }
}
