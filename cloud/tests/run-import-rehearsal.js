// Synthetic local IndexedDB only. No gateway or selected personal files.
import { rehearsal } from '../../tests/cloud-importer.test.js';
console.log(JSON.stringify(await rehearsal(),null,2));
