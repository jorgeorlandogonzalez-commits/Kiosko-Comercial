const fs = require('fs');
const file = 'components/LoginModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      if (additionalInfo?.isNewUser) {
          try {
              const batch = writeBatch(db);
              
              // 1. Initial Products
              const INITIAL_PRODUCTS = [
                { id: '1', name: 'Arroz Libra', cost: 1800, price: 2500, taxRate: 0, category: 'Abarrotes', stock: 50, icon: '🍚', ean: '7701001' },
                { id: '2', name: 'Gaseosa 1.5L', cost: 3200, price: 4500, taxRate: 19, category: 'Bebidas', stock: 24, icon: '🥤', ean: '7701002' },
              ];
              INITIAL_PRODUCTS.forEach(p => {
                  batch.set(doc(db, \`users/\${user.uid}/products/\${p.id}\`), p);
              });

              // 2. Initial Customers
              const INITIAL_CUSTOMERS = [
                { nit: '222222222222', name: 'Consumidor Final', address: 'Local', phone: '' },
              ];
              batch.set(doc(db, \`users/\${user.uid}/data/customers\`), { items: INITIAL_CUSTOMERS });

              // 3. Initial Suppliers
              const INITIAL_SUPPLIERS = [
                  { nit: '800111222', name: 'Distribuidora Central', contactName: 'Carlos Vendedor' },
              ];
              batch.set(doc(db, \`users/\${user.uid}/data/suppliers\`), { items: INITIAL_SUPPLIERS });

              // 4. Initial Categories
              const INITIAL_CATEGORIES = ['General', 'Abarrotes', 'Bebidas', 'Licores', 'Fruver', 'Lácteos', 'Aseo'];
              batch.set(doc(db, \`users/\${user.uid}/data/categories\`), { items: INITIAL_CATEGORIES });
              
              await batch.commit();
          } catch(err) {
              console.error("Error setting up new user data", err);
          }
      }`;

content = content.replace('const user = result.user;', replacement);
fs.writeFileSync(file, content);
