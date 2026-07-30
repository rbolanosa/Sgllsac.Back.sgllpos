import {
  Controller, Get, Put, Post, Body, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage, diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CompanySettingsService } from '../../domain/services/company-settings.service';
import { UpdateCompanySettingsDto } from '../../application/dto/company-settings.dto';
import { Public } from '../decorators/public.decorator';

// Certificates still need disk storage (openssl operations require a real file path)
const CERTS_DIR = join(process.cwd(), 'uploads', 'certificates');
try { if (!existsSync(CERTS_DIR)) mkdirSync(CERTS_DIR, { recursive: true }); } catch {}

const certStorage = diskStorage({
  destination: (_req, _file, cb) => cb(null, CERTS_DIR),
  filename: (_req, file, cb) => {
    const unique = `cert-${Date.now()}${extname(file.originalname)}`;
    cb(null, unique);
  },
});

@Controller({ path: 'company-settings', version: '1' })
export class CompanySettingsController {
  constructor(private readonly service: CompanySettingsService) {}

  @Public()
  @Get()
  async get() {
    const settings = await this.service.get();
    // If logo is still a local /uploads path, fetch the Railway public URL and persist it
    if (settings.logoUrl?.startsWith('/uploads') && settings.sunatApiKey && settings.sunatApiUrl) {
      try {
        const res = await this.service.getEmpresaLogoUrl();
        if (res) settings.logoUrl = res;
      } catch {}
    }
    return settings;
  }

  @Public()
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncFromApisunat(@Body() dto: { apiKey?: string; apiSecret?: string; apiUrl?: string }) {
    const success = await this.service.syncFromApisunat(dto.apiKey, dto.apiSecret, dto.apiUrl);
    return { success, message: success ? 'Datos sincronizados desde APISUNAT' : 'No se pudo sincronizar. Verifique sus credenciales.' };
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async update(@Body() dto: UpdateCompanySettingsDto) {
    return this.service.update(dto);
  }

  /**
   * Upload company logo (PNG/JPG/WEBP/SVG, max 2 MB).
   * Uses memoryStorage so it works in serverless environments (Vercel, etc.)
   * where the filesystem is read-only. The file is sent directly to Railway
   * from memory, and the resulting public URL is saved as logoUrl.
   */
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),           // ← no disk writes
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
        if (!allowed.includes(extname(file.originalname).toLowerCase())) {
          return cb(new BadRequestException('Only image files are allowed (PNG, JPG, WEBP, SVG)'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    // Send the buffer directly to Railway and get the public URL back
    const publicLogoUrl = await this.service.syncLogoBufferToApisunat(file);

    if (publicLogoUrl) {
      // Save Railway's public URL — works in both local and production
      await this.service.update({ logoUrl: publicLogoUrl } as UpdateCompanySettingsDto);
      return { logoUrl: publicLogoUrl, message: 'Logo uploaded successfully' };
    }

    // Fallback: if Railway sync not configured, return a placeholder message
    return { logoUrl: null, message: 'Logo recibido pero no se pudo sincronizar con APISUNAT. Configure las credenciales de facturación primero.' };
  }

  /**
   * Register company in APISUNAT by uploading digital certificate.
   */
  @Post('register-sunat-api')
  @UseInterceptors(
    FileInterceptor('certificado', {
      storage: certStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async registerSunatApi(
    @UploadedFile() file: Express.Multer.File,
    @Body('contrasenaCertificado') contrasenaCertificado?: string,
  ) {
    if (!file) throw new BadRequestException('El archivo del certificado digital es requerido.');
    return this.service.registerSunatApi(file, contrasenaCertificado);
  }
}
