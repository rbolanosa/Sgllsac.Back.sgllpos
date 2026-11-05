import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVoidPinHash1787400000000 implements MigrationInterface {
  name = 'AddVoidPinHash1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('company_settings', 'void_pin_hash'))
      return;

    await queryRunner.addColumn(
      'company_settings',
      new TableColumn({
        name: 'void_pin_hash',
        type: 'varchar',
        length: '200',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('company_settings', 'void_pin_hash')) {
      await queryRunner.dropColumn('company_settings', 'void_pin_hash');
    }
  }
}
