import type { Connection } from 'mysql2/promise';

/** Tabla de cotizaciones. En Vercel las migraciones no corren: se crea al arrancar. */
export async function ensureQuotesSchema(conn: Pick<Connection, 'query'>): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`quotes\` (
      \`id\`               INT           NOT NULL AUTO_INCREMENT,
      \`number\`           VARCHAR(20)   NULL,
      \`customer_id\`      INT           NULL,
      \`customer_name\`    VARCHAR(200)  NOT NULL,
      \`customer_doc\`     VARCHAR(20)   NULL,
      \`customer_phone\`   VARCHAR(20)   NULL,
      \`customer_address\` VARCHAR(300)  NULL,
      \`issue_date\`       DATE          NOT NULL,
      \`valid_until\`      DATE          NOT NULL,
      \`status\`           VARCHAR(12)   NOT NULL DEFAULT 'PENDIENTE',
      \`items_json\`       LONGTEXT      NOT NULL,
      \`discount\`         DECIMAL(12,2) NOT NULL DEFAULT 0,
      \`taxable\`          DECIMAL(12,2) NOT NULL DEFAULT 0,
      \`tax\`              DECIMAL(12,2) NOT NULL DEFAULT 0,
      \`total\`            DECIMAL(12,2) NOT NULL DEFAULT 0,
      \`notes\`            TEXT          NULL,
      \`public_token\`     VARCHAR(40)   NOT NULL,
      \`created_by\`       INT           NULL,
      \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`UQ_quotes_public_token\` (\`public_token\`),
      INDEX \`IDX_quotes_issue_date\` (\`issue_date\`),
      INDEX \`IDX_quotes_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'sale_ref'`,
  );
  if (!(rows as any[]).length) {
    try {
      await conn.query('ALTER TABLE `quotes` ADD COLUMN `sale_ref` VARCHAR(30) NULL');
    } catch (err: any) {
      if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }
}
