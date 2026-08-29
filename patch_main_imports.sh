#!/bin/bash
sed -i 's/import { Navbar } from ".\/components\/Navbar";/import { Sidebar } from ".\/components\/Sidebar";\nimport { HubVentas, HubInventario, HubDian, HubNumeros } from ".\/components\/Hubs";\nimport { Customers } from ".\/components\/Customers";\nimport { Menu, Sparkles } from "lucide-react";/g' /app/applet/MainApp.tsx
