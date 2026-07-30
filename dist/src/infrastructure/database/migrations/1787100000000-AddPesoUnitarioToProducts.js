"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPesoUnitarioToProducts1787100000000 = void 0;
class AddPesoUnitarioToProducts1787100000000 {
    constructor() {
        this.name = 'AddPesoUnitarioToProducts1787100000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`products\`
      ADD COLUMN IF NOT EXISTS \`peso_unitario\`
        DECIMAL(10, 3) NULL DEFAULT NULL
        COMMENT 'Peso unitario en KG. Se usa en la Guía de Remisión.'
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`products\` DROP COLUMN IF EXISTS \`peso_unitario\`
    `);
    }
}
exports.AddPesoUnitarioToProducts1787100000000 = AddPesoUnitarioToProducts1787100000000;
//# sourceMappingURL=1787100000000-AddPesoUnitarioToProducts.js.map