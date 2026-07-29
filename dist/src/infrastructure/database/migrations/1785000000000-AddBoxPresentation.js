"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddBoxPresentation1785000000000 = void 0;
class AddBoxPresentation1785000000000 {
    constructor() {
        this.name = 'AddBoxPresentation1785000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`products\`
        ADD COLUMN \`has_box_presentation\` TINYINT(1) NOT NULL DEFAULT 0
          COMMENT 'Si es 1, el producto maneja presentación caja + unidad',
        ADD COLUMN \`units_per_box\` DECIMAL(10,3) NULL
          COMMENT 'Unidades que contiene una caja. Ej: 24 para Leche Gloria',
        ADD COLUMN \`box_sale_price\` DECIMAL(10,4) NULL
          COMMENT 'Precio de venta de una caja completa (independiente del precio unitario)',
        ADD COLUMN \`box_unit_name\` VARCHAR(50) NULL DEFAULT 'Caja'
          COMMENT 'Nombre del empaque mayorista: Caja, Paquete, Tira, Blíster, Saco, Fardo, Palet, etc.'
    `);
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
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`purchase_order_items\`
        DROP COLUMN \`box_cost\`,
        DROP COLUMN \`boxes_ordered\`,
        DROP COLUMN \`purchase_unit\`
    `);
        await queryRunner.query(`
      ALTER TABLE \`products\`
        DROP COLUMN \`box_unit_name\`,
        DROP COLUMN \`box_sale_price\`,
        DROP COLUMN \`units_per_box\`,
        DROP COLUMN \`has_box_presentation\`
    `);
    }
}
exports.AddBoxPresentation1785000000000 = AddBoxPresentation1785000000000;
//# sourceMappingURL=1785000000000-AddBoxPresentation.js.map