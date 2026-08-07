const fs = require('fs');

let serverFile = fs.readFileSync('server.ts', 'utf8');

serverFile = serverFile.replace(/\`userPlan\`/g, "'userPlan'");
serverFile = serverFile.replace(/\`userRole\`/g, "'userRole'");

fs.writeFileSync('server.ts', serverFile);
