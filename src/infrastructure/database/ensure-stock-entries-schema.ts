import type { Connection } from 'mysql2/promise';

/** Tablas del ingreso por factura. En Vercel las migraciones no corren: se crean al arrancar. */
export async function ensureStockEntriesSchema(conn: Pick<Connection, 'query'>): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`stock_entries\` (
      \`id\`                INT           NOT NULL AUTO_INCREMENT,
      \`supplier_id\`       INT           NULL,
      \`supplier_ruc\`      VARCHAR(11)   NOT NULL,
      \`supplier_name\`     VARCHAR(200)  NOT NULL,
      \`invoice_number\`    VARCHAR(30)   NOT NULL,
      \`invoice_date\`      DATE          NULL,
      \`total\`             DECIMAL(12,2) NOT NULL DEFAULT 0,
      \`purchase_order_id\` INT           NULL,
      \`lines_count\`       INT           NOT NULL DEFAULT 0,
      \`new_products\`      INT           NOT NULL DEFAULT 0,
      \`created_by\`        INT           NULL,
      \`created_at\`        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`UQ_stock_entries_invoice\` (\`supplier_ruc\`, \`invoice_number\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`supplier_product_maps\` (
      \`id\`           INT           NOT NULL AUTO_INCREMENT,
      \`supplier_ruc\` VARCHAR(11)   NOT NULL,
      \`match_key\`    VARCHAR(255)  NOT NULL,
      \`product_id\`   INT           NOT NULL,
      \`factor\`       DECIMAL(10,3) NOT NULL DEFAULT 1,
      \`updated_at\`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`UQ_supplier_product_maps_key\` (\`supplier_ruc\`, \`match_key\`),
      CONSTRAINT \`FK_supplier_product_maps_product\`
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
