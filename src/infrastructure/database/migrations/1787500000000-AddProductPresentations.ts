import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddProductPresentations1787500000000 implements MigrationInterface {
  name = 'AddProductPresentations1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('product_presentations'))) {
      await queryRunner.createTable(
        new Table({
          name: 'product_presentations',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'product_id', type: 'int' },
            { name: 'name', type: 'varchar', length: '50' },
            { name: 'factor', type: 'decimal', precision: 12, scale: 4 },
            { name: 'sale_price', type: 'decimal', precision: 10, scale: 4 },
            {
              name: 'barcode',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'sunat_unit',
              type: 'varchar',
              length: '10',
              default: "'NIU'",
            },
            {
              name: 'created_at',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
            },
            {
              name: 'updated_at',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
              onUpdate: 'CURRENT_TIMESTAMP(6)',
            },
          ],
          indices: [
            new TableIndex({
              name: 'IDX_presentations_product',
              columnNames: ['product_id'],
            }),
            new TableIndex({
              name: 'IDX_presentations_barcode',
              columnNames: ['barcode'],
            }),
          ],
          foreignKeys: [
            new TableForeignKey({
              name: 'FK_presentations_product',
              columnNames: ['product_id'],
              referencedTableName: 'products',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            }),
          ],
        }),
      );
    }

    await this.addColumn(
      queryRunner,
      'products',
      new TableColumn({
        name: 'box_barcode',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );

    const saleItemColumns = [
      new TableColumn({
        name: 'presentation_id',
        type: 'int',
        isNullable: true,
      }),
      new TableColumn({
        name: 'presentation_name',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
      new TableColumn({
        name: 'sunat_unit',
        type: 'varchar',
        length: '10',
        isNullable: true,
      }),
      new TableColumn({
        name: 'units_deducted',
        type: 'decimal',
        precision: 12,
        scale: 3,
        isNullable: true,
      }),
    ];
    for (const column of saleItemColumns) {
      await this.addColumn(queryRunner, 'sale_items', column);
    }

    // Ventas anteriores: una línea "Producto (Caja)" guardaba cajas, pero el stock salió en unidades
    await queryRunner.query(`
      UPDATE \`sale_items\` si
      LEFT JOIN \`products\` p ON p.\`id\` = si.\`product_id\`
      SET si.\`units_deducted\` = CASE
        WHEN p.\`has_box_presentation\` = 1
          AND p.\`units_per_box\` > 0
          AND si.\`product_name\` LIKE CONCAT('% (', p.\`box_unit_name\`, ')')
        THEN si.\`quantity\` * p.\`units_per_box\`
        ELSE si.\`quantity\`
      END
      WHERE si.\`units_deducted\` IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of [
      'units_deducted',
      'sunat_unit',
      'presentation_name',
      'presentation_id',
    ]) {
      if (await queryRunner.hasColumn('sale_items', column)) {
        await queryRunner.dropColumn('sale_items', column);
      }
    }
    if (await queryRunner.hasColumn('products', 'box_barcode')) {
      await queryRunner.dropColumn('products', 'box_barcode');
    }
    await queryRunner.dropTable('product_presentations', true);
  }

  private async addColumn(
    queryRunner: QueryRunner,
    table: string,
    column: TableColumn,
  ) {
    if (!(await queryRunner.hasColumn(table, column.name))) {
      await queryRunner.addColumn(table, column);
    }
  }
}
