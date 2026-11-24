import { SYSTEM_PROFILES } from '../../domain/constants/permissions';

/** Perfiles de acceso, en tablas aparte: si fallara, el inicio de sesión no se ve afectado. Idempotente. */
export async function ensureProfilesSchema(conn: { query: (sql: string, p?: any[]) => Promise<any> }): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`profiles\` (
      \`id\`          INT          NOT NULL AUTO_INCREMENT,
      \`system_key\`  VARCHAR(30)  NULL,
      \`name\`        VARCHAR(80)  NOT NULL,
      \`description\` VARCHAR(250) NULL,
      \`active\`      TINYINT(1)   NOT NULL DEFAULT 1,
      \`permissions\` LONGTEXT     NOT NULL,
      \`created_at\`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`UQ_profiles_key\` (\`system_key\`),
      UNIQUE INDEX \`UQ_profiles_name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`user_profiles\` (
      \`user_id\`    INT NOT NULL,
      \`profile_id\` INT NOT NULL,
      PRIMARY KEY (\`user_id\`),
      INDEX \`IDX_user_profiles_profile\` (\`profile_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  for (const [key, p] of Object.entries(SYSTEM_PROFILES)) {
    // Solo la primera vez: no pisa lo que el administrador cambió
    await conn.query('INSERT IGNORE INTO `profiles` (`system_key`,`name`,`description`,`permissions`) VALUES (?,?,?,?)',
      [key, p.name, p.description, JSON.stringify(p.permissions)]);
  }
}
