const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

// Fix lucide-react import
code = code.replace(/import \{.*?\} from 'lucide-react';/, "import { CheckCircle, XCircle, Clock, FileText, Download, Filter, RefreshCw, AlertCircle, Save, Edit3 } from 'lucide-react';");

// Fix item.total
code = code.replace(/\$ \$\{item\.total\.toLocaleString\(\)\}/g, "$ ${ (item.price * item.quantity).toLocaleString() }");
// Wait, the template string was `\$${item.total.toLocaleString()}`
code = code.replace(/item\.total\.toLocaleString\(\)/g, "(item.price * item.quantity).toLocaleString()");

fs.writeFileSync('components/DianStatus.tsx', code);
console.log('Fixed DianStatus.tsx TS errors');
