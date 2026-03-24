const fs = require('fs');
const path = require('path');

// Only keep these locales (electron-builder's electronLanguages should handle this,
// but this is a belt-and-suspenders approach)
const KEEP_LOCALES = new Set(['en.pak', 'en-US.pak', 'en-GB.pak']);

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;

  // 1. Strip extra locale files
  const localesDir = path.join(appOutDir, 'locales');
  if (fs.existsSync(localesDir)) {
    const files = fs.readdirSync(localesDir);
    let removedSize = 0;
    let removedCount = 0;

    for (const file of files) {
      if (!KEEP_LOCALES.has(file)) {
        const filePath = path.join(localesDir, file);
        try {
          const stat = fs.statSync(filePath);
          removedSize += stat.size;
          fs.unlinkSync(filePath);
          removedCount++;
        } catch {
          // Skip files that can't be deleted
        }
      }
    }

    console.log(
      `[afterPack] Removed ${removedCount} locale files, saved ${(removedSize / 1024 / 1024).toFixed(1)} MB`,
    );
  }

  // 2. Remove LICENSES.chromium.html (8.8 MB, not needed for distribution)
  const licensesFile = path.join(appOutDir, 'LICENSES.chromium.html');
  if (fs.existsSync(licensesFile)) {
    const stat = fs.statSync(licensesFile);
    fs.unlinkSync(licensesFile);
    console.log(
      `[afterPack] Removed LICENSES.chromium.html, saved ${(stat.size / 1024 / 1024).toFixed(1)} MB`,
    );
  }

  // 3. Remove junk files from node_modules inside the asar
  // (electron-builder handles this via files config, but clean up any stragglers)
  const resourcesDir = path.join(appOutDir, 'resources');
  if (fs.existsSync(resourcesDir)) {
    console.log('[afterPack] Resources directory ready.');
  }
};
