"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ExcelJS = __importStar(require("exceljs"));
const product_entity_1 = require("../entities/product.entity");
const inventory_movement_entity_1 = require("../entities/inventory-movement.entity");
const category_entity_1 = require("../entities/category.entity");
const supplier_entity_1 = require("../entities/supplier.entity");
const product_batch_entity_1 = require("../entities/product-batch.entity");
const VALID_SUNAT_UNITS = Object.values(product_entity_1.ProductUnit);
const VALID_TIP_AFE_IGV = Object.values(product_entity_1.TipAfeIgv);
let ProductService = class ProductService {
    constructor(productRepo, movementRepo, categoryRepo, supplierRepo, batchRepo) {
        this.productRepo = productRepo;
        this.movementRepo = movementRepo;
        this.categoryRepo = categoryRepo;
        this.supplierRepo = supplierRepo;
        this.batchRepo = batchRepo;
    }
    async findAll(filters = {}) {
        const { search, categoryId, supplierId, isActive, lowStock, page = 1, limit = 50 } = filters;
        const qb = this.productRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.category', 'c')
            .leftJoinAndSelect('p.supplier', 's');
        if (search) {
            qb.andWhere('(p.name LIKE :s OR p.barcode LIKE :s OR p.sku LIKE :s)', { s: `%${search}%` });
        }
        if (categoryId)
            qb.andWhere('p.categoryId = :categoryId', { categoryId });
        if (supplierId)
            qb.andWhere('p.supplierId = :supplierId', { supplierId });
        if (isActive !== undefined)
            qb.andWhere('p.isActive = :isActive', { isActive });
        if (lowStock)
            qb.andWhere('p.stockQuantity <= p.minStockLevel');
        const [data, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .orderBy('p.name', 'ASC')
            .getManyAndCount();
        return { data, total, page, limit };
    }
    async findById(id) {
        const product = await this.productRepo.findOne({
            where: { id },
            relations: { category: true, supplier: true },
        });
        if (!product)
            throw new common_1.NotFoundException(`Product #${id} not found`);
        return product;
    }
    async findByBarcode(barcode) {
        const product = await this.productRepo.findOne({
            where: { barcode, isActive: true },
            relations: { category: true },
        });
        if (!product)
            throw new common_1.NotFoundException(`Product with barcode "${barcode}" not found`);
        return product;
    }
    async create(dto) {
        if (dto.barcode) {
            const exists = await this.productRepo.findOne({ where: { barcode: dto.barcode } });
            if (exists)
                throw new common_1.ConflictException(`Barcode "${dto.barcode}" already registered`);
        }
        if (dto.sku) {
            const exists = await this.productRepo.findOne({ where: { sku: dto.sku } });
            if (exists)
                throw new common_1.ConflictException(`SKU "${dto.sku}" already registered`);
        }
        const product = this.productRepo.create(dto);
        const saved = await this.productRepo.save(product);
        if (Number(saved.stockQuantity) > 0) {
            await this.batchRepo.save(this.batchRepo.create({
                productId: saved.id,
                costPrice: saved.costPrice,
                initialQuantity: saved.stockQuantity,
                currentQuantity: saved.stockQuantity,
            }));
        }
        return saved;
    }
    async update(id, dto) {
        const product = await this.findById(id);
        Object.assign(product, dto);
        return this.productRepo.save(product);
    }
    async remove(id) {
        const product = await this.findById(id);
        product.isActive = false;
        await this.productRepo.save(product);
    }
    async adjustStock(id, dto, type, performedBy) {
        const product = await this.findById(id);
        if (type === inventory_movement_entity_1.MovementType.OUT && product.stockQuantity < dto.quantity) {
            throw new common_1.BadRequestException(`Insufficient stock. Available: ${product.stockQuantity}, requested: ${dto.quantity}`);
        }
        const delta = type === inventory_movement_entity_1.MovementType.IN ? dto.quantity : -dto.quantity;
        product.stockQuantity = Number(product.stockQuantity) + delta;
        if (type === inventory_movement_entity_1.MovementType.IN) {
            const costToUse = dto.costPrice !== undefined ? Number(dto.costPrice) : Number(product.costPrice);
            product.costPrice = costToUse;
            if (dto.supplierId)
                product.supplierId = dto.supplierId;
            await this.batchRepo.save(this.batchRepo.create({
                productId: id,
                supplierId: dto.supplierId || null,
                documentRef: dto.notes?.includes('Ref:') ? dto.notes : null,
                costPrice: costToUse,
                initialQuantity: dto.quantity,
                currentQuantity: dto.quantity,
                expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
            }));
        }
        else {
            let remainingToDeduct = dto.quantity;
            const batches = await this.batchRepo.find({
                where: { productId: id, isActive: true },
                order: { createdAt: 'ASC' },
            });
            for (const batch of batches) {
                if (remainingToDeduct <= 0)
                    break;
                const availableInBatch = Number(batch.currentQuantity);
                if (availableInBatch <= 0)
                    continue;
                if (availableInBatch <= remainingToDeduct) {
                    remainingToDeduct -= availableInBatch;
                    batch.currentQuantity = 0;
                    batch.isActive = false;
                }
                else {
                    batch.currentQuantity = availableInBatch - remainingToDeduct;
                    remainingToDeduct = 0;
                }
                await this.batchRepo.save(batch);
            }
        }
        await this.productRepo.save(product);
        await this.movementRepo.save(this.movementRepo.create({
            productId: id,
            movementType: type,
            quantity: dto.quantity,
            referenceType: inventory_movement_entity_1.MovementReferenceType.MANUAL,
            notes: dto.notes,
            performedBy,
        }));
        return product;
    }
    async getBatches(id) {
        return this.batchRepo.find({
            where: { productId: id, isActive: true },
            relations: { supplier: true },
            order: { createdAt: 'ASC' },
        });
    }
    async getLowStockProducts() {
        return this.productRepo
            .createQueryBuilder('p')
            .where('p.isActive = true')
            .andWhere('p.stockQuantity <= p.minStockLevel')
            .leftJoinAndSelect('p.category', 'c')
            .orderBy('p.stockQuantity', 'ASC')
            .getMany();
    }
    async generateExcelTemplate() {
        const wb = new ExcelJS.Workbook();
        wb.creator = 'DEVPRO';
        wb.created = new Date();
        const ws = wb.addWorksheet('PRODUCTOS', {
            properties: { tabColor: { argb: 'FF1677FF' } },
        });
        const hBase = {
            font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1677FF' } },
            alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
            border: { bottom: { style: 'medium', color: { argb: 'FF0050C8' } } },
        };
        const hReq = {
            ...hBase,
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } },
        };
        const hSunat = {
            ...hBase,
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006400' } },
        };
        const cols = [
            { key: 'name', header: 'NOMBRE DEL PRODUCTO *', width: 36, st: hReq },
            { key: 'barcode', header: 'CÓDIGO DE BARRAS', width: 20, st: hBase },
            { key: 'sku', header: 'SKU (CÓDIGO INTERNO) *', width: 18, st: hReq },
            { key: 'description', header: 'DESCRIPCIÓN', width: 36, st: hBase },
            { key: 'category', header: 'CATEGORÍA', width: 20, st: hBase },
            { key: 'supplier', header: 'PROVEEDOR', width: 22, st: hBase },
            { key: 'unit', header: 'UNIDAD SUNAT (CAT.3) *', width: 22, st: hSunat },
            { key: 'tipAfeIgv', header: 'AFECT. IGV (CAT.7) *', width: 22, st: hSunat },
            { key: 'taxRate', header: 'IGV % *', width: 12, st: hSunat },
            { key: 'costPrice', header: 'PRECIO COSTO (S/.) *', width: 18, st: hReq },
            { key: 'salePrice', header: 'PRECIO VENTA (S/.) *', width: 18, st: hReq },
            { key: 'stockQty', header: 'STOCK INICIAL', width: 14, st: hBase },
            { key: 'minStock', header: 'STOCK MÍNIMO', width: 14, st: hBase },
            { key: 'maxStock', header: 'STOCK MÁXIMO', width: 14, st: hBase },
        ];
        ws.columns = cols.map(c => ({ key: c.key, width: c.width }));
        const headerRow = ws.getRow(1);
        headerRow.height = 42;
        cols.forEach((col, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = col.header;
            Object.assign(cell.style, col.st);
        });
        const legendRow = ws.getRow(2);
        legendRow.height = 18;
        legendRow.getCell(1).value = '← ROJO: obligatorio   |   AZUL: opcional   |   VERDE: obligatorio SUNAT';
        legendRow.getCell(1).style = {
            font: { italic: true, size: 9, color: { argb: 'FF555555' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } },
        };
        const [categoriesList, suppliersList] = await Promise.all([
            this.categoryRepo.find(),
            this.supplierRepo.find(),
        ]);
        const catNames = categoriesList.map(c => c.name).filter(Boolean);
        const supNames = suppliersList.map(s => s.name).filter(Boolean);
        const wsRef = wb.addWorksheet('DATOS_LISTAS', { state: 'hidden' });
        const catRows = catNames.length > 0 ? catNames : ['(Sin Categorías)'];
        const supRows = supNames.length > 0 ? supNames : ['(Sin Proveedores)'];
        const unitRows = ['NIU - Unidad', 'KGM - Kilogramo', 'GRM - Gramo', 'LTR - Litro', 'MLT - Mililitro', 'MTR - Metro', 'CMT - Centímetro', 'MTK - Metro m2', 'MTQ - Metro m3', 'TNE - Tonelada', 'GLL - Galón', 'BX - Caja', 'DZN - Docena', 'PK - Paquete', 'BG - Bolsa', 'BO - Botella', 'CJ - Caja peq.', 'SA - Saco', 'SET - Juego/Set', 'ZZ - Servicio genérico', 'HUR - Hora', 'DAY - Día', 'MON - Mes'];
        const unitCodesOnly = ['NIU', 'KGM', 'GRM', 'LTR', 'MLT', 'MTR', 'CMT', 'MTK', 'MTQ', 'TNE', 'GLL', 'BX', 'DZN', 'PK', 'BG', 'BO', 'CJ', 'SA', 'SET', 'ZZ', 'HUR', 'DAY', 'MON'];
        const igvRows = ['10 - Gravado 18%', '11 - Gravado premio', '12 - Gravado donación', '13 - Gravado retiro', '14 - Gravado publicidad', '15 - Gravado bonif.', '16 - Gravado trab.', '17 - Gravado IVAP 4%', '20 - Exonerado 0%', '21 - Exonerado gratis', '30 - Inafecto 0%', '31 - Inafecto bonif.', '32 - Inafecto retiro', '33 - Inafecto muestras', '34 - Inafecto convenio', '35 - Inafecto premio', '36 - Inafecto pub.', '40 - Exportación 0%'];
        const igvCodesOnly = ['10', '11', '12', '13', '14', '15', '16', '17', '20', '21', '30', '31', '32', '33', '34', '35', '36', '40'];
        const maxR = Math.max(catRows.length, supRows.length, unitCodesOnly.length, igvCodesOnly.length);
        wsRef.addRow(['CATEGORIAS', 'PROVEEDORES', 'UNIDADES', 'IGV']);
        for (let i = 0; i < maxR; i++) {
            wsRef.addRow([
                catRows[i] || '',
                supRows[i] || '',
                unitCodesOnly[i] || '',
                igvCodesOnly[i] || '',
            ]);
        }
        for (let r = 3; r <= 500; r++) {
            if (catNames.length > 0) {
                ws.getCell(`E${r}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`DATOS_LISTAS!$A$2:$A$${catRows.length + 1}`],
                };
            }
            if (supNames.length > 0) {
                ws.getCell(`F${r}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`DATOS_LISTAS!$B$2:$B$${supRows.length + 1}`],
                };
            }
            ws.getCell(`G${r}`).dataValidation = {
                type: 'list',
                allowBlank: false,
                formulae: [`DATOS_LISTAS!$C$2:$C$${unitCodesOnly.length + 1}`],
            };
            ws.getCell(`H${r}`).dataValidation = {
                type: 'list',
                allowBlank: false,
                formulae: [`DATOS_LISTAS!$D$2:$D$${igvCodesOnly.length + 1}`],
            };
        }
        ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
        ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
        const ws3 = wb.addWorksheet('CAT3_UNIDADES', { properties: { tabColor: { argb: 'FF0066CC' } } });
        ws3.columns = [{ key: 'code', width: 12 }, { key: 'desc', width: 48 }, { key: 'grp', width: 14 }];
        const h3 = ws3.getRow(1);
        h3.height = 28;
        ['CÓDIGO (usar en plantilla)', 'DESCRIPCIÓN', 'GRUPO'].forEach((v, i) => {
            const c = h3.getCell(i + 1);
            c.value = v;
            c.style = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
        });
        [
            ['NIU', 'Unidad (pieza, unidad genérica) ← MÁS COMÚN', 'Bienes'],
            ['KGM', 'Kilogramo', 'Bienes'], ['GRM', 'Gramo', 'Bienes'],
            ['LTR', 'Litro', 'Bienes'], ['MLT', 'Mililitro', 'Bienes'],
            ['MTR', 'Metro lineal', 'Bienes'], ['CMT', 'Centímetro', 'Bienes'],
            ['MTK', 'Metro cuadrado', 'Bienes'], ['MTQ', 'Metro cúbico', 'Bienes'],
            ['TNE', 'Tonelada métrica', 'Bienes'], ['GLL', 'Galón', 'Bienes'],
            ['BX', 'Caja', 'Bienes'], ['DZN', 'Docena', 'Bienes'],
            ['PK', 'Paquete', 'Bienes'], ['BG', 'Bolsa', 'Bienes'],
            ['BO', 'Botella', 'Bienes'], ['CJ', 'Caja pequeña', 'Bienes'],
            ['SA', 'Saco', 'Bienes'], ['SET', 'Juego / Set', 'Bienes'],
            ['ZZ', 'Unidad de servicio genérico ← SERVICIOS', 'Servicios'],
            ['HUR', 'Hora de servicio', 'Servicios'],
            ['DAY', 'Día de servicio', 'Servicios'],
            ['MON', 'Mes de servicio', 'Servicios'],
        ].forEach((row, idx) => {
            const r = ws3.addRow(row);
            r.height = 19;
            r.getCell(1).font = { bold: true, color: { argb: 'FF0044AA' } };
            r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFF0F5FF' : 'FFFFFFFF' } };
        });
        const ws7 = wb.addWorksheet('CAT7_IGV', { properties: { tabColor: { argb: 'FF006400' } } });
        ws7.columns = [{ key: 'code', width: 12 }, { key: 'desc', width: 56 }, { key: 'tasa', width: 12 }];
        const h7 = ws7.getRow(1);
        h7.height = 28;
        ['CÓDIGO (usar en plantilla)', 'DESCRIPCIÓN', 'TASA IGV'].forEach((v, i) => {
            const c = h7.getCell(i + 1);
            c.value = v;
            c.style = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006400' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
        });
        [
            ['10', 'Gravado – Operación Onerosa ← MÁS COMÚN (productos normales)', '18%'],
            ['11', 'Gravado – Retiro por premio', '18%'],
            ['12', 'Gravado – Retiro por donación', '18%'],
            ['13', 'Gravado – Retiro', '18%'],
            ['14', 'Gravado – Retiro por publicidad', '18%'],
            ['15', 'Gravado – Bonificaciones', '18%'],
            ['16', 'Gravado – Retiro por entrega a trabajadores', '18%'],
            ['17', 'Gravado – IVAP (Arroz Pilado) ← tasa especial', '4%'],
            ['20', 'Exonerado – Operación Onerosa (Canasta básica)', '0%'],
            ['21', 'Exonerado – Transferencia Gratuita', '0%'],
            ['30', 'Inafecto – Operación Onerosa (Servicios no afectos)', '0%'],
            ['31', 'Inafecto – Retiro por Bonificación', '0%'],
            ['32', 'Inafecto – Retiro', '0%'],
            ['33', 'Inafecto – Retiro por Muestras Médicas', '0%'],
            ['34', 'Inafecto – Retiro por Convenio Colectivo', '0%'],
            ['35', 'Inafecto – Retiro por Premio', '0%'],
            ['36', 'Inafecto – Retiro por Publicidad', '0%'],
            ['40', 'Exportación de Bienes o Servicios', '0%'],
        ].forEach((row, idx) => {
            const r = ws7.addRow(row);
            r.height = 19;
            const code = parseInt(row[0], 10);
            const color = code <= 17 ? 'FFE8FFE8' : (code <= 27 ? 'FFE8F0FF' : (code <= 37 ? 'FFFFF0E0' : 'FFF0E8FF'));
            r.getCell(1).font = { bold: true };
            r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? color : 'FFFFFFFF' } };
        });
        const buf = await wb.xlsx.writeBuffer();
        return Buffer.from(buf);
    }
    async importFromExcel(fileBuffer) {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength));
        const ws = wb.getWorksheet('PRODUCTOS') || wb.worksheets[0];
        if (!ws)
            throw new common_1.BadRequestException('El archivo Excel no contiene la hoja "PRODUCTOS".');
        const categories = await this.categoryRepo.find();
        const suppliers = await this.supplierRepo.find();
        const catMap = new Map(categories.map(c => [c.name.toLowerCase().trim(), c.id]));
        const supMap = new Map(suppliers.map(s => [s.name.toLowerCase().trim(), s.id]));
        const results = [];
        let created = 0;
        let updated = 0;
        let startRow = 2;
        const possibleHeader = ws.getRow(2).getCell(1).value?.toString() || '';
        if (possibleHeader.includes('←') || possibleHeader.includes('ROJO') || possibleHeader.includes('leyenda')) {
            startRow = 3;
        }
        for (let rowIdx = startRow; rowIdx <= ws.rowCount; rowIdx++) {
            const row = ws.getRow(rowIdx);
            const cellStr = (col) => {
                const cell = row.getCell(col);
                if (!cell?.value)
                    return '';
                if (typeof cell.value === 'object' && 'richText' in cell.value) {
                    return cell.value.richText.map((r) => r.text).join('').trim();
                }
                return String(cell.value).trim();
            };
            const numCell = (col, def = 0) => {
                const v = cellStr(col);
                const n = parseFloat(v.replace(',', '.'));
                return isNaN(n) ? def : n;
            };
            const name = cellStr(1);
            const barcode = cellStr(2) || null;
            const sku = cellStr(3) || null;
            const description = cellStr(4) || null;
            const catName = cellStr(5);
            const supName = cellStr(6);
            const unit = cellStr(7).toUpperCase() || 'NIU';
            const tipAfeIgv = cellStr(8) || '10';
            const taxRate = numCell(9, 18);
            const costPrice = numCell(10, 0);
            const salePrice = numCell(11, 0);
            const stockQty = numCell(12, 0);
            const minStock = numCell(13, 0);
            const maxStockStr = cellStr(14);
            const maxStock = maxStockStr ? parseFloat(maxStockStr) : null;
            if (!name && !sku)
                continue;
            const skuLabel = sku || '(sin SKU)';
            try {
                if (!name)
                    throw new Error('El campo NOMBRE DEL PRODUCTO es obligatorio.');
                if (!sku)
                    throw new Error('El campo SKU es obligatorio (identifica el ítem en SUNAT).');
                if (!VALID_SUNAT_UNITS.includes(unit)) {
                    throw new Error(`Unidad "${unit}" inválida. Catálogo Nº 3 SUNAT. Válidos: ${VALID_SUNAT_UNITS.slice(0, 8).join(', ')}...`);
                }
                if (!VALID_TIP_AFE_IGV.includes(tipAfeIgv)) {
                    throw new Error(`Afectación IGV "${tipAfeIgv}" inválida. Catálogo Nº 7 SUNAT. Válidos: 10, 17, 20, 30, 40...`);
                }
                if (salePrice <= 0)
                    throw new Error('PRECIO DE VENTA debe ser mayor a 0.');
                const categoryId = catName ? (catMap.get(catName.toLowerCase()) ?? null) : null;
                const supplierId = supName ? (supMap.get(supName.toLowerCase()) ?? null) : null;
                const existing = await this.productRepo.findOne({ where: { sku } });
                if (existing) {
                    Object.assign(existing, {
                        name, description,
                        barcode: barcode || existing.barcode,
                        unit, tipAfeIgv, taxRate, costPrice, salePrice,
                        minStockLevel: minStock,
                        maxStockLevel: maxStock !== null ? maxStock : existing.maxStockLevel,
                        categoryId: categoryId ?? existing.categoryId,
                        supplierId: supplierId ?? existing.supplierId,
                        isActive: true,
                    });
                    await this.productRepo.save(existing);
                    updated++;
                    results.push({ row: rowIdx, sku, name, status: 'updated', message: 'Actualizado' });
                }
                else {
                    if (barcode) {
                        const bcExists = await this.productRepo.findOne({ where: { barcode } });
                        if (bcExists)
                            throw new Error(`Código de barras "${barcode}" ya está registrado en: ${bcExists.name}`);
                    }
                    const product = this.productRepo.create({
                        name, description, barcode, sku,
                        unit, tipAfeIgv, taxRate, costPrice, salePrice,
                        stockQuantity: stockQty, minStockLevel: minStock,
                        maxStockLevel: maxStock, categoryId, supplierId, isActive: true,
                    });
                    await this.productRepo.save(product);
                    created++;
                    results.push({ row: rowIdx, sku, name, status: 'created', message: 'Creado' });
                }
            }
            catch (err) {
                results.push({ row: rowIdx, sku: skuLabel, name: name || '(sin nombre)', status: 'error', message: err.message });
            }
        }
        return {
            total: results.length,
            created,
            updated,
            errors: results.filter(r => r.status === 'error').map(r => ({ row: r.row, sku: r.sku, message: r.message || '' })),
            results,
        };
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.ProductEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(inventory_movement_entity_1.InventoryMovementEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(category_entity_1.CategoryEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(supplier_entity_1.SupplierEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(product_batch_entity_1.ProductBatchEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProductService);
//# sourceMappingURL=product.service.js.map