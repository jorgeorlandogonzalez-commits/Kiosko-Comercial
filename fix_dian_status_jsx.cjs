const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

code = code.replace(
  `    </div>
      {/* Floating Action Bar */}`,
  `      {/* Floating Action Bar */}
`
);

// We need to add the closing div back before the closing parenthesis.
code = code.replace(
  `      )}
  );
};`,
  `      )}
    </div>
  );
};`
);

fs.writeFileSync('components/DianStatus.tsx', code);
