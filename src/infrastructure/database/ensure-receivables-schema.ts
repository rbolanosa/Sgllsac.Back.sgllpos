import type { Connection } from 'mysql2/promise';

/**
 * Cuentas por cobrar, comunicaciones de baja y la forma de pago "credit".
 * En Vercel las migraciones no corren: se crean al arrancar. Todo es idempotente.
 */
export async function ensureReceivablesSchema(conn: Pick<Connection, 'query'>): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`receivables\` (
      \`id\`              INT           NOT NULL AUTO_INCREMENT,
      \`sale_id\`         INT           NOT NULL,
      \`customer_id\`     INT           NOT NULL,
      \`document_number\` VARCHAR(30)   NOT NULL,
      \`total\`           DECIMAL(12,2) NOT NULL,
      \`paid\`            DECIMAL(12,2) NOT NULL DEFAULT 0,
      \`status\`          VARCHAR(12)   NOT NULL DEFAULT 'PENDIENTE',
      \`created_at\`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`UQ_receivables_sale\` (\`sale_id\`),
      INDEX \`IDX_receivables_customer\` (\`customer_id\`),
      INDEX \`IDX_receivables_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`receivable_installments\` (
      \`id\`            INT           NOT NULL AUTO_INCREMENT,
      \`receivable_id\` INT           NOT NULL,
      \`number\`        INT           NOT NULL,
      \`due_date\`      DATE          NOT NULL,
      \`amount\`        DECIMAL(12,2) NOT NULL,
      \`paid_amount\`   DECIMAL(12,2) NOT NULL DEFAULT 0,
      \`note\`          VARCHAR(120)  NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_installments_due\` (\`due_date\`),
      CONSTRAINT \`FK_installments_receivable\`
        FOREIGN KEY (\`receivable_id\`) REFERENCES \`receivables\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`receivable_payments\` (
      \`id\`            INT           NOT NULL AUTO_INCREMENT,
      \`receivable_id\` INT           NOT NULL,
      \`amount\`        DECIMAL(12,2) NOT NULL,
      \`method\`        VARCHAR(20)   NOT NULL,
      \`note\`          VARCHAR(300)  NULL,
      \`created_by\`    INT           NULL,
      \`created_at\`    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`FK_payments_receivable\`
        FOREIGN KEY (\`receivable_id\`) REFERENCES \`receivables\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`sunat_voids\` (
      \`id\`          INT          NOT NULL AUTO_INCREMENT,
      \`sale_id\`     INT          NOT NULL,
      \`apisunat_id\` INT          NULL,
      \`identifier\`  VARCHAR(40)  NULL,
      \`reason\`      VARCHAR(255) NOT NULL,
      \`status\`      VARCHAR(12)  NOT NULL DEFAULT 'PENDIENTE',
      \`message\`     TEXT         NULL,
      \`created_by\`  INT          NULL,
      \`created_at\`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_sunat_voids_sale\` (\`sale_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Forma de pago "credit": se agrega al final de la lista; los valores existentes no cambian
  const [rows] = await conn.query(
    `SELECT COLUMN_TYPE AS t, IS_NULLABLE AS n, COLUMN_DEFAULT AS d FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'payment_method'`,
  );
  const col = (rows as any[])[0];
  const type = String(col?.t || '');
  if (type.startsWith('enum(') && !type.includes("'credit'")) {
    const values = type.slice(5, -1);
    const nullable = col.n === 'YES' ? 'NULL' : 'NOT NULL';
    const def = col.d != null ? ` DEFAULT '${String(col.d).replace(/'/g, '')}'` : '';
    await conn.query(`ALTER TABLE \`sales\` MODIFY \`payment_method\` ENUM(${values},'credit') ${nullable}${def}`);
  }
}
