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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const form_data_1 = __importDefault(require("form-data"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const company_settings_entity_1 = require("../entities/company-settings.entity");
const SINGLETON_ID = 1;
let CompanySettingsService = class CompanySettingsService {
    constructor(repo, httpService) {
        this.repo = repo;
        this.httpService = httpService;
    }
    async get() {
        let settings = await this.repo.findOne({ where: { id: SINGLETON_ID } });
        if (!settings) {
            settings = this.repo.create({ id: SINGLETON_ID });
            await this.repo.save(settings);
        }
        return settings;
    }
    async syncFromApisunat(apiKey, apiSecret, apiUrl) {
        const settings = await this.get();
        const key = apiKey || settings.sunatApiKey;
        const secret = apiSecret || settings.sunatApiSecret;
        const url = (apiUrl || settings.sunatApiUrl || '').replace(/\/$/, '');
        if (!key || !secret || !url)
            return false;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${url}/empresa`, {
                headers: { 'X-Api-Key': key, 'X-Api-Secret': secret },
                timeout: 10_000,
            }));
            const emp = res.data?.datos || res.data;
            if (emp) {
                await this.repo.update(SINGLETON_ID, {
                    ruc: emp.ruc || settings.ruc,
                    razonSocial: emp.razon_social || settings.razonSocial,
                    nombreComercial: emp.nombre_comercial || settings.nombreComercial,
                    direccion: emp.direccion || settings.direccion,
                    ubigeo: emp.ubigeo || settings.ubigeo,
                    departamento: emp.departamento || settings.departamento,
                    provincia: emp.provincia || settings.provincia,
                    distrito: emp.distrito || settings.distrito,
                    logoUrl: emp.logo_url ? (emp.logo_url.startsWith('http') ? emp.logo_url : `${new URL(url).origin}${emp.logo_url}`) : settings.logoUrl,
                    regimenTributario: emp.tax_regime || settings.regimenTributario,
                    productionMode: emp.entorno === 'production',
                });
                return true;
            }
        }
        catch (err) {
            console.warn('No se pudo auto-sincronizar datos desde APISUNAT:', err?.message);
        }
        return false;
    }
    async getEmpresaLogoUrl() {
        const settings = await this.get();
        if (!settings.sunatApiKey || !settings.sunatApiSecret || !settings.sunatApiUrl)
            return null;
        try {
            const targetUrl = settings.sunatApiUrl.replace(/\/$/, '');
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${targetUrl}/empresa`, {
                headers: {
                    'X-Api-Key': settings.sunatApiKey,
                    'X-Api-Secret': settings.sunatApiSecret,
                },
                timeout: 8_000,
            }));
            const remoteLogoPath = response.data?.datos?.logo_url;
            if (remoteLogoPath) {
                const baseHost = new URL(targetUrl).origin;
                const publicLogoUrl = remoteLogoPath.startsWith('http')
                    ? remoteLogoPath
                    : `${baseHost}${remoteLogoPath}`;
                await this.repo.update(SINGLETON_ID, { logoUrl: publicLogoUrl });
                return publicLogoUrl;
            }
        }
        catch (err) {
            console.warn('No se pudo obtener logo_url de Railway:', err?.message);
        }
        return null;
    }
    async update(dto) {
        const current = await this.get();
        await this.repo.update(SINGLETON_ID, {
            ...dto,
        });
        const updated = await this.get();
        if (updated.sunatApiKey && updated.sunatApiSecret && updated.sunatApiUrl) {
            try {
                await this.syncFromApisunat(updated.sunatApiKey, updated.sunatApiSecret, updated.sunatApiUrl);
                const targetUrl = updated.sunatApiUrl.replace(/\/$/, '');
                const payload = {};
                if (dto.ruc)
                    payload.ruc = dto.ruc;
                if (dto.razonSocial)
                    payload.razon_social = dto.razonSocial;
                if (dto.nombreComercial !== undefined)
                    payload.nombre_comercial = dto.nombreComercial;
                if (dto.direccion)
                    payload.direccion = dto.direccion;
                if (dto.ubigeo)
                    payload.ubigeo = dto.ubigeo;
                if (dto.departamento)
                    payload.departamento = dto.departamento;
                if (dto.provincia)
                    payload.provincia = dto.provincia;
                if (dto.distrito)
                    payload.distrito = dto.distrito;
                if (dto.telefono)
                    payload.telefonos = [dto.telefono];
                if (dto.email)
                    payload.emails = [dto.email];
                if (dto.regimenTributario)
                    payload.tax_regime = dto.regimenTributario;
                if (dto.productionMode !== undefined)
                    payload.entorno = dto.productionMode ? 'production' : 'beta';
                if (Object.keys(payload).length > 0) {
                    await (0, rxjs_1.firstValueFrom)(this.httpService.put(`${targetUrl}/empresa`, payload, {
                        headers: {
                            'X-Api-Key': updated.sunatApiKey,
                            'X-Api-Secret': updated.sunatApiSecret,
                            'Content-Type': 'application/json',
                        },
                        timeout: 10_000,
                    }));
                }
            }
            catch (err) {
                console.warn('Advertencia: No se pudo sincronizar actualización con APISUNAT:', err?.message);
            }
        }
        return updated;
    }
    async registerSunatApi(certFile, certPassword) {
        const settings = await this.get();
        if (!settings.ruc || settings.ruc.length !== 11) {
            throw new common_1.BadRequestException('Debe registrar un RUC válido de 11 dígitos antes de continuar.');
        }
        if (!settings.razonSocial) {
            throw new common_1.BadRequestException('La Razón Social de la empresa es obligatoria.');
        }
        if (!settings.usuarioSol || !settings.claveSol) {
            throw new common_1.BadRequestException('Debe ingresar su Usuario SOL y Clave SOL de SUNAT.');
        }
        if (!certFile) {
            throw new common_1.BadRequestException('Debe adjuntar el archivo del certificado digital (.pfx / .p12 / .pem).');
        }
        const form = new form_data_1.default();
        form.append('ruc', settings.ruc);
        form.append('razon_social', settings.razonSocial);
        if (settings.nombreComercial)
            form.append('nombre_comercial', settings.nombreComercial);
        form.append('direccion', settings.direccion || 'LIMA - PERU');
        form.append('ubigeo', settings.ubigeo || '150101');
        if (settings.departamento)
            form.append('departamento', settings.departamento);
        if (settings.provincia)
            form.append('provincia', settings.provincia);
        if (settings.distrito)
            form.append('distrito', settings.distrito);
        form.append('sol_user', settings.usuarioSol);
        form.append('sol_pass', settings.claveSol);
        form.append('entorno', settings.productionMode ? 'production' : 'beta');
        form.append('plan', 'pro');
        const activeCertPath = this.normalizeCertificatePath(certFile.path, certPassword);
        form.append('certificado', fs.createReadStream(activeCertPath), {
            filename: certFile.originalname,
            contentType: certFile.mimetype,
        });
        if (certPassword) {
            form.append('contrasena_certificado', certPassword);
        }
        const targetUrl = (settings.sunatApiUrl || 'http://localhost:8000/api/v1').replace(/\/$/, '');
        const registerEndpoint = `${targetUrl}/registro`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(registerEndpoint, form, {
                headers: {
                    ...form.getHeaders(),
                },
                timeout: 20_000,
            }));
            const resData = response.data;
            const apiKey = resData?.datos?.api_key || resData?.api_key;
            const apiSecret = resData?.datos?.api_secret || resData?.api_secret;
            if (!apiKey || !apiSecret) {
                throw new common_1.BadRequestException(resData?.mensaje || 'APISUNAT no devolvió las credenciales api_key y api_secret esperadas.');
            }
            if (activeCertPath !== certFile.path && fs.existsSync(activeCertPath)) {
                try {
                    fs.copyFileSync(activeCertPath, certFile.path);
                    fs.unlinkSync(activeCertPath);
                }
                catch { }
            }
            const certUrl = `/uploads/certificates/${certFile.filename}`;
            await this.repo.update(SINGLETON_ID, {
                sunatApiKey: apiKey,
                sunatApiSecret: apiSecret,
                certificadoUrl: certUrl,
                certificadoPassword: certPassword || null,
            });
            try {
                await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${targetUrl}/series/init-defaults`, {}, {
                    headers: {
                        'X-Api-Key': apiKey,
                        'X-Api-Secret': apiSecret,
                    },
                    timeout: 10_000,
                }));
            }
            catch (err) {
                console.warn('Advertencia: No se pudieron auto-inicializar las series en APISUNAT:', err?.message);
            }
            return {
                message: resData?.mensaje || 'Empresa registrada exitosamente en APISUNAT',
                apiKey,
                apiSecret,
            };
        }
        catch (err) {
            if (activeCertPath !== certFile.path && fs.existsSync(activeCertPath)) {
                try {
                    fs.unlinkSync(activeCertPath);
                }
                catch { }
            }
            const errMsg = err?.response?.data?.mensaje || err?.response?.data?.message || err.message;
            throw new common_1.BadRequestException(`Error al registrar en APISUNAT: ${errMsg}`);
        }
    }
    async syncLogoToApisunat(logoFile) {
        const settings = await this.get();
        if (!settings.sunatApiKey || !settings.sunatApiSecret || !settings.sunatApiUrl)
            return;
        try {
            const form = new form_data_1.default();
            form.append('logo', fs.createReadStream(logoFile.path), {
                filename: logoFile.originalname,
                contentType: logoFile.mimetype,
            });
            const targetUrl = settings.sunatApiUrl.replace(/\/$/, '');
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${targetUrl}/empresa/logo`, form, {
                headers: {
                    ...form.getHeaders(),
                    'X-Api-Key': settings.sunatApiKey,
                    'X-Api-Secret': settings.sunatApiSecret,
                },
                timeout: 15_000,
            }));
            const remoteLogoPath = response.data?.datos?.logo_url || response.data?.logo_url;
            if (remoteLogoPath) {
                const baseHost = new URL(targetUrl).origin;
                const publicLogoUrl = remoteLogoPath.startsWith('http')
                    ? remoteLogoPath
                    : `${baseHost}${remoteLogoPath}`;
                await this.repo.update(1, { logoUrl: publicLogoUrl });
            }
        }
        catch (err) {
            console.warn('Advertencia: No se pudo subir el logo a APISUNAT:', err?.message);
        }
    }
    async syncLogoBufferToApisunat(file) {
        const settings = await this.get();
        if (!settings.sunatApiKey || !settings.sunatApiSecret || !settings.sunatApiUrl)
            return null;
        try {
            const form = new form_data_1.default();
            form.append('logo', file.buffer, {
                filename: file.originalname || `logo${file.mimetype?.includes('png') ? '.png' : '.jpg'}`,
                contentType: file.mimetype,
                knownLength: file.buffer.length,
            });
            const targetUrl = settings.sunatApiUrl.replace(/\/$/, '');
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${targetUrl}/empresa/logo`, form, {
                headers: {
                    ...form.getHeaders(),
                    'X-Api-Key': settings.sunatApiKey,
                    'X-Api-Secret': settings.sunatApiSecret,
                },
                timeout: 15_000,
            }));
            const remoteLogoPath = response.data?.datos?.logo_url || response.data?.logo_url;
            if (remoteLogoPath) {
                const baseHost = new URL(targetUrl).origin;
                return remoteLogoPath.startsWith('http')
                    ? remoteLogoPath
                    : `${baseHost}${remoteLogoPath}`;
            }
        }
        catch (err) {
            console.warn('Error al subir logo buffer a APISUNAT:', err?.message);
        }
        return null;
    }
    normalizeCertificatePath(filePath, password) {
        if (!password || !fs.existsSync(filePath))
            return filePath;
        const tempPem = `${filePath}.pem`;
        const modernPfx = `${filePath}_modern.pfx`;
        try {
            (0, child_process_1.execSync)(`openssl pkcs12 -in "${filePath}" -legacy -passin pass:"${password}" -nodes -out "${tempPem}"`, {
                stdio: 'ignore',
            });
            (0, child_process_1.execSync)(`openssl pkcs12 -export -in "${tempPem}" -out "${modernPfx}" -passout pass:"${password}"`, {
                stdio: 'ignore',
            });
            if (fs.existsSync(tempPem))
                fs.unlinkSync(tempPem);
            if (fs.existsSync(modernPfx))
                return modernPfx;
        }
        catch {
            if (fs.existsSync(tempPem)) {
                try {
                    fs.unlinkSync(tempPem);
                }
                catch { }
            }
        }
        return filePath;
    }
    async nextInvoiceNumber(type, manager) {
        const mgr = manager || this.repo;
        const settings = manager
            ? await manager.findOne(company_settings_entity_1.CompanySettingsEntity, { where: { id: SINGLETON_ID } })
            : await this.get();
        let serie = settings?.serieBoleta || 'B001';
        let nextCorrelativo = (settings?.correlativoBoleta || 0) + 1;
        let fieldToIncrement = 'correlativo_boleta';
        if (type === 'factura') {
            serie = settings?.serieFactura || 'F001';
            nextCorrelativo = (settings?.correlativoFactura || 0) + 1;
            fieldToIncrement = 'correlativo_factura';
        }
        else if (type === 'nota_venta') {
            serie = settings?.serieNotaVenta || 'NV01';
            nextCorrelativo = (settings?.correlativoNotaVenta || 0) + 1;
            fieldToIncrement = 'correlativo_nota_venta';
        }
        const invoiceNumber = `${serie}-${String(nextCorrelativo).padStart(8, '0')}`;
        if (manager) {
            await manager.query(`UPDATE company_settings SET ${fieldToIncrement} = ${fieldToIncrement} + 1 WHERE id = ?`, [SINGLETON_ID]);
        }
        else {
            await this.repo.increment({ id: SINGLETON_ID }, fieldToIncrement === 'correlativo_boleta' ? 'correlativoBoleta' : fieldToIncrement === 'correlativo_factura' ? 'correlativoFactura' : 'correlativoNotaVenta', 1);
        }
        return invoiceNumber;
    }
};
exports.CompanySettingsService = CompanySettingsService;
exports.CompanySettingsService = CompanySettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_settings_entity_1.CompanySettingsEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        axios_1.HttpService])
], CompanySettingsService);
//# sourceMappingURL=company-settings.service.js.map