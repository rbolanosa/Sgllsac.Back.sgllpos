import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { CompanySettingsEntity } from '../entities/company-settings.entity';
import { UpdateCompanySettingsDto } from '../../application/dto/company-settings.dto';

const SINGLETON_ID = 1;

@Injectable()
export class CompanySettingsService {
  constructor(
    @InjectRepository(CompanySettingsEntity)
    private readonly repo: Repository<CompanySettingsEntity>,
    private readonly httpService: HttpService,
  ) {}

  /** Returns the single company settings record (creates default if not exists). */
  async get(): Promise<CompanySettingsEntity> {
    let settings = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    if (!settings) {
      settings = this.repo.create({ id: SINGLETON_ID });
      await this.repo.save(settings);
    }
    return settings;
  }

  /** Syncs company profile, main establishment, and document series from APISUNAT into local DB */
  async syncFromApisunat(apiKey?: string, apiSecret?: string, apiUrl?: string): Promise<boolean> {
    const settings = await this.get();
    const key = apiKey || settings.sunatApiKey;
    const secret = apiSecret || settings.sunatApiSecret;
    const url = (apiUrl || settings.sunatApiUrl || '').replace(/\/$/, '');

    if (!key || !secret || !url) return false;

    try {
      const res = await firstValueFrom(
        this.httpService.get(`${url}/empresa`, {
          headers: { 'X-Api-Key': key, 'X-Api-Secret': secret },
          timeout: 10_000,
        }),
      );

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
    } catch (err: any) {
      console.warn('No se pudo auto-sincronizar datos desde APISUNAT:', err?.message);
    }
    return false;
  }

  /** Fetches the public logo URL from Railway empresa endpoint and persists it in DB. */
  async getEmpresaLogoUrl(): Promise<string | null> {
    const settings = await this.get();
    if (!settings.sunatApiKey || !settings.sunatApiSecret || !settings.sunatApiUrl) return null;
    try {
      const targetUrl = settings.sunatApiUrl.replace(/\/$/, '');
      const response = await firstValueFrom(
        this.httpService.get(`${targetUrl}/empresa`, {
          headers: {
            'X-Api-Key': settings.sunatApiKey,
            'X-Api-Secret': settings.sunatApiSecret,
          },
          timeout: 8_000,
        }),
      );
      const remoteLogoPath: string | undefined = response.data?.datos?.logo_url;
      if (remoteLogoPath) {
        const baseHost = new URL(targetUrl).origin;
        const publicLogoUrl = remoteLogoPath.startsWith('http')
          ? remoteLogoPath
          : `${baseHost}${remoteLogoPath}`;
        // Persist so next request is instant
        await this.repo.update(SINGLETON_ID, { logoUrl: publicLogoUrl });
        return publicLogoUrl;
      }
    } catch (err: any) {
      console.warn('No se pudo obtener logo_url de Railway:', err?.message);
    }
    return null;
  }

  /** Upsert — always writes to id=1 and syncs with APISUNAT if API keys are configured. */
  async update(dto: UpdateCompanySettingsDto): Promise<CompanySettingsEntity> {
    // Ensure record exists
    const current = await this.get();

    await this.repo.update(SINGLETON_ID, {
      ...dto,
    });

    const updated = await this.get();

    // Sync with APISUNAT if API key and secret are present
    if (updated.sunatApiKey && updated.sunatApiSecret && updated.sunatApiUrl) {
      try {
        await this.syncFromApisunat(updated.sunatApiKey, updated.sunatApiSecret, updated.sunatApiUrl);
        const targetUrl = updated.sunatApiUrl.replace(/\/$/, '');
        const payload: Record<string, any> = {};
        if (dto.ruc) payload.ruc = dto.ruc;
        if (dto.razonSocial) payload.razon_social = dto.razonSocial;
        if (dto.nombreComercial !== undefined) payload.nombre_comercial = dto.nombreComercial;
        if (dto.direccion) payload.direccion = dto.direccion;
        if (dto.ubigeo) payload.ubigeo = dto.ubigeo;
        if (dto.departamento) payload.departamento = dto.departamento;
        if (dto.provincia) payload.provincia = dto.provincia;
        if (dto.distrito) payload.distrito = dto.distrito;
        if (dto.telefono) payload.telefonos = [dto.telefono];
        if (dto.email) payload.emails = [dto.email];
        if (dto.regimenTributario) payload.tax_regime = dto.regimenTributario;
        if (dto.usuarioSol) payload.sol_user = dto.usuarioSol;
        if (dto.claveSol) payload.sol_pass = dto.claveSol;
        if (dto.sunatClientId) payload.client_id = dto.sunatClientId;
        if (dto.sunatClientSecret) payload.client_secret = dto.sunatClientSecret;
        if (dto.productionMode !== undefined) payload.entorno = dto.productionMode ? 'production' : 'beta';

        if (Object.keys(payload).length > 0) {
          await firstValueFrom(
            this.httpService.put(`${targetUrl}/empresa`, payload, {
              headers: {
                'X-Api-Key': updated.sunatApiKey,
                'X-Api-Secret': updated.sunatApiSecret,
                'Content-Type': 'application/json',
              },
              timeout: 10_000,
            }),
          );
        }
      } catch (err: any) {
        console.warn('Advertencia: No se pudo sincronizar actualización con APISUNAT:', err?.message);
      }
    }

    return updated;
  }

  /**
   * Registers the company on APISUNAT (POST /registro) using saved company details and the uploaded digital certificate.
   * Saves returned api_key and api_secret into company_settings.
   */
  async registerSunatApi(
    certFile: Express.Multer.File,
    certPassword?: string,
  ): Promise<{ message: string; apiKey: string; apiSecret: string }> {
    const settings = await this.get();

    if (!settings.ruc || settings.ruc.length !== 11) {
      throw new BadRequestException('Debe registrar un RUC válido de 11 dígitos antes de continuar.');
    }
    if (!settings.razonSocial) {
      throw new BadRequestException('La Razón Social de la empresa es obligatoria.');
    }
    if (!settings.usuarioSol || !settings.claveSol) {
      throw new BadRequestException('Debe ingresar su Usuario SOL y Clave SOL de SUNAT.');
    }
    if (!certFile) {
      throw new BadRequestException('Debe adjuntar el archivo del certificado digital (.pfx / .p12 / .pem).');
    }

    const form = new FormData();
    form.append('ruc', settings.ruc);
    form.append('razon_social', settings.razonSocial);
    if (settings.nombreComercial) form.append('nombre_comercial', settings.nombreComercial);
    form.append('direccion', settings.direccion || 'LIMA - PERU');
    form.append('ubigeo', settings.ubigeo || '150101');
    if (settings.departamento) form.append('departamento', settings.departamento);
    if (settings.provincia) form.append('provincia', settings.provincia);
    if (settings.distrito) form.append('distrito', settings.distrito);

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
      const response = await firstValueFrom(
        this.httpService.post(registerEndpoint, form, {
          headers: {
            ...form.getHeaders(),
          },
          timeout: 20_000,
        }),
      );

      const resData = response.data;

      // Extract credentials from APISUNAT response
      const apiKey = resData?.datos?.api_key || resData?.api_key;
      const apiSecret = resData?.datos?.api_secret || resData?.api_secret;

      if (!apiKey || !apiSecret) {
        throw new BadRequestException(
          resData?.mensaje || 'APISUNAT no devolvió las credenciales api_key y api_secret esperadas.',
        );
      }

      // If converted modern cert exists, save it over original
      if (activeCertPath !== certFile.path && fs.existsSync(activeCertPath)) {
        try {
          fs.copyFileSync(activeCertPath, certFile.path);
          fs.unlinkSync(activeCertPath);
        } catch {}
      }

      // Persist credentials & cert details in database
      const certUrl = `/uploads/certificates/${certFile.filename}`;
      await this.repo.update(SINGLETON_ID, {
        sunatApiKey: apiKey,
        sunatApiSecret: apiSecret,
        certificadoUrl: certUrl,
        certificadoPassword: certPassword || null,
      });

      // Automatically initialize default document series (F001, B001) in APISUNAT
      try {
        await firstValueFrom(
          this.httpService.post(
            `${targetUrl}/series/init-defaults`,
            {},
            {
              headers: {
                'X-Api-Key': apiKey,
                'X-Api-Secret': apiSecret,
              },
              timeout: 10_000,
            },
          ),
        );
      } catch (err: any) {
        console.warn('Advertencia: No se pudieron auto-inicializar las series en APISUNAT:', err?.message);
      }

      return {
        message: resData?.mensaje || 'Empresa registrada exitosamente en APISUNAT',
        apiKey,
        apiSecret,
      };
    } catch (err: any) {
      if (activeCertPath !== certFile.path && fs.existsSync(activeCertPath)) {
        try { fs.unlinkSync(activeCertPath); } catch {}
      }
      const errMsg = err?.response?.data?.mensaje || err?.response?.data?.message || err.message;
      throw new BadRequestException(`Error al registrar en APISUNAT: ${errMsg}`);
    }
  }

  /** Sync company logo to APISUNAT (POST /empresa/logo) */
  async syncLogoToApisunat(logoFile: Express.Multer.File): Promise<void> {
    const settings = await this.get();
    if (!settings.sunatApiKey || !settings.sunatApiSecret || !settings.sunatApiUrl) return;

    try {
      const form = new FormData();
      form.append('logo', fs.createReadStream(logoFile.path), {
        filename: logoFile.originalname,
        contentType: logoFile.mimetype,
      });

      const targetUrl = settings.sunatApiUrl.replace(/\/$/, '');
      const response = await firstValueFrom(
        this.httpService.post(`${targetUrl}/empresa/logo`, form, {
          headers: {
            ...form.getHeaders(),
            'X-Api-Key': settings.sunatApiKey,
            'X-Api-Secret': settings.sunatApiSecret,
          },
          timeout: 15_000,
        }),
      );

      // Save Railway's public logo URL so it works in production (e.g. Vercel)
      const remoteLogoPath: string | undefined = response.data?.datos?.logo_url || response.data?.logo_url;
      if (remoteLogoPath) {
        const baseHost = new URL(targetUrl).origin;
        const publicLogoUrl = remoteLogoPath.startsWith('http')
          ? remoteLogoPath
          : `${baseHost}${remoteLogoPath}`;
        await this.repo.update(1, { logoUrl: publicLogoUrl });
      }
    } catch (err: any) {
      console.warn('Advertencia: No se pudo subir el logo a APISUNAT:', err?.message);
    }
  }

  /**
   * Sends logo from memory buffer directly to Railway APISUNAT (works in serverless).
   * Returns the public Railway logo URL, or null if not configured.
   */
  async syncLogoBufferToApisunat(file: Express.Multer.File): Promise<string | null> {
    const settings = await this.get();
    if (!settings.sunatApiKey || !settings.sunatApiSecret || !settings.sunatApiUrl) return null;

    try {
      const form = new FormData();
      // Use the in-memory buffer directly — no disk write needed
      form.append('logo', file.buffer, {
        filename: file.originalname || `logo${file.mimetype?.includes('png') ? '.png' : '.jpg'}`,
        contentType: file.mimetype,
        knownLength: file.buffer.length,
      });

      const targetUrl = settings.sunatApiUrl.replace(/\/$/, '');
      const response = await firstValueFrom(
        this.httpService.post(`${targetUrl}/empresa/logo`, form, {
          headers: {
            ...form.getHeaders(),
            'X-Api-Key': settings.sunatApiKey,
            'X-Api-Secret': settings.sunatApiSecret,
          },
          timeout: 15_000,
        }),
      );

      const remoteLogoPath: string | undefined = response.data?.datos?.logo_url || response.data?.logo_url;
      if (remoteLogoPath) {
        const baseHost = new URL(targetUrl).origin;
        return remoteLogoPath.startsWith('http')
          ? remoteLogoPath
          : `${baseHost}${remoteLogoPath}`;
      }
    } catch (err: any) {
      console.warn('Error al subir logo buffer a APISUNAT:', err?.message);
    }
    return null;
  }

  /** Converts legacy PFX/P12 certificate encryption to modern PFX format if openssl is available. */
  private normalizeCertificatePath(filePath: string, password?: string): string {
    if (!password || !fs.existsSync(filePath)) return filePath;
    const tempPem = `${filePath}.pem`;
    const modernPfx = `${filePath}_modern.pfx`;
    try {
      execSync(`openssl pkcs12 -in "${filePath}" -legacy -passin pass:"${password}" -nodes -out "${tempPem}"`, {
        stdio: 'ignore',
      });
      execSync(`openssl pkcs12 -export -in "${tempPem}" -out "${modernPfx}" -passout pass:"${password}"`, {
        stdio: 'ignore',
      });
      if (fs.existsSync(tempPem)) fs.unlinkSync(tempPem);
      if (fs.existsSync(modernPfx)) return modernPfx;
    } catch {
      if (fs.existsSync(tempPem)) {
        try { fs.unlinkSync(tempPem); } catch {}
      }
    }
    return filePath;
  }

  /** Returns the next invoice number for a given series and increments its independent correlativo. */
  async nextInvoiceNumber(type: 'factura' | 'boleta' | 'nota_venta', manager?: any): Promise<string> {
    const mgr = manager || this.repo;
    const settings = manager
      ? await manager.findOne(CompanySettingsEntity, { where: { id: SINGLETON_ID } })
      : await this.get();

    let serie = settings?.serieBoleta || 'B001';
    let nextCorrelativo = (settings?.correlativoBoleta || 0) + 1;
    let fieldToIncrement = 'correlativo_boleta';

    if (type === 'factura') {
      serie = settings?.serieFactura || 'F001';
      nextCorrelativo = (settings?.correlativoFactura || 0) + 1;
      fieldToIncrement = 'correlativo_factura';
    } else if (type === 'nota_venta') {
      serie = settings?.serieNotaVenta || 'NV01';
      nextCorrelativo = (settings?.correlativoNotaVenta || 0) + 1;
      fieldToIncrement = 'correlativo_nota_venta';
    }

    const invoiceNumber = `${serie}-${String(nextCorrelativo).padStart(8, '0')}`;

    // Increment document-specific correlativo in database
    if (manager) {
      await manager.query(
        `UPDATE company_settings SET ${fieldToIncrement} = ${fieldToIncrement} + 1 WHERE id = ?`,
        [SINGLETON_ID],
      );
    } else {
      await this.repo.increment({ id: SINGLETON_ID }, fieldToIncrement === 'correlativo_boleta' ? 'correlativoBoleta' : fieldToIncrement === 'correlativo_factura' ? 'correlativoFactura' : 'correlativoNotaVenta', 1);
    }

    return invoiceNumber;
  }
}
