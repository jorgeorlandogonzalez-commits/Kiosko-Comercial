const fs = require('fs');
const file = 'MainApp.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(`  const handleDeleteExpense = (id: string) => {
      const updated = dbService.deleteExpense(id);
      setExpenses(updated);
  };
  };`, `  const handleDeleteExpense = (id: string) => {
      const updated = dbService.deleteExpense(id);
      setExpenses(updated);
  };`);

fs.writeFileSync(file, content);
