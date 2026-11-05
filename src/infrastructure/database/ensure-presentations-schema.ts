import type { Connection } from 'mysql2/promise';

async function addColumnIfMissing(
  conn: Connection,
  table: string,
  column: string,
  definition: string,
): Promise<boolean> {
  const [rows] = await conn.query<any[]>(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  if (rows.length > 0) return false;

  try {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    return true;
  } catch (err: any) {
    // Otra instancia de la función pudo crearla al mismo tiempo
    if (err?.code === 'ER_DUP_FIELDNAME') return false;
    throw err;
  }
}

/**
 * Equivale a las migraciones AddVoidPinHash y AddProductPresentations.
 * En Vercel las migraciones no corren: la función no incluye esos archivos.
 */
export async function ensurePresentationsSchema(conn: Connection): Promise<void> {
  await addColumnIfMissing(conn, 'company_settings', 'void_pin_hash', 'VARCHAR(200) NULL');
  await addColumnIfMissing(conn, 'products', 'box_barcode', 'VARCHAR(50) NULL');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`product_presentations\` (
      \`id\`         INT           NOT NULL AUTO_INCREMENT,
      \`product_id\` INT           NOT NULL,
      \`name\`       VARCHAR(50)   NOT NULL,
      \`factor\`     DECIMAL(12,4) NOT NULL,
      \`sale_price\` DECIMAL(10,4) NOT NULL,
      \`barcode\`    VARCHAR(50)   NULL,
      \`sunat_unit\` VARCHAR(10)   NOT NULL DEFAULT 'NIU',
      \`created_at\` DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_presentations_product\` (\`product_id\`),
      INDEX \`IDX_presentations_barcode\` (\`barcode\`),
      CONSTRAINT \`FK_presentations_product\`
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await addColumnIfMissing(conn, 'sale_items', 'presentation_id', 'INT NULL');
  await addColumnIfMissing(conn, 'sale_items', 'presentation_name', 'VARCHAR(50) NULL');
  await addColumnIfMissing(conn, 'sale_items', 'sunat_unit', 'VARCHAR(10) NULL');
  const addedUnits = await addColumnIfMissing(conn, 'sale_items', 'units_deducted', 'DECIMAL(12,3) NULL');

  if (addedUnits) {
    // Ventas anteriores: una línea "Producto (Caja)" guardaba cajas, pero el stock salió en unidades
    await conn.query(`
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
}
