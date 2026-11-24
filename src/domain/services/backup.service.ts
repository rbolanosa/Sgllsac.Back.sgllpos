import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as mysql from 'mysql2/promise';
import { gzipSync } from 'zlib';

/** Claves de servicios: no viajan en el archivo, se vuelven a escribir en Empresa tras restaurar */
export const OMITTED: Record<string, string[]> = {
  company_settings: ['clave_sol', 'sunat_api_key', 'sunat_api_secret', 'sunat_client_secret', 'certificado_password'],
};
const ROWS = 200;

/** Copia completa de la base en un solo instante, en SQL comprimido. Solo lee. */
@Injectable()
export class BackupService {
  constructor(private readonly ds: DataSource) {}

  async dump(): Promise<{ file: Buffer; tables: number; rows: number }> {
    const o: any = this.ds.options;
    const conn = await mysql.createConnection({
      host: o.host, port: o.port, user: o.username, password: o.password, database: o.database, ssl: o.ssl || undefined,
      connectTimeout: 10_000, charset: 'utf8mb4', dateStrings: true, supportBigNumbers: true, bigNumberStrings: true,
      // JSON como texto, tal cual está guardado
      typeCast: (field: any, next: any) => (field.type === 'JSON' ? field.string('utf8') : next()),
    });
    try {
      await conn.query("SET time_zone = '+00:00'");
      await conn.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await conn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
      const [list]: any = await conn.query("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
      const out: string[] = [
        `-- SGLLPOS: copia de seguridad ${new Date().toISOString()}\n`,
        "SET NAMES utf8mb4;\nSET time_zone = '+00:00';\nSET FOREIGN_KEY_CHECKS = 0;\nSET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n",
      ];
      let total = 0;
      for (const { t } of list) {
        const name = mysql.escapeId(t, true);
        const [[create]]: any = await conn.query(`SHOW CREATE TABLE ${name}`);
        const [cols]: any = await conn.query("SELECT COLUMN_NAME AS c, EXTRA AS e FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION", [t]);
        const names: string[] = cols.filter((c: any) => !/(VIRTUAL|STORED|PERSISTENT) ?GENERATED/i.test(c.e)).map((c: any) => c.c);
        out.push(`\nDROP TABLE IF EXISTS ${name};\n${create['Create Table']};\n`);
        const [rows]: any = await conn.query(`SELECT ${names.map((c) => mysql.escapeId(c, true)).join(',')} FROM ${name}`);
        const head = `INSERT INTO ${name} (${names.map((c) => mysql.escapeId(c, true)).join(',')}) VALUES\n`;
        for (let i = 0; i < rows.length; i += ROWS) {
          out.push(head, rows.slice(i, i + ROWS).map((r: any) =>
            `(${names.map((c) => (OMITTED[t]?.includes(c) ? 'NULL' : mysql.escape(r[c]))).join(',')})`).join(',\n'), ';\n');
        }
        total += rows.length;
      }
      out.push(`\nSET FOREIGN_KEY_CHECKS = 1;\n-- FIN: ${list.length} tablas, ${total} filas\n`);
      return { file: gzipSync(Buffer.from(out.join(''), 'utf8')), tables: list.length, rows: total };
    } finally {
      await conn.end().catch(() => undefined);
    }
  }
}
