const fs = require('fs');
let serverFile = fs.readFileSync('server.ts', 'utf8');

serverFile = serverFile.replace('`userPlan` (EMPRENDE|CRECE|EMPRESA) y `userRole`', '\\`userPlan\\` (EMPRENDE|CRECE|EMPRESA) y \\`userRole\\`');

fs.writeFileSync('server.ts', serverFile);
console.log('Fixed backticks');
