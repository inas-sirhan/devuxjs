import { spawn, exec } from 'child_process';

const portArg = process.argv[2];
const PORT = portArg !== undefined ? portArg : 5050;
const URL = `http://127.0.0.1:${PORT}`;

const child = spawn('scalar', ['document', 'serve', './api/openapi.json', '-p', String(PORT), '-w'], {
    stdio: 'inherit',
    shell: true
});

child.on('spawn', () => {
    setTimeout(() => exec(`open-cli ${URL}`), 1000);
});
