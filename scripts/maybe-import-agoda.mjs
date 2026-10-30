if (process.env.IMPORT_AGODA !== '1') {
  console.log('skip agoda import (IMPORT_AGODA!=1)');
  process.exit(0);
}
await import('./import-agoda-korea.mjs');
