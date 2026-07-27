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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedDefaultUsers1784772075303 = void 0;
const bcrypt = __importStar(require("bcryptjs"));
class SeedDefaultUsers1784772075303 {
    constructor() {
        this.name = 'SeedDefaultUsers1784772075303';
    }
    async up(queryRunner) {
        const adminPassHash = await bcrypt.hash('admin123', 10);
        const cashierPassHash = await bcrypt.hash('cajero123', 10);
        const existingAdmin = await queryRunner.query(`SELECT id FROM \`users\` WHERE \`email\` = 'admin@sgll.com' LIMIT 1`);
        if (!existingAdmin || existingAdmin.length === 0) {
            await queryRunner.query(`INSERT INTO \`users\` (\`name\`, \`email\`, \`password\`, \`role\`, \`is_active\`)
         VALUES ('Administrador General', 'admin@sgll.com', '${adminPassHash}', 'admin', 1)`);
        }
        const existingCashier = await queryRunner.query(`SELECT id FROM \`users\` WHERE \`email\` = 'cajero@sgll.com' LIMIT 1`);
        if (!existingCashier || existingCashier.length === 0) {
            await queryRunner.query(`INSERT INTO \`users\` (\`name\`, \`email\`, \`password\`, \`role\`, \`is_active\`)
         VALUES ('Cajero Principal', 'cajero@sgll.com', '${cashierPassHash}', 'cashier', 1)`);
        }
    }
    async down(queryRunner) {
        await queryRunner.query(`DELETE FROM \`users\` WHERE \`email\` IN ('admin@sgll.com', 'cajero@sgll.com')`);
    }
}
exports.SeedDefaultUsers1784772075303 = SeedDefaultUsers1784772075303;
//# sourceMappingURL=1784772075303-SeedDefaultUsers.js.map