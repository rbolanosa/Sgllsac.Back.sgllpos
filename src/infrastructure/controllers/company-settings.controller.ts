import {
  Controller, Get, Put, Post, Body, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CompanySettingsService } from '../../domain/services/company-settings.service';
import { UpdateCompanySettingsDto } from '../../application/dto/company-settings.dto';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'logos');
const CERTS_DIR = join(process.cwd(), 'uploads', 'certificates');

// Ensure directories exist on module load
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
if (!existsSync(CERTS_DIR)) mkdirSync(CERTS_DIR, { recursive: true });

const logoStorage = diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `logo-${Date.now()}${extname(file.originalname)}`;
    cb(null, unique);
  },
});

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

  @Get()
  async get() {
    return this.service.get();
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async update(@Body() dto: UpdateCompanySettingsDto) {
    return this.service.update(dto);
  }

  /**
   * Upload company logo (PNG/JPG, max 2 MB).
   * Returns the public URL stored on the server.
   */
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: logoStorage,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
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
    const logoUrl = `/uploads/logos/${file.filename}`;
    // Persist local URL in settings and sync file to APISUNAT
    await this.service.update({ logoUrl } as UpdateCompanySettingsDto);
    await this.service.syncLogoToApisunat(file);
    return { logoUrl, message: 'Logo uploaded successfully' };
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
