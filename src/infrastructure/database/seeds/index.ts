import { AppDataSource } from '../../config/typeorm.config';
import { ProductEntity } from '../../../domain/entities/product.entity';
import { SupplierEntity } from '../../../domain/entities/supplier.entity';

// Using 'as any' to bypass strict enum type in ts-node context
// Values match ProductUnit enum values exactly
const PRODUCTS = [
  // Beverages
  { barcode: '7401055501016', sku: 'BEV-001', name: 'Coca-Cola 600ml',           categoryId: 1, unit: 'piece', costPrice: 5.5,  salePrice: 8.0,  taxRate: 18, stockQuantity: 120, minStockLevel: 24 },
  { barcode: '7401055502013', sku: 'BEV-002', name: 'Pepsi 600ml',               categoryId: 1, unit: 'piece', costPrice: 5.0,  salePrice: 7.5,  taxRate: 18, stockQuantity: 80,  minStockLevel: 20 },
  { barcode: '7401055503010', sku: 'BEV-003', name: 'Agua Pura 1.5L',            categoryId: 1, unit: 'piece', costPrice: 3.0,  salePrice: 5.0,  taxRate: 18, stockQuantity: 200, minStockLevel: 48 },
  { barcode: '7401055504017', sku: 'BEV-004', name: 'Jugo Del Valle Mango 1L',   categoryId: 1, unit: 'piece', costPrice: 10.0, salePrice: 14.0, taxRate: 18, stockQuantity: 60,  minStockLevel: 12 },
  // Dairy
  { barcode: '7401055510019', sku: 'DAI-001', name: 'Leche Entera 1L Sula',      categoryId: 2, unit: 'piece', costPrice: 9.0,  salePrice: 12.0, taxRate: 18, stockQuantity: 80,  minStockLevel: 20 },
  { barcode: '7401055511016', sku: 'DAI-002', name: 'Queso Fresco 500g',          categoryId: 2, unit: 'piece', costPrice: 18.0, salePrice: 25.0, taxRate: 18, stockQuantity: 30,  minStockLevel: 10 },
  { barcode: '7401055512013', sku: 'DAI-003', name: 'Crema de Leche 250ml',       categoryId: 2, unit: 'piece', costPrice: 8.0,  salePrice: 11.0, taxRate: 18, stockQuantity: 40,  minStockLevel: 10 },
  { barcode: '7401055513010', sku: 'DAI-004', name: 'Yogurt Fresa 150g',          categoryId: 2, unit: 'piece', costPrice: 5.5,  salePrice: 8.0,  taxRate: 18, stockQuantity: 50,  minStockLevel: 12 },
  // Grains & Cereals
  { barcode: '7401055520018', sku: 'GRN-001', name: 'Arroz Blanqueado 1lb',       categoryId: 3, unit: 'piece', costPrice: 5.0,  salePrice: 7.0,  taxRate: 18, stockQuantity: 150, minStockLevel: 30 },
  { barcode: '7401055521015', sku: 'GRN-002', name: 'Frijol Negro 1lb',           categoryId: 3, unit: 'piece', costPrice: 6.0,  salePrice: 9.0,  taxRate: 18, stockQuantity: 120, minStockLevel: 24 },
  { barcode: '7401055522012', sku: 'GRN-003', name: 'Azúcar Blanca 2lb',          categoryId: 3, unit: 'piece', costPrice: 8.5,  salePrice: 11.0, taxRate: 18, stockQuantity: 100, minStockLevel: 20 },
  { barcode: '7401055523019', sku: 'GRN-004', name: 'Aceite Vegetal 1L',          categoryId: 3, unit: 'piece', costPrice: 18.0, salePrice: 23.0, taxRate: 18, stockQuantity: 60,  minStockLevel: 12 },
  { barcode: '7401055524016', sku: 'GRN-005', name: 'Sal Yodada 500g',            categoryId: 3, unit: 'piece', costPrice: 2.5,  salePrice: 4.0,  taxRate: 18, stockQuantity: 80,  minStockLevel: 20 },
  // Snacks
  { barcode: '7401055530017', sku: 'SNK-001', name: 'Tortrix Chile y Limón 100g', categoryId: 4, unit: 'piece', costPrice: 5.0,  salePrice: 7.5,  taxRate: 18, stockQuantity: 60,  minStockLevel: 15 },
  { barcode: '7401055531014', sku: 'SNK-002', name: 'Ruffles Original 45g',       categoryId: 4, unit: 'piece', costPrice: 5.5,  salePrice: 8.0,  taxRate: 18, stockQuantity: 50,  minStockLevel: 12 },
  { barcode: '7401055532011', sku: 'SNK-003', name: 'Galletas María 200g',         categoryId: 4, unit: 'piece', costPrice: 6.0,  salePrice: 9.0,  taxRate: 18, stockQuantity: 40,  minStockLevel: 10 },
  // Cleaning
  { barcode: '7401055540016', sku: 'CLN-001', name: 'Detergente Ariel 1kg',       categoryId: 5, unit: 'piece', costPrice: 22.0, salePrice: 28.0, taxRate: 18, stockQuantity: 40,  minStockLevel: 10 },
  { barcode: '7401055541013', sku: 'CLN-002', name: 'Cloro Blanqueador 1L',       categoryId: 5, unit: 'piece', costPrice: 8.0,  salePrice: 12.0, taxRate: 18, stockQuantity: 30,  minStockLevel: 8  },
  { barcode: '7401055542010', sku: 'CLN-003', name: 'Jabón Lavatrastes 500g',     categoryId: 5, unit: 'piece', costPrice: 6.0,  salePrice: 9.0,  taxRate: 18, stockQuantity: 50,  minStockLevel: 12 },
  // Personal Care
  { barcode: '7401055550015', sku: 'PRC-001', name: 'Shampoo H&S 400ml',          categoryId: 6, unit: 'piece', costPrice: 35.0, salePrice: 45.0, taxRate: 18, stockQuantity: 25,  minStockLevel: 6  },
  { barcode: '7401055551012', sku: 'PRC-002', name: 'Jabón Dove Barra 100g',      categoryId: 6, unit: 'piece', costPrice: 8.0,  salePrice: 12.0, taxRate: 18, stockQuantity: 60,  minStockLevel: 15 },
  { barcode: '7401055552019', sku: 'PRC-003', name: 'Pasta Dental Colgate 90g',   categoryId: 6, unit: 'piece', costPrice: 12.0, salePrice: 17.0, taxRate: 18, stockQuantity: 40,  minStockLevel: 10 },
  // Canned Goods
  { barcode: '7401055560014', sku: 'CAN-001', name: 'Frijoles Negros Lata 400g',  categoryId: 7, unit: 'piece', costPrice: 7.0,  salePrice: 10.0, taxRate: 18, stockQuantity: 60,  minStockLevel: 15 },
  { barcode: '7401055561011', sku: 'CAN-002', name: 'Atún en Agua 170g',          categoryId: 7, unit: 'piece', costPrice: 10.0, salePrice: 14.0, taxRate: 18, stockQuantity: 50,  minStockLevel: 12 },
  { barcode: '7401055562018', sku: 'CAN-003', name: 'Salsa Tomate Lata 400g',     categoryId: 7, unit: 'piece', costPrice: 6.5,  salePrice: 9.5,  taxRate: 18, stockQuantity: 40,  minStockLevel: 10 },
  // Bakery
  { barcode: '7401055570013', sku: 'BAK-001', name: 'Pan Molde Blanco Grande',    categoryId: 8, unit: 'piece', costPrice: 16.0, salePrice: 20.0, taxRate: 18, stockQuantity: 30,  minStockLevel: 10 },
  { barcode: '7401055571010', sku: 'BAK-002', name: 'Tortillas de Maíz x12',     categoryId: 8, unit: 'pack',  costPrice: 4.0,  salePrice: 6.0,  taxRate: 18, stockQuantity: 50,  minStockLevel: 15 },
  // Frozen
  { barcode: '7401055580012', sku: 'FRZ-001', name: 'Pollo Entero Congelado 2lb', categoryId: 9, unit: 'piece', costPrice: 45.0, salePrice: 58.0, taxRate: 18, stockQuantity: 20,  minStockLevel: 5  },
  // Tobacco & Matches
  { barcode: '7401055590011', sku: 'TOB-001', name: 'Cigarro Marlboro',           categoryId: 10, unit: 'piece', costPrice: 5.0, salePrice: 7.0,  taxRate: 18, stockQuantity: 200, minStockLevel: 50 },
  { barcode: '7401055591018', sku: 'TOB-002', name: 'Fósforos Caja x80',          categoryId: 10, unit: 'piece', costPrice: 1.0, salePrice: 2.0,  taxRate: 18, stockQuantity: 100, minStockLevel: 30 },
];

const SUPPLIERS = [
  { name: 'Distribuidora Coca-Cola FEMSA', contactName: 'Juan Monterroso', phone: '2333-4400', nit: '18392-0', email: 'ventas@femsa.com.gt' },
  { name: 'Distribuidora Nacional S.A.',   contactName: 'María López',     phone: '2234-5500', nit: '24561-8', email: 'pedidos@disnacional.gt' },
  { name: 'Importadora El Éxito',          contactName: 'Carlos Pérez',    phone: '2445-6600', nit: '33210-4', email: 'contacto@exito.gt' },
];

async function runSeeds() {
  console.log('🌱 Iniciando seeders del sistema de tienda...');
  try {
    await AppDataSource.initialize();
    console.log('✅ Conexión establecida');

    const productRepo  = AppDataSource.getRepository(ProductEntity);
    const supplierRepo = AppDataSource.getRepository(SupplierEntity);

    // ── Seed suppliers
    let seededSuppliers = 0;
    for (const s of SUPPLIERS) {
      const exists = await supplierRepo.findOne({ where: { nit: s.nit } });
      if (!exists) {
        await supplierRepo.save(supplierRepo.create(s as any));
        seededSuppliers++;
      }
    }
    console.log(`✅ Suppliers: ${seededSuppliers} nuevos creados`);

    // ── Seed products
    let seededProducts = 0;
    for (const p of PRODUCTS) {
      const exists = await productRepo.findOne({ where: { barcode: p.barcode } });
      if (!exists) {
        await productRepo.save(productRepo.create({ ...p, isActive: true } as any));
        seededProducts++;
      }
    }
    console.log(`✅ Products: ${seededProducts} nuevos creados`);
    console.log('🎉 Seed completado. El sistema está listo para usarse.');
  } catch (error) {
    console.error('❌ Error ejecutando seeders:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

runSeeds();
