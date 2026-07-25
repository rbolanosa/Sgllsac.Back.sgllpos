"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstablishmentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const company_settings_entity_1 = require("../entities/company-settings.entity");
const establishment_entity_1 = require("../entities/establishment.entity");
const establishment_series_entity_1 = require("../entities/establishment-series.entity");
const facturacion_adapter_1 = require("../../infrastructure/adapters/facturacion.adapter");
let EstablishmentsService = class EstablishmentsService {
    constructor(settingsRepo, estRepo, seriesRepo, facturacionAdapter) {
        this.settingsRepo = settingsRepo;
        this.estRepo = estRepo;
        this.seriesRepo = seriesRepo;
        this.facturacionAdapter = facturacionAdapter;
    }
    async findAll() {
        try {
            const res = await this.facturacionAdapter.get('/sucursales').catch(() => null);
            const apiList = Array.isArray(res?.datos) ? res.datos : Array.isArray(res) ? res : [];
            if (apiList.length > 0) {
                for (const item of apiList) {
                    let est = await this.estRepo.findOne({ where: { codLocal: item.cod_local || item.codLocal } });
                    if (!est) {
                        est = this.estRepo.create({
                            companySettingsId: 1,
                            nombre: item.nombre,
                            codLocal: item.cod_local || item.codLocal || '0000',
                            direccion: item.direccion || '',
                            ubigeo: item.ubigeo || '060101',
                            telefono: item.telefono || null,
                            email: item.email || null,
                            esPrincipal: !!item.es_principal,
                        });
                        await this.estRepo.save(est);
                    }
                }
            }
            const localEsts = await this.estRepo.find({
                where: { companySettingsId: 1, activo: true },
                relations: { series: true },
                order: { esPrincipal: 'DESC', codLocal: 'ASC' },
            });
            if (localEsts.length > 0) {
                return localEsts.map(e => ({
                    id: e.id,
                    nombre: e.nombre,
                    cod_local: e.codLocal,
                    direccion: e.direccion,
                    ubigeo: e.ubigeo,
                    departamento: e.departamento,
                    provincia: e.provincia,
                    distrito: e.distrito,
                    telefono: e.telefono,
                    email: e.email,
                    es_principal: e.esPrincipal,
                    activo: e.activo,
                    series: e.series,
                }));
            }
            return apiList;
        }
        catch (err) {
            console.warn('Advertencia al listar sucursales:', err.message);
            return this.estRepo.find({ where: { companySettingsId: 1, activo: true }, relations: { series: true } });
        }
    }
    async create(dto) {
        if (!dto.nombre || !dto.cod_local || !dto.direccion || !dto.ubigeo) {
            throw new common_1.BadRequestException('Campos obligatorios: nombre, cod_local, direccion, ubigeo.');
        }
        const codLocalClean = dto.cod_local.trim().padStart(4, '0');
        const existing = await this.estRepo.findOne({
            where: { companySettingsId: 1, codLocal: codLocalClean, activo: true },
        });
        if (existing) {
            throw new common_1.BadRequestException(`El Código de Local '${codLocalClean}' ya se encuentra registrado por el establecimiento '${existing.nombre}'. Cada establecimiento debe tener un código de local único (ej: 0001, 0002).`);
        }
        if (dto.es_principal) {
            await this.estRepo.update({ companySettingsId: 1 }, { esPrincipal: false });
        }
        const newEst = this.estRepo.create({
            companySettingsId: 1,
            nombre: dto.nombre.trim(),
            codLocal: codLocalClean,
            direccion: dto.direccion.trim(),
            ubigeo: dto.ubigeo.trim(),
            departamento: dto.departamento || null,
            provincia: dto.provincia || null,
            distrito: dto.distrito || null,
            telefono: dto.telefono || null,
            email: dto.email || null,
            esPrincipal: dto.es_principal ?? false,
            activo: true,
        });
        const savedLocal = await this.estRepo.save(newEst);
        try {
            const apiRes = await this.facturacionAdapter.post('/sucursales', {
                nombre: dto.nombre,
                cod_local: dto.cod_local,
                direccion: dto.direccion,
                ubigeo: dto.ubigeo,
                es_principal: dto.es_principal ?? false,
                telefono: dto.telefono || undefined,
                email: dto.email || undefined,
            });
            return { ...savedLocal, apiData: apiRes?.datos || apiRes };
        }
        catch (err) {
            const errMsg = err?.response?.data?.mensaje || err?.response?.data?.message || err.message;
            console.warn('Sucursal guardada localmente pero hubo advertencia APISUNAT:', errMsg);
            return savedLocal;
        }
    }
    async saveSeriesBatch(dto) {
        if (!dto.series || !Array.isArray(dto.series) || dto.series.length === 0) {
            throw new common_1.BadRequestException('Se requiere una lista de series a registrar.');
        }
        const sucursalId = Number(dto.sucursal_id);
        for (const item of dto.series) {
            if (!item.tipo || !item.serie) {
                throw new common_1.BadRequestException('Cada elemento de serie debe tener tipo y serie.');
            }
            const serieUpper = item.serie.trim().toUpperCase();
            const tipo = item.tipo.toLowerCase();
            if (tipo === 'factura' && !/^F[A-Z0-9]{3}$/.test(serieUpper)) {
                throw new common_1.BadRequestException(`Serie de Factura inválida: '${item.serie}'. Debe iniciar con F (Ej: F001).`);
            }
            if (tipo === 'boleta' && !/^B[A-Z0-9]{3}$/.test(serieUpper)) {
                throw new common_1.BadRequestException(`Serie de Boleta inválida: '${item.serie}'. Debe iniciar con B (Ej: B001).`);
            }
            if (tipo === 'guia_remision' && !/^T[A-Z0-9]{3}$/.test(serieUpper)) {
                throw new common_1.BadRequestException(`Serie de Guía Remisión inválida: '${item.serie}'. Debe iniciar con T (Ej: T001).`);
            }
            if (tipo === 'guia_transportista' && !/^V[A-Z0-9]{3}$/.test(serieUpper)) {
                throw new common_1.BadRequestException(`Serie de Guía Transportista inválida: '${item.serie}'. Debe iniciar con V (Ej: V001).`);
            }
            if (tipo === 'retencion' && !/^R[A-Z0-9]{3}$/.test(serieUpper)) {
                throw new common_1.BadRequestException(`Serie de Retención inválida: '${item.serie}'. Debe iniciar con R (Ej: R001).`);
            }
            if (tipo === 'percepcion' && !/^P[A-Z0-9]{3}$/.test(serieUpper)) {
                throw new common_1.BadRequestException(`Serie de Percepción inválida: '${item.serie}'. Debe iniciar con P (Ej: P001).`);
            }
        }
        for (const item of dto.series) {
            const serieUpper = item.serie.trim().toUpperCase();
            let existingSeries = await this.seriesRepo.findOne({
                where: [
                    { establishmentId: sucursalId, tipo: item.tipo },
                    { serie: serieUpper },
                ],
            });
            if (existingSeries) {
                existingSeries.establishmentId = sucursalId;
                existingSeries.tipo = item.tipo;
                existingSeries.serie = serieUpper;
                existingSeries.correlativoInicial = item.correlativo_inicial || 1;
                await this.seriesRepo.save(existingSeries);
            }
            else {
                const newSeries = this.seriesRepo.create({
                    establishmentId: sucursalId,
                    tipo: item.tipo,
                    serie: serieUpper,
                    correlativoInicial: item.correlativo_inicial || 1,
                    correlativoActual: item.correlativo_inicial || 1,
                });
                await this.seriesRepo.save(newSeries);
            }
        }
        try {
            let apiSucursalId = sucursalId;
            const sucsRes = await this.facturacionAdapter.get('/sucursales').catch(() => null);
            const apiSucs = Array.isArray(sucsRes?.datos) ? sucsRes.datos : Array.isArray(sucsRes) ? sucsRes : [];
            const estLocal = await this.estRepo.findOne({ where: { id: sucursalId } });
            if (estLocal && apiSucs.length > 0) {
                const match = apiSucs.find((s) => s.cod_local === estLocal.codLocal || s.nombre === estLocal.nombre);
                if (match?.id)
                    apiSucursalId = match.id;
            }
            const payload = {
                series: dto.series.map(s => ({
                    tipo: s.tipo,
                    serie: s.serie.trim().toUpperCase(),
                    sucursal_id: apiSucursalId,
                    correlativo_inicial: s.correlativo_inicial || 1,
                })),
            };
            const apiRes = await this.facturacionAdapter.post('/series', payload);
            return {
                message: 'Series registradas y guardadas exitosamente tanto en DEVPRO como en APISUNAT.',
                total_series: dto.series.length,
                apiData: apiRes?.datos || apiRes,
            };
        }
        catch (err) {
            const errMsg = err?.response?.data?.mensaje || err.message;
            console.warn('Series guardadas localmente en DEVPRO, advertencia sync APISUNAT:', errMsg);
        }
        return {
            message: 'Series guardadas correctamente en la base de datos local.',
            total_series: dto.series.length,
        };
    }
    async listSeries(sucursalId) {
        if (sucursalId) {
            const localSeries = await this.seriesRepo.find({ where: { establishmentId: Number(sucursalId) } });
            if (localSeries.length > 0)
                return localSeries;
        }
        try {
            const endpoint = sucursalId ? `/series?sucursal_id=${sucursalId}` : '/series';
            const res = await this.facturacionAdapter.get(endpoint);
            return res?.datos || res;
        }
        catch {
            return sucursalId ? this.seriesRepo.find({ where: { establishmentId: Number(sucursalId) } }) : this.seriesRepo.find();
        }
    }
};
exports.EstablishmentsService = EstablishmentsService;
exports.EstablishmentsService = EstablishmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_settings_entity_1.CompanySettingsEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(establishment_entity_1.EstablishmentEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(establishment_series_entity_1.EstablishmentSeriesEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        facturacion_adapter_1.FacturacionAdapter])
], EstablishmentsService);
//# sourceMappingURL=establishments.service.js.map