import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración: Lógica de Presentación en Caja (Box Presentation)
 *
 * Agrega soporte para productos que tienen dos niveles de presentación:
 * - Caja (presentación mayor, con N unidades dentro)
 * - Unidad individual (presentación menor)
 *
 * El stock SIEMPRE se almacena en unidades. La lógica de cajas es una capa
 * de conversión que usa `units_per_box` como factor de escala.
 *
 * Cambios en `products`:
 *   - has_box_presentation  → activa la lógica caja/unidad para el producto
 *   - units_per_box         → cuántas unidades hay en una caja
 *   - box_sale_price        → precio de venta por caja completa (independiente del precio unitario)
 *
 * Cambios en `purchase_order_items`:
 *   - purchase_unit  → enum: 'unit' | 'box'
 *   - boxes_ordered  → cajas pedidas (cuando purchase_unit = 'box')
 *   - box_cost       → costo por caja (cuando purchase_unit = 'box')
 */
export class AddBoxPresentation1785000000000 implements MigrationInterface {
  name = 'AddBoxPresentation1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── products table ────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE \`products\`
        ADD COLUMN \`has_box_presentation\` TINYINT(1) NOT NULL DEFAULT 0
          COMMENT 'Si es 1, el producto maneja presentación caja + unidad',
        ADD COLUMN \`units_per_box\` DECIMAL(10,3) NULL
          COMMENT 'Unidades que contiene una caja. Ej: 24 para Leche Gloria',
        ADD COLUMN \`box_sale_price\` DECIMAL(10,4) NULL
          COMMENT 'Precio de venta de una caja completa (independiente del precio unitario)'
    `);

    // ── purchase_order_items table ────────────────────────────────────────────
    // Primero agregar los campos nuevos
    await queryRunner.query(`
      ALTER TABLE \`purchase_order_items\`
        ADD COLUMN \`purchase_unit\` ENUM('unit','box') NOT NULL DEFAULT 'unit'
          COMMENT 'Indica si la compra fue por unidad o por caja',
        ADD COLUMN \`boxes_ordered\` DECIMAL(10,3) NULL
          COMMENT 'Cajas pedidas al proveedor (cuando purchase_unit = box)',
        ADD COLUMN \`box_cost\` DECIMAL(10,4) NULL
          COMMENT 'Costo por caja al momento de la compra (cuando purchase_unit = box)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`purchase_order_items\`
        DROP COLUMN \`box_cost\`,
        DROP COLUMN \`boxes_ordered\`,
        DROP COLUMN \`purchase_unit\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`products\`
        DROP COLUMN \`box_sale_price\`,
        DROP COLUMN \`units_per_box\`,
        DROP COLUMN \`has_box_presentation\`
    `);
  }
}
