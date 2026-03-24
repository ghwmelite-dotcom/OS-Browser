import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

// Certificate error audit log — persists to disk for security review
const CERT_LOG_FILE = path.join(app.getPath('userData'), 'cert-errors.log');

function logCertEvent(level: 'WARN' | 'BLOCK', hostname: string, error: string, issuer: string): void {
  try {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${level}: ${hostname} | ${error} | issuer=${issuer}\n`;
    fs.appendFileSync(CERT_LOG_FILE, entry);

    // Rotate log if it exceeds 1MB
    try {
      const stats = fs.statSync(CERT_LOG_FILE);
      if (stats.size > 1024 * 1024) {
        const rotated = CERT_LOG_FILE + '.old';
        if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
        fs.renameSync(CERT_LOG_FILE, rotated);
      }
    } catch { /* rotation is best-effort */ }
  } catch {
    // Logging failure is non-critical
  }
}

export function initCertHandler(mainWindow: BrowserWindow): void {
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    try {
      const hostname = new URL(url).hostname;

      // Allow *.gov.gh and *.mil.gh domains with cert issues
      // These government sites sometimes have certificate problems
      if (hostname.endsWith('.gov.gh') || hostname.endsWith('.mil.gh') || hostname.endsWith('.edu.gh')) {
        event.preventDefault();
        callback(true); // Allow despite cert error

        // Log the allowed cert error for security audit
        logCertEvent('WARN', hostname, error.toString(), certificate.issuerName);

        // Warn renderer about the cert issue
        mainWindow.webContents.send('cert:warning', {
          url,
          hostname,
          error: error.toString(),
          certificate: {
            issuer: certificate.issuerName,
            subject: certificate.subjectName,
            validStart: certificate.validStart,
            validExpiry: certificate.validExpiry,
          },
        });
        return;
      }

      // For all other domains, block, log, and notify
      logCertEvent('BLOCK', hostname, error.toString(), certificate.issuerName);
      callback(false);
      mainWindow.webContents.send('cert:error', {
        url,
        hostname,
        error: error.toString(),
      });
    } catch {
      callback(false);
    }
  });
}
