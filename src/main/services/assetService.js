const fs = require('fs');
const path = require('path');

class AssetService {
  constructor() {
    this.logoPath = null;
    this.findLogo();
  }

  findLogo() {
    // Check possible locations for the authentic logo
    const candidates = [
      path.join(__dirname, '..', '..', '..', 'assets', 'Yum Yum Cafe Logo.jpg'),
      path.join(__dirname, '..', '..', '..', 'assets', 'yum-yum-cafe-logo.jpg'),
      path.join(process.cwd(), 'assets', 'Yum Yum Cafe Logo.jpg'),
      path.join(process.cwd(), 'assets', 'yum-yum-cafe-logo.jpg')
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.logoPath = p;
        return p;
      }
    }
    return null;
  }

  getLogoBase64() {
    const logoFile = this.findLogo();
    if (!logoFile) {
      throw new Error("Setup Error: 'Yum Yum Cafe Logo.jpg' is missing from assets directory. Please place the official logo in the assets folder.");
    }

    try {
      const data = fs.readFileSync(logoFile);
      const base64 = data.toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch (err) {
      throw new Error(`Failed to load logo: ${err.message}`);
    }
  }

  validateQrImage(base64OrPath) {
    if (!base64OrPath || typeof base64OrPath !== 'string') {
      return { valid: false, message: 'No QR code image data provided.' };
    }

    if (base64OrPath.startsWith('data:image/')) {
      // Validate data URL format
      const match = base64OrPath.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
      if (!match) {
        return { valid: false, message: 'Invalid image format. Supported formats: PNG, JPG, JPEG, WEBP.' };
      }
      return { valid: true };
    }

    // If local file path
    if (fs.existsSync(base64OrPath)) {
      return { valid: true };
    }

    return { valid: false, message: 'Invalid QR code image file or data.' };
  }
}

module.exports = new AssetService();
