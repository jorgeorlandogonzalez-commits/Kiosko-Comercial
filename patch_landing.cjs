const fs = require('fs');
let code = fs.readFileSync('components/LandingPage.tsx', 'utf8');

const heroTarget = `<PosPreview />
        </div>`;
const heroReplacement = `<PosPreview />
          <div className="mt-8 flex justify-center w-full">
            <a href="/demo" className="inline-flex items-center gap-2 bg-white text-brand-black border-2 border-gray-200 px-8 py-4 rounded-xl font-bold text-lg hover:border-brand-red hover:shadow-md transition-all active:scale-95 text-center">
              👉 Tócalo sin registrarte
            </a>
          </div>
        </div>`;

if (code.includes(heroTarget)) {
  code = code.replace(heroTarget, heroReplacement);
}

const footerTarget = `<div className="flex items-center gap-6 text-sm font-bold text-gray-500">
            <button onClick={onTerminosClick}`;
const footerReplacement = `<div className="flex flex-wrap justify-center md:justify-end items-center gap-6 text-sm font-bold text-gray-500">
            <a href="/demo" className="hover:text-brand-red transition-colors">Tienda de ejemplo</a>
            <a href="/testimonios" className="hover:text-brand-red transition-colors">Testimonios</a>
            <button onClick={onTerminosClick}`;

if (code.includes(footerTarget)) {
  code = code.replace(footerTarget, footerReplacement);
}

fs.writeFileSync('components/LandingPage.tsx', code);
console.log("Patched LandingPage.tsx");
