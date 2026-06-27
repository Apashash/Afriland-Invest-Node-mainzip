#!/bin/bash
# Script de déploiement Plesk
# À configurer dans Plesk > Node.js > "Run Node.js commands" après chaque git pull

set -e

echo "📦 Installation des dépendances..."
npm install

echo "🔨 Build du client React..."
npm run build:client

echo "⚡ Bundle du serveur Express..."
npm run build:server

echo "✅ Build terminé — dist/index.cjs prêt"
