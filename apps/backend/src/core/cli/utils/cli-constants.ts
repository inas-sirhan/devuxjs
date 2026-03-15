import path from 'path';


const __dirname = import.meta.dirname;

export const BACKEND_SRC_PATH = path.join(__dirname, '..', '..', '..');
export const TEMPLATES_PATH = path.join(__dirname, '..', 'templates');
export const SHARED_PATH = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'packages', 'shared');
