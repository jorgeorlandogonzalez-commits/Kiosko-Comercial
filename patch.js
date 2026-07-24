const fs = require('fs');
let code = fs.readFileSync('server.cloudrun.ts', 'utf8');
code = code.replace(/    } catch \(error\) {\n      req\.body = {};\n    }\n  }\n  next\(\);\n}\);/g, "    } catch (error) {\n      req.body = {};\n    }\n    next();\n});");
fs.writeFileSync('server.cloudrun.ts', code);
