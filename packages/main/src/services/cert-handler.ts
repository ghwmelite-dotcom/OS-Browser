import { app, BrowserWindow } from 'electron';

export function initCertHandler(mainWindow: BrowserWindow): void {
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    try {
      const hostname = new URL(url).hostname;

      // Allow *.gov.gh and *.mil.gh domains with cert issues
      // These government sites sometimes have certificate problems
      if (hostname.endsWith('.gov.gh') || hostname.endsWith('.mil.gh') || hostname.endsWith('.edu.gh')) {
        event.preventDefault();
        callback(true); // Allow despite cert error

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

      // For all other domains, block and notify
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
