import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPresentationCosts1787900000000 implements MigrationInterface {
  name = 'AddPresentationCosts1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('product_presentations', 'cost_price'))) {
      await queryRunner.query('ALTER TABLE `product_presentations` ADD COLUMN `cost_price` DECIMAL(12,4) NULL');
    }
    if (!(await queryRunner.hasColumn('products', 'box_cost_price'))) {
      await queryRunner.query('ALTER TABLE `products` ADD COLUMN `box_cost_price` DECIMAL(12,4) NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `product_presentations` DROP COLUMN `cost_price`');
    await queryRunner.query('ALTER TABLE `products` DROP COLUMN `box_cost_price`');
  }
}
