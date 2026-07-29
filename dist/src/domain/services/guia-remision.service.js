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
var GuiaRemisionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuiaRemisionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const guia_remision_entity_1 = require("../entities/guia-remision.entity");
const guia_remision_dto_1 = require("../../application/dtos/guia-remision.dto");
const facturacion_adapter_1 = require("../../infrastructure/adapters/facturacion.adapter");
let GuiaRemisionService = GuiaRemisionService_1 = class GuiaRemisionService {
    constructor(repo, facturacion) {
        this.repo = repo;
        this.facturacion = facturacion;
        this.logger = new common_1.Logger(GuiaRemisionService_1.name);
    }
    async create(dto) {
        if (dto.mod_traslado === '01' && !dto.transportista) {
            throw new common_1.BadRequestException('Para transporte Público (01) se requiere el campo "transportista".');
        }
        if (dto.mod_traslado === '02' && !dto.vehiculo) {
            throw new common_1.BadRequestException('Para transporte Privado (02) se requiere el campo "vehiculo".');
        }
        const today = new Date().toISOString().slice(0, 10);
        const entity = this.repo.create({
            serie: dto.serie || 'T001',
            fechaEmision: dto.fecha_emision || today,
            fechaTraslado: dto.fecha_traslado || today,
            destTipoDoc: dto.destinatario.tipo_doc,
            destNumDoc: dto.destinatario.num_doc,
            destRazonSocial: dto.destinatario.razon_social,
            codTraslado: dto.cod_traslado,
            modTraslado: dto.mod_traslado,
            pesoTotal: dto.peso_total,
            undPesoTotal: dto.und_peso_total || 'KGM',
            numBultos: dto.num_bultos ?? null,
            partidaUbigeo: dto.partida_ubigeo,
            partidaDireccion: dto.partida_direccion,
            llegadaUbigeo: dto.llegada_ubigeo,
            llegadaDireccion: dto.llegada_direccion,
            transportistaJson: dto.transportista ? JSON.stringify(dto.transportista) : null,
            fechaEntregaTransportista: dto.fecha_de_entrega_al_transportista ?? null,
            vehiculoJson: dto.vehiculo ? JSON.stringify(dto.vehiculo) : null,
            conductorJson: dto.conductor
                ? JSON.stringify(dto.conductor)
                : dto.conductores
                    ? JSON.stringify(dto.conductores)
                    : null,
            itemsJson: JSON.stringify(dto.items),
            sunatStatus: 'PENDIENTE',
        });
        const saved = await this.repo.save(entity);
        if (dto.enviar_automatico !== false) {
            try {
                await this.sendToApisunat(saved, dto);
            }
            catch (err) {
                this.logger.error('Error al enviar GRR a APISUNAT:', err?.response?.data || err?.message);
                const apiData = err?.response?.data;
                let errMsg = 'Error al enviar a SUNAT';
                if (apiData) {
                    if (apiData.errors && typeof apiData.errors === 'object') {
                        errMsg = Object.values(apiData.errors).flat().join(' | ');
                    }
                    else if (apiData.mensaje) {
                        errMsg = apiData.mensaje;
                    }
                    else if (apiData.message) {
                        errMsg = apiData.message;
                    }
                }
                else if (err?.message) {
                    errMsg = err.message;
                }
                await this.repo.update(saved.id, {
                    sunatStatus: 'RECHAZADO',
                    sunatMessage: errMsg,
                });
                saved.sunatStatus = 'RECHAZADO';
                saved.sunatMessage = errMsg;
            }
        }
        return this.repo.findOne({ where: { id: saved.id } });
    }
    async findAll(params) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        const qb = this.repo.createQueryBuilder('g')
            .orderBy('g.createdAt', 'DESC')
            .skip(skip)
            .take(limit);
        if (params.sunatStatus) {
            qb.andWhere('g.sunatStatus = :status', { status: params.sunatStatus.toUpperCase() });
        }
        if (params.from) {
            qb.andWhere('g.fechaEmision >= :from', { from: params.from });
        }
        if (params.to) {
            qb.andWhere('g.fechaEmision <= :to', { to: params.to });
        }
        const [data, total] = await qb.getManyAndCount();
        return { data: data.map((g) => this.serialize(g)), total, page, limit };
    }
    async findById(id) {
        const entity = await this.repo.findOne({ where: { id } });
        if (!entity)
            throw new common_1.NotFoundException(`Guía de Remisión #${id} no encontrada`);
        return this.serialize(entity);
    }
    async resendSunat(id) {
        const entity = await this.repo.findOne({ where: { id } });
        if (!entity)
            throw new common_1.NotFoundException(`Guía de Remisión #${id} no encontrada`);
        const dto = this.deserializeToDto(entity);
        try {
            await this.sendToApisunat(entity, dto);
        }
        catch (err) {
            this.logger.error('Error al reenviar GRR a APISUNAT:', err?.response?.data || err?.message);
            const apiData = err?.response?.data;
            let errMsg = 'Error al reenviar a SUNAT';
            if (apiData) {
                if (apiData.errors && typeof apiData.errors === 'object') {
                    errMsg = Object.values(apiData.errors).flat().join(' | ');
                }
                else if (apiData.mensaje) {
                    errMsg = apiData.mensaje;
                }
                else if (apiData.message) {
                    errMsg = apiData.message;
                }
            }
            else if (err?.message) {
                errMsg = err.message;
            }
            await this.repo.update(entity.id, {
                sunatStatus: 'RECHAZADO',
                sunatMessage: errMsg,
            });
        }
        return this.repo.findOne({ where: { id } });
    }
    async sendToApisunat(entity, dto) {
        const conductor = entity.conductorJson ? JSON.parse(entity.conductorJson) : null;
        const conductores = Array.isArray(conductor) ? conductor : null;
        const conductorSingle = !Array.isArray(conductor) ? conductor : null;
        const payload = {
            serie: entity.serie,
            fecha_emision: entity.fechaEmision,
            destinatario: {
                tipo_doc: entity.destTipoDoc,
                num_doc: entity.destNumDoc,
                razon_social: entity.destRazonSocial,
            },
            cod_traslado: entity.codTraslado,
            mod_traslado: entity.modTraslado,
            fecha_traslado: entity.fechaTraslado,
            peso_total: Number(entity.pesoTotal),
            und_peso_total: entity.undPesoTotal || 'KGM',
            partida_ubigeo: entity.partidaUbigeo,
            partida_direccion: entity.partidaDireccion,
            llegada_ubigeo: entity.llegadaUbigeo,
            llegada_direccion: entity.llegadaDireccion,
            items: JSON.parse(entity.itemsJson || '[]'),
        };
        if (entity.numBultos)
            payload.num_bultos = entity.numBultos;
        if (entity.transportistaJson)
            payload.transportista = JSON.parse(entity.transportistaJson);
        if (entity.fechaEntregaTransportista)
            payload.fecha_de_entrega_al_transportista = entity.fechaEntregaTransportista;
        if (entity.vehiculoJson)
            payload.vehiculo = JSON.parse(entity.vehiculoJson);
        if (conductorSingle)
            payload.conductor = conductorSingle;
        if (conductores)
            payload.conductores = conductores;
        if (dto.indicadores?.length)
            payload.indicadores = dto.indicadores;
        this.logger.log(`GRR #${entity.id} → payload:\n${JSON.stringify(payload, null, 2)}`);
        const res = await this.facturacion.post('/guias-remision', payload);
        this.logger.log(`GRR #${entity.id} ← respuesta APISUNAT:\n${JSON.stringify(res, null, 2)}`);
        const datos = res?.datos ?? res;
        const estadoRaw = String(res?.estado || datos?.estado || datos?.sunat?.estado || '').toLowerCase();
        const mensajeRaw = res?.mensaje || datos?.mensaje || datos?.sunat?.descripcion || '';
        let sunatStatus;
        let sunatMessage;
        if (['exito', 'enviado', 'aceptado', 'pendiente', 'ok', 'registrado'].includes(estadoRaw)) {
            sunatStatus = 'ACEPTADO';
            sunatMessage = mensajeRaw || 'Guía de Remisión enviada correctamente';
        }
        else {
            sunatStatus = 'RECHAZADO';
            sunatMessage = mensajeRaw || 'SUNAT rechazó la Guía de Remisión';
        }
        let numeroCompleto = entity.numeroCompleto;
        let correlativo = entity.correlativo;
        const apiId = datos?.id ?? null;
        const numComp = datos?.numero_completo || res?.numero_completo;
        if (numComp) {
            const parts = String(numComp).split('-');
            if (parts.length === 2) {
                correlativo = String(parts[1]).padStart(8, '0');
                numeroCompleto = `${parts[0]}-${correlativo}`;
            }
            else {
                numeroCompleto = numComp;
            }
        }
        await this.repo.update(entity.id, {
            sunatStatus,
            sunatMessage,
            numeroCompleto,
            correlativo,
            xmlUrl: datos?.archivos?.xml || null,
            pdfUrl: datos?.archivos?.pdf || null,
            cdrUrl: datos?.archivos?.cdr || null,
            apisunatId: apiId,
        });
        entity.sunatStatus = sunatStatus;
        entity.sunatMessage = sunatMessage;
        entity.numeroCompleto = numeroCompleto;
        this.logger.log(`GRR #${entity.id} → SUNAT: ${sunatStatus} | ${sunatMessage}`);
        return res;
    }
    serialize(g) {
        return {
            ...g,
            transportista: g.transportistaJson ? JSON.parse(g.transportistaJson) : null,
            vehiculo: g.vehiculoJson ? JSON.parse(g.vehiculoJson) : null,
            conductor: g.conductorJson ? JSON.parse(g.conductorJson) : null,
            items: g.itemsJson ? JSON.parse(g.itemsJson) : [],
        };
    }
    deserializeToDto(entity) {
        const dto = new guia_remision_dto_1.CreateGuiaRemisionDto();
        dto.serie = entity.serie;
        dto.fecha_emision = entity.fechaEmision;
        dto.fecha_traslado = entity.fechaTraslado;
        dto.destinatario = {
            tipo_doc: entity.destTipoDoc,
            num_doc: entity.destNumDoc,
            razon_social: entity.destRazonSocial,
        };
        dto.cod_traslado = entity.codTraslado;
        dto.mod_traslado = entity.modTraslado;
        dto.peso_total = Number(entity.pesoTotal);
        dto.und_peso_total = entity.undPesoTotal;
        dto.num_bultos = entity.numBultos ?? undefined;
        dto.partida_ubigeo = entity.partidaUbigeo;
        dto.partida_direccion = entity.partidaDireccion;
        dto.llegada_ubigeo = entity.llegadaUbigeo;
        dto.llegada_direccion = entity.llegadaDireccion;
        dto.items = entity.itemsJson ? JSON.parse(entity.itemsJson) : [];
        if (entity.transportistaJson)
            dto.transportista = JSON.parse(entity.transportistaJson);
        if (entity.vehiculoJson)
            dto.vehiculo = JSON.parse(entity.vehiculoJson);
        if (entity.conductorJson) {
            const parsed = JSON.parse(entity.conductorJson);
            if (Array.isArray(parsed))
                dto.conductores = parsed;
            else
                dto.conductor = parsed;
        }
        dto.fecha_de_entrega_al_transportista = entity.fechaEntregaTransportista ?? undefined;
        return dto;
    }
};
exports.GuiaRemisionService = GuiaRemisionService;
exports.GuiaRemisionService = GuiaRemisionService = GuiaRemisionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(guia_remision_entity_1.GuiaRemisionEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        facturacion_adapter_1.FacturacionAdapter])
], GuiaRemisionService);
//# sourceMappingURL=guia-remision.service.js.map