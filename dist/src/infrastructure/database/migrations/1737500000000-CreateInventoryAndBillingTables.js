"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInventoryAndBillingTables1737500000000 = void 0;
class CreateInventoryAndBillingTables1737500000000 {
    constructor() {
        this.name = 'CreateInventoryAndBillingTables1737500000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE \`categories\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(100) NOT NULL,
        \`description\` TEXT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE \`suppliers\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(150) NOT NULL,
        \`contact_name\` VARCHAR(100) NULL,
        \`phone\` VARCHAR(20) NULL,
        \`email\` VARCHAR(100) NULL,
        \`address\` TEXT NULL,
        \`nit\` VARCHAR(20) NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE \`products\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`barcode\` VARCHAR(50) NULL,
        \`sku\` VARCHAR(50) NULL,
        \`name\` VARCHAR(200) NOT NULL,
        \`description\` TEXT NULL,
        \`category_id\` INT NULL,
        \`supplier_id\` INT NULL,
        \`unit\` ENUM('piece','kg','liter','box','dozen','pack') NOT NULL DEFAULT 'piece',
        \`cost_price\` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
        \`sale_price\` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
        \`tax_rate\` DECIMAL(5,2) NOT NULL DEFAULT 12.00,
        \`stock_quantity\` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
        \`min_stock_level\` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
        \`max_stock_level\` DECIMAL(10,3) NULL,
        \`image_url\` VARCHAR(500) NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_products_barcode\` (\`barcode\`),
        UNIQUE INDEX \`IDX_products_sku\` (\`sku\`),
        CONSTRAINT \`FK_products_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_products_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE \`inventory_movements\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`product_id\` INT NOT NULL,
        \`movement_type\` ENUM('in','out','adjustment','loss') NOT NULL,
        \`quantity\` DECIMAL(10,3) NOT NULL,
        \`reference_type\` ENUM('sale','purchase_order','manual','initial') NOT NULL,
        \`reference_id\` INT NULL,
        \`notes\` TEXT NULL,
        \`performed_by\` INT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_inventory_movements_product\` (\`product_id\`),
        CONSTRAINT \`FK_inventory_movements_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE \`customers\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(150) NOT NULL,
        \`nit\` VARCHAR(20) NOT NULL DEFAULT 'CF',
        \`phone\` VARCHAR(20) NULL,
        \`email\` VARCHAR(100) NULL,
        \`address\` TEXT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      INSERT INTO \`customers\` (\`name\`, \`nit\`) VALUES ('Consumidor Final', 'CF')
    `);
        await queryRunner.query(`
      CREATE TABLE \`sales\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`invoice_number\` VARCHAR(20) NOT NULL,
        \`customer_id\` INT NULL,
        \`cashier_id\` INT NULL,
        \`sale_date\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`subtotal\` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
        \`tax_amount\` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
        \`discount_amount\` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
        \`total_amount\` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
        \`payment_method\` ENUM('cash','card','transfer','mixed') NOT NULL DEFAULT 'cash',
        \`amount_tendered\` DECIMAL(12,4) NULL,
        \`change_given\` DECIMAL(12,4) NULL,
        \`status\` ENUM('completed','voided','refunded') NOT NULL DEFAULT 'completed',
        \`notes\` TEXT NULL,
        \`dte_number\` VARCHAR(100) NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_sales_invoice_number\` (\`invoice_number\`),
        CONSTRAINT \`FK_sales_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE \`sale_items\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`sale_id\` INT NOT NULL,
        \`product_id\` INT NULL,
        \`product_name\` VARCHAR(200) NOT NULL,
        \`quantity\` DECIMAL(10,3) NOT NULL,
        \`unit_price\` DECIMAL(10,4) NOT NULL,
        \`tax_rate\` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        \`discount\` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
        \`subtotal\` DECIMAL(12,4) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_sale_items_sale\` (\`sale_id\`),
        CONSTRAINT \`FK_sale_items_sale\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_sale_items_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE \`purchase_orders\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`order_number\` VARCHAR(20) NOT NULL,
        \`supplier_id\` INT NULL,
        \`ordered_by\` INT NULL,
        \`received_by\` INT NULL,
        \`order_date\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`received_date\` TIMESTAMP NULL,
        \`status\` ENUM('pending','received','partial','cancelled') NOT NULL DEFAULT 'pending',
        \`total_amount\` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
        \`notes\` TEXT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_purchase_orders_order_number\` (\`order_number\`),
        CONSTRAINT \`FK_purchase_orders_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE \`purchase_order_items\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`purchase_order_id\` INT NOT NULL,
        \`product_id\` INT NULL,
        \`quantity_ordered\` DECIMAL(10,3) NOT NULL,
        \`quantity_received\` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
        \`unit_cost\` DECIMAL(10,4) NOT NULL,
        \`subtotal\` DECIMAL(12,4) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_po_items_order\` (\`purchase_order_id\`),
        CONSTRAINT \`FK_po_items_order\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_po_items_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      INSERT INTO \`categories\` (\`name\`, \`description\`) VALUES
        ('Beverages', 'Soft drinks, juices, water'),
        ('Dairy', 'Milk, cheese, yogurt'),
        ('Grains & Cereals', 'Rice, beans, corn, wheat'),
        ('Snacks', 'Chips, crackers, candy'),
        ('Cleaning', 'Household cleaning products'),
        ('Personal Care', 'Hygiene and personal care items'),
        ('Canned Goods', 'Canned vegetables, fruits, meats'),
        ('Bakery', 'Bread, tortillas, pastries'),
        ('Frozen', 'Frozen meats and prepared foods'),
        ('Tobacco & Matches', 'Cigarettes, matches, lighters')
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`purchase_order_items\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`purchase_orders\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`sale_items\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`sales\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`customers\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`inventory_movements\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`products\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`suppliers\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`categories\``);
    }
}
exports.CreateInventoryAndBillingTables1737500000000 = CreateInventoryAndBillingTables1737500000000;
//# sourceMappingURL=1737500000000-CreateInventoryAndBillingTables.js.map