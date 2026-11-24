/** Historial de acciones. Tabla aparte, sin llaves foráneas: el registro sobrevive a lo que describe. Idempotente. */
export async function ensureAuditSchema(conn: { query: (sql: string, p?: any[]) => Promise<any> }): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`audit_log\` (
      \`id\`         BIGINT       NOT NULL AUTO_INCREMENT,
      \`created_at\` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`user_id\`    INT          NULL,
      \`user_name\`  VARCHAR(150) NULL,
      \`route\`      VARCHAR(120) NOT NULL,
      \`action\`     VARCHAR(120) NOT NULL,
      \`target\`     VARCHAR(60)  NULL,
      \`ok\`         TINYINT(1)   NOT NULL DEFAULT 1,
      \`detail\`     TEXT         NULL,
      \`ip\`         VARCHAR(64)  NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_audit_created\` (\`created_at\`),
      INDEX \`IDX_audit_user\` (\`user_id\`, \`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
