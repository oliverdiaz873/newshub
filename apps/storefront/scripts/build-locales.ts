/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * BUILD LOCALES PIPELINE
 * ----------------------
 * Genera los archivos de localización (i18n) fusionando los namespaces UI de
 * `src/i18n/locales/{locale}/*.json` en `messages/{locale}.json`.
 *
 * F10.0 decoupled: el contenido editorial (títulos, summaries, categorías)
 * viene de PostgreSQL/API ya resuelto por locale. Este pipeline YA NO genera
 * el overlay `data.*` desde `src/data`; conserva la clave `data` vacía para
 * no romper la forma de los mensajes consumidos por next-intl.
 *
 * Ubicación: scripts/build-locales.ts
 * Uso: npm run build:locales
 */

import fs from 'fs';
import path from 'path';

const compileMergedMessages = (locale: string, dataObject: any) => {
  const sourceLocalesDir = path.join(process.cwd(), 'src', 'i18n', 'locales', locale);
  const targetMessagesDir = path.join(process.cwd(), 'messages');

  if (!fs.existsSync(targetMessagesDir)) {
    fs.mkdirSync(targetMessagesDir, { recursive: true });
  }

  const merged: Record<string, any> = {
    data: dataObject
  };

  if (fs.existsSync(sourceLocalesDir)) {
    fs.readdirSync(sourceLocalesDir).forEach(file => {
      if (file.endsWith('.json')) {
        const ns = path.basename(file, '.json');
        try {
          const content = JSON.parse(fs.readFileSync(path.join(sourceLocalesDir, file), 'utf-8'));
          merged[ns] = content;
        } catch (e) {
          console.error(`Error parsing source message file ${file}:`, e);
        }
      }
    });
  }

  const targetPath = path.join(targetMessagesDir, `${locale}.json`);
  fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`Compiled and merged next-intl messages to ${targetPath}`);
};

const emptyData = {
  articles: {} as Record<string, any>,
  categories: {} as Record<string, any>,
};

compileMergedMessages('es', emptyData);
compileMergedMessages('en', emptyData);
