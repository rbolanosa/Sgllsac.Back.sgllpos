import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuiaRemisionEntity } from '../entities/guia-remision.entity';
import { CreateGuiaRemisionDto } from '../../application/dtos/guia-remision.dto';
import { FacturacionAdapter } from '../../infrastructure/adapters/facturacion.adapter';
import { CompanySettingsEntity } from '../entities/company-settings.entity';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GuiaRemisionService {
  private readonly logger = new Logger(GuiaRemisionService.name);

  constructor(
    @InjectRepository(GuiaRemisionEntity)
    private readonly repo: Repository<GuiaRemisionEntity>,
    @InjectRepository(CompanySettingsEntity)
    private readonly companyRepo: Repository<CompanySettingsEntity>,
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
     * APISUNAT response format can be:
     * Format 1:
     * {
     *   "estado": "exito",
     *   "mensaje": "OK",
     *   "datos": {
     *     "datos": [
     *       {
     *         "id": 1,
     *         "numero_completo": "T001-000001",
     *         "sunat": { "estado": "rechazado", "codigo": "BUILD_ERROR", "descripcion": "..." }
     *       }
     *     ]
     *   }
     * }
     * Format 2:
     * { estado: "exito"|"error", mensaje: "...", datos: { id, numero_completo, sunat: {...}, archivos: {...} } }
     * Format 3:
     * { id, numero_completo, sunat: {...} }
     */
    let target = res?.datos ?? res;
    if (target?.datos && Array.isArray(target.datos) && target.datos.length > 0) {
      target = target.datos[0];
    }

    const sunatObj = target?.sunat || res?.sunat || null;
    const sunatEstado = String(sunatObj?.estado || (sunatObj ? '' : target?.estado || res?.estado) || '').toLowerCase();
    const sunatDesc = sunatObj?.descripcion || target?.mensaje || res?.mensaje || '';

    let sunatStatus: string;
    let sunatMessage: string;

    if (['rechazado', 'error', 'rechazada'].includes(sunatEstado) || sunatObj?.codigo === 'BUILD_ERROR') {
      sunatStatus  = 'RECHAZADO';
      sunatMessage = sunatDesc || 'SUNAT rechazó la Guía de Remisión';
    } else if (['aceptado', 'aceptada', 'enviado', 'ok'].includes(sunatEstado)) {
      sunatStatus  = 'ACEPTADO';
      sunatMessage = sunatDesc || 'Guía de Remisión enviada correctamente';
    } else if (sunatEstado === 'exito' && (!sunatObj || sunatObj.estado === 'aceptado')) {
      sunatStatus  = 'ACEPTADO';
      sunatMessage = sunatDesc || 'Guía de Remisión enviada correctamente';
    } else {
      sunatStatus  = 'RECHAZADO';
      sunatMessage = sunatDesc || 'SUNAT rechazó la Guía de Remisión';
    }

    // Extract numero_completo
    let numeroCompleto = entity.numeroCompleto;
    let correlativo    = entity.correlativo;
    const apiId        = target?.id ?? res?.id ?? null;
    const numComp      = target?.numero_completo || res?.numero_completo;

    if (numComp) {
      const parts = String(numComp).split('-');
      if (parts.length === 2) {
        correlativo    = String(parts[1]).padStart(8, '0');
        numeroCompleto = `${parts[0]}-${correlativo}`;
      } else {
        numeroCompleto = numComp;
      }
    }

    const archivos = target?.archivos || res?.archivos || null;

    await this.repo.update(entity.id, {
      sunatStatus,
      sunatMessage,
      numeroCompleto,
      correlativo,
      xmlUrl:      archivos?.xml  || null,
      pdfUrl:      archivos?.pdf  || null,
      cdrUrl:      archivos?.cdr  || null,
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
    let sunatStatus = g.sunatStatus;
    if (
      sunatStatus === 'ACEPTADO' &&
      g.sunatMessage &&
      (g.sunatMessage.includes('401') ||
       g.sunatMessage.includes('Unauthorized') ||
       g.sunatMessage.includes('BUILD_ERROR') ||
       g.sunatMessage.includes('Client error') ||
       g.sunatMessage.toLowerCase().includes('rechazad'))
    ) {
      sunatStatus = 'RECHAZADO';
      this.repo.update(g.id, { sunatStatus: 'RECHAZADO' }).catch(() => null);
    }

    return {
      ...g,
      sunatStatus,
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

  // ── PDF Generation (80mm ticket) ────────────────────────────────────────

  async generatePdfBuffer(id: number): Promise<{ buffer: Buffer; fileName: string }> {
    const guia = await this.findById(id);
    const company = await this.companyRepo.findOne({ where: {} }).catch(() => null);

    const pageWidth  = 240;   // 80mm ≈ 227pt, usamos 240 igual que comprobante
    const margin     = 10;
    const printWidth = pageWidth - margin * 2;

    // Logo
    let logoBuffer: Buffer | null = null;
    const logoUrl = (company as any)?.logoUrl || null;
    if (logoUrl) {
      try {
        if (logoUrl.startsWith('http')) {
          const axios = await import('axios');
          const r = await axios.default.get(logoUrl, { responseType: 'arraybuffer', timeout: 5000 });
          logoBuffer = Buffer.from(r.data);
        } else {
          const rel  = logoUrl.startsWith('/') ? logoUrl.substring(1) : logoUrl;
          const full = path.join(process.cwd(), rel);
          if (fs.existsSync(full)) logoBuffer = fs.readFileSync(full);
        }
      } catch { /* skip logo */ }
    }

    // QR: apunta al pdfUrl de SUNAT si existe
    const backendBase = process.env.BACKEND_URL || 'http://localhost:3000';
    const fullPdfUrl = guia.pdfUrl
      ? (guia.pdfUrl.startsWith('http') ? guia.pdfUrl : `${backendBase}${guia.pdfUrl}`)
      : null;
    const ruc = (company as any)?.ruc || '';
    const parts = (guia.numeroCompleto || guia.serie || 'T001-0').split('-');
    const serie  = parts[0] || 'T001';
    const numero = parts[1] || '0';
    const fechaIso = guia.fechaEmision
      ? new Date(guia.fechaEmision).toISOString().split('T')[0]
      : '';
    const qrText = fullPdfUrl
      ? fullPdfUrl
      : `${ruc}|09|${serie}|${numero}|${fechaIso}|${guia.destTipoDoc || '6'}|${guia.destNumDoc || ''}|`;
    let qrBuffer: Buffer | null = null;
    try { qrBuffer = await QRCode.toBuffer(qrText, { margin: 1, width: 100 }); } catch { /* skip */ }

    // Items
    const items: any[] = (() => {
      try { return JSON.parse(guia.itemsJson || '[]'); } catch { return []; }
    })();

    // Transportista / Conductor
    const trans = guia.transportistaJson ? (() => { try { return JSON.parse(guia.transportistaJson); } catch { return {}; } })() : null;
    const vehi  = guia.vehiculoJson      ? (() => { try { return JSON.parse(guia.vehiculoJson);      } catch { return {}; } })() : null;
    const cond  = guia.conductorJson     ? (() => { try { return JSON.parse(guia.conductorJson);     } catch { return {}; } })() : null;

    const COD_LABEL: Record<string, string> = {
      '01': '01 - Venta', '02': '02 - Compra',
      '04': '04 - Traslado entre establecimientos',
      '08': '08 - Importacion', '09': '09 - Exportacion', '13': '13 - Otros',
    };
    const motivoLabel = COD_LABEL[guia.codTraslado] || guia.codTraslado;
    const modLabel    = guia.modTraslado === '01' ? 'Transporte Publico' : 'Transporte Privado';
    const fechaEmision  = guia.fechaEmision  ? new Date(guia.fechaEmision).toLocaleDateString('es-PE')  : '';
    const fechaTraslado = guia.fechaTraslado ? new Date(guia.fechaTraslado).toLocaleDateString('es-PE') : '';
    const numDisplay    = guia.numeroCompleto || `${guia.serie}-PENDIENTE`;
    const tradeName     = ((company as any)?.nombreComercial || (company as any)?.razonSocial || '').toUpperCase();
    const addr          = (company as any)?.direccion || '';

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: [pageWidth, 900], margin });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const drawLabelVal = (label: string, val: string, fontBoldVal = false) => {
        const currentY = doc.y;
        doc.font('Helvetica').fontSize(8).text(label, margin, currentY, { width: 75 });
        if (fontBoldVal) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
        doc.fontSize(8).text(val || '—', margin + 75, currentY, { width: printWidth - 75 });
        doc.y = currentY + 11;
      };

      // 1. Logo
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, (pageWidth - 90) / 2, doc.y, { fit: [90, 55], align: 'center' });
          doc.y += 60;
        } catch { /* skip */ }
      }

      // 2. Empresa Header
      doc.font('Helvetica-Bold').fontSize(11).text(tradeName, margin, doc.y, { width: printWidth, align: 'center' });
      doc.font('Helvetica').fontSize(8).text(`RUC: ${ruc}`, margin, doc.y, { width: printWidth, align: 'center' });
      if (addr) doc.text(`D. Comercial: ${addr}`, margin, doc.y, { width: printWidth, align: 'center' });
      doc.moveDown(0.4);

      // 3. Titulo Comprobante
      doc.font('Helvetica-Bold').fontSize(10).text('GUÍA DE REMISIÓN REMITENTE', margin, doc.y, { width: printWidth, align: 'center' });
      doc.fontSize(12).text(numDisplay, margin, doc.y, { width: printWidth, align: 'center' });
      doc.moveDown(0.4);

      // 4. Datos generales
      drawLabelVal('F. Emisión:', fechaEmision);
      drawLabelVal('F. Traslado:', fechaTraslado);
      drawLabelVal('Motivo:', motivoLabel);
      drawLabelVal('Modalidad:', modLabel);
      doc.moveDown(0.3);

      // 5. Destinatario
      doc.font('Helvetica-Bold').fontSize(8.5).text('DESTINATARIO', margin, doc.y, { width: printWidth });
      doc.moveDown(0.15);
      drawLabelVal('Razón Social:', (guia.destRazonSocial || '').toUpperCase(), true);
      drawLabelVal('RUC / DNI:', guia.destNumDoc || '');
      doc.moveDown(0.3);

      // 6. Puntos de traslado
      doc.font('Helvetica-Bold').fontSize(8.5).text('PUNTO DE PARTIDA', margin, doc.y);
      doc.moveDown(0.15);
      drawLabelVal('Ubigeo:', guia.partidaUbigeo || '');
      drawLabelVal('Dirección:', (guia.partidaDireccion || '').toUpperCase());
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').fontSize(8.5).text('PUNTO DE LLEGADA', margin, doc.y);
      doc.moveDown(0.15);
      drawLabelVal('Ubigeo:', guia.llegadaUbigeo || '');
      drawLabelVal('Dirección:', (guia.llegadaDireccion || '').toUpperCase());
      doc.moveDown(0.3);

      // 7. Datos de carga
      doc.font('Helvetica-Bold').fontSize(8.5).text('DATOS DE CARGA', margin, doc.y);
      doc.moveDown(0.15);
      drawLabelVal('Peso Total:', `${Number(guia.pesoTotal || 0).toFixed(3)} ${guia.undPesoTotal || 'KGM'}`);
      if (guia.numBultos) drawLabelVal('N° Bultos:', String(guia.numBultos));
      if ((guia as any).comprobanteRef) drawLabelVal('Comprobante:', (guia as any).comprobanteRef);
      doc.moveDown(0.3);

      // 8. Transportista / Conductor
      if (guia.modTraslado === '01' && trans) {
        doc.font('Helvetica-Bold').fontSize(8.5).text('TRANSPORTISTA', margin, doc.y);
        doc.moveDown(0.15);
        drawLabelVal('Razón Social:', (trans.razon_social || '').toUpperCase());
        drawLabelVal('RUC:', trans.num_doc || '');
        if (trans.nro_mtc) drawLabelVal('N° MTC:', trans.nro_mtc);
        if (guia.fechaEntregaTransportista) drawLabelVal('F. Entrega:', guia.fechaEntregaTransportista);
      } else if (guia.modTraslado === '02') {
        doc.font('Helvetica-Bold').fontSize(8.5).text('VEHÍCULO Y CONDUCTOR', margin, doc.y);
        doc.moveDown(0.15);
        if (vehi?.placa) drawLabelVal('Placa:', vehi.placa.toUpperCase());
        if (cond?.num_doc) drawLabelVal('DNI:', cond.num_doc);
        if (cond?.nombres || cond?.apellidos)
          drawLabelVal('Conductor:', [cond.apellidos, cond.nombres].filter(Boolean).join(' ').toUpperCase());
        if (cond?.licencia) drawLabelVal('Licencia:', cond.licencia);
      }
      doc.moveDown(0.3);

      // 9. Tabla de Productos Header
      const headerY = doc.y;
      doc.moveTo(margin, headerY).lineTo(pageWidth - margin, headerY).lineWidth(1.2).strokeColor('#000').stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).text('CANT.', margin, headerY + 4, { width: 32 });
      doc.text('UNIDAD', margin + 32, headerY + 4, { width: 36 });
      doc.text('DESCRIPCIÓN', margin + 68, headerY + 4, { width: printWidth - 68 });
      const headerBottomY = headerY + 16;
      doc.moveTo(margin, headerBottomY).lineTo(pageWidth - margin, headerBottomY).lineWidth(1.2).strokeColor('#000').stroke();
      doc.y = headerBottomY + 5;

      // 10. Items
      doc.font('Helvetica').fontSize(7.5);
      items.forEach((it: any) => {
        const rowY = doc.y;
        doc.text(String(it.cantidad || 1), margin, rowY, { width: 32 });
        doc.text(it.unidad || 'NIU', margin + 32, rowY, { width: 36 });
        doc.text((it.descripcion || it.codigo || 'Producto').toUpperCase(), margin + 68, rowY, { width: printWidth - 68 });
        doc.y = rowY + 11;
      });

      doc.moveDown(0.3);
      const totalsLineY = doc.y;
      doc.moveTo(margin, totalsLineY).lineTo(pageWidth - margin, totalsLineY).lineWidth(1.2).strokeColor('#000').stroke();
      doc.y = totalsLineY + 8;

      // 11. Bloque QR + Pie
      const qrY = doc.y;
      if (qrBuffer) {
        doc.image(qrBuffer, margin, qrY, { width: 85, height: 85 });
      }

      const textLeftMargin = margin + 92;
      doc.font('Helvetica-Bold').fontSize(8).text('GUÍA DE REMISIÓN', textLeftMargin, qrY);
      doc.font('Helvetica').fontSize(7.5).text('Representación impresa de la Guía de Remisión Electrónica', textLeftMargin, qrY + 12, { width: printWidth - 92 });
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(8).text('CONSULTAS:', textLeftMargin, qrY + 38);
      doc.font('Helvetica').fontSize(7.5).text('www.sunat.gob.pe', textLeftMargin, qrY + 48);

      doc.y = Math.max(doc.y, qrY + 92);
      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(7.5).text('Generado por DEVPRO', margin, doc.y, { width: printWidth, align: 'center' });

      doc.end();
    });

    return { buffer, fileName: `${numDisplay}.pdf` };
  }
}
