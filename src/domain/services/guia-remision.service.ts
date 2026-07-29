import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuiaRemisionEntity } from '../entities/guia-remision.entity';
import { CreateGuiaRemisionDto } from '../../application/dtos/guia-remision.dto';
import { FacturacionAdapter } from '../../infrastructure/adapters/facturacion.adapter';

@Injectable()
export class GuiaRemisionService {
  private readonly logger = new Logger(GuiaRemisionService.name);

  constructor(
    @InjectRepository(GuiaRemisionEntity)
    private readonly repo: Repository<GuiaRemisionEntity>,
    private readonly facturacion: FacturacionAdapter,
  ) {}

  // ── Create & send ─────────────────────────────────────────────────────────

  async create(dto: CreateGuiaRemisionDto): Promise<GuiaRemisionEntity> {
    // Validate conditional fields
    if (dto.mod_traslado === '01' && !dto.transportista) {
      throw new BadRequestException(
        'Para transporte Público (01) se requiere el campo "transportista".',
      );
    }
    if (dto.mod_traslado === '02' && !dto.vehiculo) {
      throw new BadRequestException(
        'Para transporte Privado (02) se requiere el campo "vehiculo".',
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    // Persist locally first
    const entity = this.repo.create({
      serie:                    dto.serie || 'T001',
      fechaEmision:             dto.fecha_emision || today,
      fechaTraslado:            dto.fecha_traslado || today,
      destTipoDoc:              dto.destinatario.tipo_doc,
      destNumDoc:               dto.destinatario.num_doc,
      destRazonSocial:          dto.destinatario.razon_social,
      codTraslado:              dto.cod_traslado,
      modTraslado:              dto.mod_traslado,
      pesoTotal:                dto.peso_total,
      undPesoTotal:             dto.und_peso_total || 'KGM',
      numBultos:                dto.num_bultos ?? null,
      partidaUbigeo:            dto.partida_ubigeo,
      partidaDireccion:         dto.partida_direccion,
      llegadaUbigeo:            dto.llegada_ubigeo,
      llegadaDireccion:         dto.llegada_direccion,
      transportistaJson:        dto.transportista ? JSON.stringify(dto.transportista) : null,
      fechaEntregaTransportista: dto.fecha_de_entrega_al_transportista ?? null,
      vehiculoJson:             dto.vehiculo ? JSON.stringify(dto.vehiculo) : null,
      conductorJson:            dto.conductor
        ? JSON.stringify(dto.conductor)
        : dto.conductores
        ? JSON.stringify(dto.conductores)
        : null,
      itemsJson:    JSON.stringify(dto.items),
      sunatStatus:  'PENDIENTE',
    });

    const saved = await this.repo.save(entity);

    // Send to APISUNAT
    if (dto.enviar_automatico !== false) {
      try {
        await this.sendToApisunat(saved, dto);
      } catch (err: any) {
        this.logger.error('Error al enviar GRR a APISUNAT:', err?.response?.data || err?.message);
        const apiData = err?.response?.data;
        let errMsg = 'Error al enviar a SUNAT';
        if (apiData) {
          if (apiData.errors && typeof apiData.errors === 'object') {
            errMsg = Object.values(apiData.errors).flat().join(' | ');
          } else if (apiData.mensaje) {
            errMsg = apiData.mensaje;
          } else if (apiData.message) {
            errMsg = apiData.message;
          }
        } else if (err?.message) {
          errMsg = err.message;
        }

        await this.repo.update(saved.id, {
          sunatStatus:  'RECHAZADO',
          sunatMessage: errMsg,
        });
        saved.sunatStatus  = 'RECHAZADO';
        saved.sunatMessage = errMsg;
      }
    }

    return this.repo.findOne({ where: { id: saved.id } });
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll(params: {
    page?: number;
    limit?: number;
    sunatStatus?: string;
    from?: string;
    to?: string;
  }) {
    const page  = params.page  || 1;
    const limit = params.limit || 20;
    const skip  = (page - 1) * limit;

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

  async findById(id: number) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Guía de Remisión #${id} no encontrada`);
    return this.serialize(entity);
  }

  // ── Resend to SUNAT ───────────────────────────────────────────────────────

  async resendSunat(id: number) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Guía de Remisión #${id} no encontrada`);

    // Reconstruct DTO from stored JSON
    const dto = this.deserializeToDto(entity);
    try {
      await this.sendToApisunat(entity, dto);
    } catch (err: any) {
      this.logger.error('Error al reenviar GRR a APISUNAT:', err?.response?.data || err?.message);
      const apiData = err?.response?.data;
      let errMsg = 'Error al reenviar a SUNAT';
      if (apiData) {
        if (apiData.errors && typeof apiData.errors === 'object') {
          errMsg = Object.values(apiData.errors).flat().join(' | ');
        } else if (apiData.mensaje) {
          errMsg = apiData.mensaje;
        } else if (apiData.message) {
          errMsg = apiData.message;
        }
      } else if (err?.message) {
        errMsg = err.message;
      }

      await this.repo.update(entity.id, {
        sunatStatus: 'RECHAZADO',
        sunatMessage: errMsg,
      });
    }
    return this.repo.findOne({ where: { id } });
  }

  // ── Internal: send to APISUNAT ────────────────────────────────────────────

  private async sendToApisunat(entity: GuiaRemisionEntity, dto: CreateGuiaRemisionDto) {
    const conductor   = entity.conductorJson ? JSON.parse(entity.conductorJson) : null;
    const conductores = Array.isArray(conductor) ? conductor : null;
    const conductorSingle = !Array.isArray(conductor) ? conductor : null;

    const payload: Record<string, any> = {
      serie:             entity.serie,
      fecha_emision:     entity.fechaEmision,
      destinatario: {
        tipo_doc:     entity.destTipoDoc,
        num_doc:      entity.destNumDoc,
        razon_social: entity.destRazonSocial,
      },
      cod_traslado:      entity.codTraslado,
      mod_traslado:      entity.modTraslado,
      fecha_traslado:    entity.fechaTraslado,
      peso_total:        Number(entity.pesoTotal),
      und_peso_total:    entity.undPesoTotal || 'KGM',
      partida_ubigeo:    entity.partidaUbigeo,
      partida_direccion: entity.partidaDireccion,
      llegada_ubigeo:    entity.llegadaUbigeo,
      llegada_direccion: entity.llegadaDireccion,
      items:             JSON.parse(entity.itemsJson || '[]'),
    };

    if (entity.numBultos)                    payload.num_bultos = entity.numBultos;
    if (entity.transportistaJson)            payload.transportista = JSON.parse(entity.transportistaJson);
    if (entity.fechaEntregaTransportista)    payload.fecha_de_entrega_al_transportista = entity.fechaEntregaTransportista;
    if (entity.vehiculoJson)                 payload.vehiculo = JSON.parse(entity.vehiculoJson);
    if (conductorSingle)                     payload.conductor = conductorSingle;
    if (conductores)                         payload.conductores = conductores;
    if (dto.indicadores?.length)             payload.indicadores = dto.indicadores;

    // Log full payload for debugging
    this.logger.log(`GRR #${entity.id} → payload:\n${JSON.stringify(payload, null, 2)}`);

    const res: any = await this.facturacion.post('/guias-remision', payload);

    // Log full response for debugging
    this.logger.log(`GRR #${entity.id} ← respuesta APISUNAT:\n${JSON.stringify(res, null, 2)}`);

    /*
     * APISUNAT response format:
     * { estado: "exito"|"error", mensaje: "...", datos: { id, numero_completo, sunat: {...}, archivos: {...} } }
     * OR (older): { id, numero_completo, sunat: {...} }
     */
    const datos = res?.datos ?? res;
    const estadoRaw = String(res?.estado || datos?.estado || datos?.sunat?.estado || '').toLowerCase();
    const mensajeRaw = res?.mensaje || datos?.mensaje || datos?.sunat?.descripcion || '';

    let sunatStatus: string;
    let sunatMessage: string;

    if (['exito', 'enviado', 'aceptado', 'pendiente', 'ok', 'registrado'].includes(estadoRaw)) {
      sunatStatus  = 'ACEPTADO';
      sunatMessage = mensajeRaw || 'Guía de Remisión enviada correctamente';
    } else {
      sunatStatus  = 'RECHAZADO';
      sunatMessage = mensajeRaw || 'SUNAT rechazó la Guía de Remisión';
    }

    // Extract numero_completo
    let numeroCompleto = entity.numeroCompleto;
    let correlativo    = entity.correlativo;
    const apiId        = datos?.id ?? null;

    const numComp = datos?.numero_completo || res?.numero_completo;
    if (numComp) {
      const parts = String(numComp).split('-');
      if (parts.length === 2) {
        correlativo    = String(parts[1]).padStart(8, '0');
        numeroCompleto = `${parts[0]}-${correlativo}`;
      } else {
        numeroCompleto = numComp;
      }
    }

    await this.repo.update(entity.id, {
      sunatStatus,
      sunatMessage,
      numeroCompleto,
      correlativo,
      xmlUrl:      datos?.archivos?.xml  || null,
      pdfUrl:      datos?.archivos?.pdf  || null,
      cdrUrl:      datos?.archivos?.cdr  || null,
      apisunatId:  apiId,
    });

    entity.sunatStatus    = sunatStatus;
    entity.sunatMessage   = sunatMessage;
    entity.numeroCompleto = numeroCompleto;

    this.logger.log(`GRR #${entity.id} → SUNAT: ${sunatStatus} | ${sunatMessage}`);
    return res;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private serialize(g: GuiaRemisionEntity) {
    return {
      ...g,
      transportista: g.transportistaJson ? JSON.parse(g.transportistaJson) : null,
      vehiculo:      g.vehiculoJson      ? JSON.parse(g.vehiculoJson)      : null,
      conductor:     g.conductorJson     ? JSON.parse(g.conductorJson)     : null,
      items:         g.itemsJson         ? JSON.parse(g.itemsJson)         : [],
    };
  }

  private deserializeToDto(entity: GuiaRemisionEntity): CreateGuiaRemisionDto {
    const dto = new CreateGuiaRemisionDto();
    dto.serie          = entity.serie;
    dto.fecha_emision  = entity.fechaEmision;
    dto.fecha_traslado = entity.fechaTraslado;
    dto.destinatario   = {
      tipo_doc:     entity.destTipoDoc,
      num_doc:      entity.destNumDoc,
      razon_social: entity.destRazonSocial,
    };
    dto.cod_traslado     = entity.codTraslado;
    dto.mod_traslado     = entity.modTraslado;
    dto.peso_total       = Number(entity.pesoTotal);
    dto.und_peso_total   = entity.undPesoTotal;
    dto.num_bultos       = entity.numBultos ?? undefined;
    dto.partida_ubigeo   = entity.partidaUbigeo;
    dto.partida_direccion= entity.partidaDireccion;
    dto.llegada_ubigeo   = entity.llegadaUbigeo;
    dto.llegada_direccion= entity.llegadaDireccion;
    dto.items            = entity.itemsJson ? JSON.parse(entity.itemsJson) : [];
    if (entity.transportistaJson)    dto.transportista = JSON.parse(entity.transportistaJson);
    if (entity.vehiculoJson)         dto.vehiculo      = JSON.parse(entity.vehiculoJson);
    if (entity.conductorJson) {
      const parsed = JSON.parse(entity.conductorJson);
      if (Array.isArray(parsed)) dto.conductores = parsed;
      else dto.conductor = parsed;
    }
    dto.fecha_de_entrega_al_transportista = entity.fechaEntregaTransportista ?? undefined;
    return dto;
  }
}
