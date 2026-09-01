# 📚 CDI — IUT de Nantes | Planning, Salaires & Fréquentation

Application web collaborative dédiée aux moniteurs du CDI de l'**IUT de Nantes** (Noah & Lucas) pour gérer leurs créneaux de permanences, calculer leurs rémunérations mensuelles et suivre les statistiques de fréquentation des étudiants.

---

## ✨ Fonctionnalités Principales

### 1. 📅 Planning & Permanences
- **Vue Calendrier (Mois & Semaine)** avec code couleur distinct pour chaque moniteur.
- **Ajout ultra-rapide des heures** : Raccourci *"Demain + Après-demain"*, créneaux midi types (*12h30 - 13h30*).
- **Note automatique** : Pré-remplie par défaut avec *« Permanence accueil CDI »*.
- **Détection des conflits** : Alerte instantanée en cas de chevauchement d'horaires.

### 2. 📊 Suivi de la Fréquentation des Étudiants
- **Saisie simple du nombre d'entrées** : Bouton rapide ou modal dédiée pour enregistrer le nombre d'étudiants venus pendant chaque permanence.
- **Graphiques & Statistiques d'affluence** :
  - Total d'étudiants accueillis dans le mois.
  - Moyenne de fréquentation par permanence.
  - Record / pic d'affluence mensuel.
  - Histogramme interactif jour par jour.
  - Fréquentation par jour de la semaine (Mardi vs Jeudi, etc.).
  - Comparatif du volume d'étudiants reçus par Noah vs Lucas.

### 3. 💰 Calculateur de Salaires
- Décompte exact des heures travaillées.
- Calcul automatique du salaire estimé selon le taux horaire de monitorat (**9,55 €/h**).
- Relevé d'heures complet avec **export en PDF officiel** et **Excel / CSV** incluant les statistiques de fréquentation.

---

## ☁️ Déploiement Gratuit sur GitHub Pages & Supabase Cloud

L'application est prête pour un hébergement gratuit, sans maintenance et 100% stable sur **GitHub Pages** avec une base de données cloud temps réel **Supabase**.

### Étape 1 : Créer la base de données Supabase (Gratuit)
1. Rendez-vous sur [Supabase](https://app.supabase.com) et créez un projet gratuit (ex: `cdi-iut-nantes`).
2. Allez dans le menu **SQL Editor**, ouvrez le fichier [`supabase_schema.sql`](./supabase_schema.sql) situé à la racine du projet, collez son contenu et cliquez sur **Run**.
3. Récupérez votre **Project URL** et votre **Clé Publique (anon key)** dans *Project Settings → API*.

### Étape 2 : Connecter l'application
- Ouvrez l'application, cliquez sur l'engrenage **Paramètres ⚙️ → Base Supabase Cloud**, collez vos 2 identifiants et cliquez sur **Enregistrer**.
- Les données de Noah et Lucas sont désormais synchronisées en direct sur tous les PC et téléphones !

### Étape 3 : Héberger sur GitHub Pages
1. Créez un dépôt sur GitHub et poussez votre code :
   ```bash
   git init
   git add .
   git commit -m "CDI IUT Nantes Dashboard"
   git remote add origin https://github.com/VOTRE_PSEUDO/cdi-nantes.git
   git push -u origin main
   ```
2. Dans les paramètres de votre dépôt GitHub (**Settings → Pages**) :
   - Sous **Build and deployment → Source**, sélectionnez **GitHub Actions**.
3. Le site se déploie automatiquement sur `https://VOTRE_PSEUDO.github.io/cdi-nantes/` !

---

## 💻 Démarrage en Local

```bash
# Lancer le serveur local et le frontend
npm run dev
```
Accès : **http://localhost:3000**
