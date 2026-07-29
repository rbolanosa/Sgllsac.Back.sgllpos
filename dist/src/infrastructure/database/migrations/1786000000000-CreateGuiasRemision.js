"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateGuiasRemision1786000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateGuiasRemision1786000000000 {
    constructor() {
        this.name = 'CreateGuiasRemision1786000000000';
    }
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'guias_remision',
            columns: [
                { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
                { name: 'serie', type: 'varchar', length: '10', default: "'T001'" },
                { name: 'correlativo', type: 'varchar', length: '15', isNullable: true },
                { name: 'numero_completo', type: 'varchar', length: '30', isNullable: true },
                { name: 'fecha_emision', type: 'date' },
                { name: 'fecha_traslado', type: 'date' },
                { name: 'dest_tipo_doc', type: 'varchar', length: '2' },
                { name: 'dest_num_doc', type: 'varchar', length: '20' },
                { name: 'dest_razon_social', type: 'varchar', length: '200' },
                { name: 'cod_traslado', type: 'varchar', length: '5' },
                { name: 'mod_traslado', type: 'varchar', length: '2' },
                { name: 'peso_total', type: 'decimal', precision: 10, scale: 3 },
                { name: 'und_peso_total', type: 'varchar', length: '5', default: "'KGM'" },
                { name: 'num_bultos', type: 'int', isNullable: true },
                { name: 'partida_ubigeo', type: 'varchar', length: '10' },
                { name: 'partida_direccion', type: 'varchar', length: '300' },
                { name: 'llegada_ubigeo', type: 'varchar', length: '10' },
                { name: 'llegada_direccion', type: 'varchar', length: '300' },
                { name: 'transportista_json', type: 'text', isNullable: true },
                { name: 'fecha_entrega_transportista', type: 'date', isNullable: true },
                { name: 'vehiculo_json', type: 'text', isNullable: true },
                { name: 'conductor_json', type: 'text', isNullable: true },
                { name: 'items_json', type: 'text' },
                { name: 'sunat_status', type: 'varchar', length: '30', default: "'PENDIENTE'" },
                { name: 'sunat_message', type: 'varchar', length: '500', isNullable: true },
                { name: 'xml_url', type: 'varchar', length: '500', isNullable: true },
                { name: 'pdf_url', type: 'varchar', length: '500', isNullable: true },
                { name: 'cdr_url', type: 'varchar', length: '500', isNullable: true },
                { name: 'apisunat_id', type: 'int', isNullable: true },
                { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
                { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
            ],
        }), true);
    }
    async down(queryRunner) {
        await queryRunner.dropTable('guias_remision', true);
    }
}
exports.CreateGuiasRemision1786000000000 = CreateGuiasRemision1786000000000;
//# sourceMappingURL=1786000000000-CreateGuiasRemision.js.map