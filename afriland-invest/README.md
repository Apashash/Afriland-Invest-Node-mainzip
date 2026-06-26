# GIFETAL PRO

Plateforme d'investissement pour l'Afrique de l'Ouest — React + Node.js

## Déploiement sur Plesk (via GitHub)

### 1. Configuration de la base de données Supabase

1. Allez sur [supabase.com](https://supabase.com), créez un projet
2. Dans SQL Editor, exécutez le fichier `server/schema.sql`
3. Copiez l'URL de connexion : `Settings > Database > Connection string > URI`

### 2. Variables d'environnement dans Plesk

Dans Plesk > Node.js > Environment Variables, ajoutez :

```
DATABASE_URL=postgresql://postgres:VOTREPASSWORD@db.XXXXXXXX.supabase.co:5432/postgres
JWT_SECRET=un_secret_tres_long_et_aleatoire_ici
PORT=3000
NODE_ENV=production
```

### 3. Déploiement dans Plesk

1. Connectez votre repo GitHub dans Plesk > Git
2. Faites un **Pull** depuis GitHub
3. Cliquez sur **Deploy Now**
4. Cliquez sur **Restart**

L'application démarre automatiquement avec `node server/index.js`.  
Le client React est déjà buildé dans `client/dist/` — **aucun build nécessaire dans Plesk**.

> ✅ **Le projet est livré déjà buildé.** Le dossier `client/dist/` est versionné
> dans le dépôt et reconstruit automatiquement avant chaque commit (hook git local),
> sans aucune commande à taper de votre part. **Aucune automatisation ne pousse de
> code à votre place** : c'est vous qui faites le push sur GitHub.
>
> Votre flux : **vous poussez sur GitHub → Pull dans Plesk → Deploy Now → Restart.**
> Plesk ne build jamais, il sert directement la dernière version de l'interface.

### 4. Compte administrateur

Inscrivez-vous normalement, puis dans Supabase SQL Editor :
```sql
UPDATE utilisateurs SET role = 'admin' WHERE telephone = 'VOTRE_NUMERO';
```

## Structure du projet

```
afriland-invest/
├── server/
│   ├── index.js          # Point d'entrée Express
│   ├── db.js             # Connexion PostgreSQL
│   ├── middleware/auth.js # JWT middleware
│   ├── routes/           # Routes API
│   └── schema.sql        # Schéma base de données
├── client/
│   ├── src/              # Source React
│   └── dist/             # Build pré-compilé (servi par Express)
├── uploads/              # Photos uploadées
├── package.json          # Dépendances serveur
└── .env.example          # Variables d'environnement
```

## Développement local

```bash
# 1. Copier les variables d'environnement
cp .env.example .env
# Modifier .env avec vos coordonnées Supabase

# 2. Installer les dépendances
npm install
cd client && npm install && cd ..

# 3. Lancer le serveur
npm start

# 4. Pour développer le client (dans un second terminal)
cd client && npm run dev
```

## Commandes Plesk

- **Start application** : `node server/index.js`
- **Node.js version** : 18+
