const fs = require('fs');
let code = fs.readFileSync('components/LandingPage.tsx', 'utf8');

const target = `            <p className="text-sm font-bold text-gray-500 mb-6">
              Pesos Colombianos / {isAnnual ? 'año' : 'mes'}
            </p>`;
const replacement = `            <p className="text-sm font-bold text-gray-500 mb-6">
              Pesos Colombianos / {isAnnual ? 'año' : 'mes'}
            </p>
            {isAnnual && (
                <div className="mb-6 -mt-4">
                  <span className="bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-lg">
                    ¡Ahorras $99.800! (2 Meses Gratis)
                  </span>
                </div>
            )}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/LandingPage.tsx', code);
    console.log("REPLACED: LandingPage.tsx pricing copy");
} else {
    console.log("TARGET NOT FOUND: LandingPage.tsx pricing copy");
}
