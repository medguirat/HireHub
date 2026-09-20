# 📍 Où écrire le code et comment tout lancer — guide pas à pas

Ce guide part du principe que tu n'as **rien** encore sur ton ordinateur pour ce projet. On va installer les outils, créer les dossiers, placer les fichiers, et lancer le tout, une commande à la fois.

Tous les fichiers dont tu as besoin sont **déjà écrits** dans ce dossier `ai-service/` :
```
ai-service/
├── requirements.txt        <- liste des librairies à installer
├── skill_extractor.py      <- extraction des compétences
├── job_classifier.py       <- classification du poste
├── experience_detector.py  <- détection du niveau d'expérience
├── cv_matcher.py           <- comparaison CV / offre (le plus avancé)
├── main.py                 <- assemble tout et crée l'API web
└── README.md                <- ce guide
```

Tu n'as qu'à **télécharger ce dossier tel quel** et le placer où tu veux sur ton ordinateur (ex: `Documents/HireHub/ai-service`). Pas besoin de recopier le code à la main.

---

## Étape 1 — Installer un éditeur de code (si tu n'en as pas déjà un)

Télécharge et installe **Visual Studio Code** (gratuit) : [https://code.visualstudio.com](https://code.visualstudio.com)

C'est l'endroit où tu vas **voir et modifier** tes fichiers. C'est différent du terminal (où tu vas **exécuter** des commandes) — on utilise les deux, je précise à chaque fois lequel.

## Étape 2 — Installer Python (si pas déjà fait)

Va sur [https://www.python.org/downloads/](https://www.python.org/downloads/) et installe la dernière version (3.11 ou plus).

⚠️ **Sur Windows**, pendant l'installation, coche bien la case **"Add Python to PATH"** en bas de la première fenêtre d'installation — sinon les commandes ne fonctionneront pas dans le terminal.

Pour vérifier que c'est bien installé, ouvre un terminal (voir Étape 3) et tape :
```bash
python3 --version
```
(Sur Windows, essaie `python --version` si `python3` ne fonctionne pas.)

Tu dois voir apparaître un numéro de version comme `Python 3.11.5`. Si tu as un message d'erreur, réinstalle Python en cochant bien la case PATH.

## Étape 3 — Ouvrir un terminal DANS VS Code (c'est le plus simple)

1. Ouvre VS Code.
2. Menu **File → Open Folder...** (ou **Fichier → Ouvrir le dossier...**)
3. Sélectionne le dossier `ai-service` que tu as téléchargé/placé sur ton ordinateur.
4. Une fois le dossier ouvert, tu dois voir la liste de tes fichiers (`main.py`, `skill_extractor.py`, etc.) dans le panneau de gauche.
5. Ouvre un terminal intégré : menu **Terminal → New Terminal** (ou raccourci **Ctrl + `** — la touche avec l'accent grave, en haut à gauche du clavier, à côté du "1").

Un terminal s'ouvre **en bas de VS Code**, déjà positionné dans le bon dossier. C'est ici que tu vas taper **toutes** les commandes de ce guide, une par une, en appuyant sur Entrée après chacune.

## Étape 4 — Créer un environnement virtuel

Dans le terminal que tu viens d'ouvrir, tape :

```bash
python3 -m venv venv
```

Rien ne s'affiche si ça marche — c'est normal, ça crée juste un nouveau dossier `venv/` (tu peux le voir apparaître dans le panneau de gauche de VS Code).

Ensuite, **active** cet environnement :

**Sur Mac ou Linux :**
```bash
source venv/bin/activate
```

**Sur Windows (PowerShell) :**
```bash
venv\Scripts\Activate.ps1
```

**Sur Windows (invite de commandes classique / cmd) :**
```bash
venv\Scripts\activate.bat
```

✅ Tu sais que ça a marché quand tu vois `(venv)` apparaître au tout début de la ligne dans ton terminal, avant le reste du texte.

⚠️ Si Windows te bloque avec une erreur du type "l'exécution de scripts est désactivée sur ce système", tape cette commande une fois puis réessaie l'activation :
```bash
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Étape 5 — Installer les librairies nécessaires

Toujours dans le même terminal (avec `(venv)` affiché), tape :

```bash
pip install -r requirements.txt
```

Ça va télécharger et installer plusieurs librairies — ça peut prendre 2 à 5 minutes selon ta connexion, c'est normal (notamment `sentence-transformers` qui est plus lourd).

Ensuite, installe le modèle de langue pour spaCy :

```bash
python -m spacy download en_core_web_sm
```

## Étape 6 — Tester un premier fichier, sans API, juste pour voir que ça marche

Dans le terminal :

```bash
python skill_extractor.py
```

Tu dois voir s'afficher :
```
Compétences trouvées : ['docker', 'postgresql', 'python', 'react', 'rest api', 'sql']
```

🎉 Si tu vois ça, tout fonctionne ! Essaie aussi :
```bash
python job_classifier.py
python experience_detector.py
```

Chacun de ces fichiers a un petit exemple intégré tout en bas (dans le bloc `if __name__ == "__main__":`) qui s'exécute automatiquement quand tu lances le fichier directement comme ça.

## Étape 7 — Tester le module le plus avancé (comparaison CV/offre)

```bash
python cv_matcher.py
```

⏳ La toute première fois, ça va être plus lent (10-30 secondes) car le programme télécharge le modèle d'IA pré-entraîné (~80 Mo) depuis Internet. Les fois suivantes, ce sera quasi instantané car il est mis en cache sur ton ordinateur.

Tu dois voir apparaître un score de compatibilité et une liste de compétences manquantes.

## Étape 8 — Lancer l'API complète

Maintenant qu'on sait que chaque brique fonctionne indépendamment, on lance le serveur qui les assemble toutes :

```bash
uvicorn main:app --reload --port 8000
```

Tu dois voir dans le terminal quelque chose comme :
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Laisse ce terminal ouvert** — c'est ton serveur qui tourne. Tant que tu ne fermes pas ce terminal (ou que tu ne fais pas Ctrl+C), l'API reste disponible.

## Étape 9 — Tester l'API dans ton navigateur (sans écrire de code !)

Ouvre ton navigateur web et va sur :
```
http://localhost:8000/docs
```

Tu vas voir une page interactive générée automatiquement, avec tes deux endpoints (`/analyze/offer` et `/analyze/match`). Pour tester :

1. Clique sur `/analyze/offer` pour déplier.
2. Clique sur le bouton **"Try it out"**.
3. Un exemple de texte JSON apparaît, modifiable — laisse-le tel quel ou change le contenu.
4. Clique sur **"Execute"** (bouton bleu).
5. Plus bas, tu verras la réponse du serveur (compétences détectées, catégorie, niveau).

Si tu vois une réponse JSON avec des vraies données, **bravo, ton API IA fonctionne de bout en bout** 🎉

---

## En résumé — les commandes dans l'ordre, à copier-coller une par une

```bash
# 1. Se placer dans le dossier du projet (déjà fait si tu as ouvert le dossier dans VS Code)

# 2. Créer l'environnement virtuel
python3 -m venv venv

# 3. L'activer (choisis la ligne selon ton système)
source venv/bin/activate        # Mac/Linux
venv\Scripts\Activate.ps1       # Windows PowerShell

# 4. Installer les librairies
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# 5. Tester chaque brique
python skill_extractor.py
python job_classifier.py
python experience_detector.py
python cv_matcher.py

# 6. Lancer l'API
uvicorn main:app --reload --port 8000

# 7. Ouvrir dans le navigateur
# http://localhost:8000/docs
```

---

## Si quelque chose ne marche pas

- **"command not found: python3"** → Python n'est pas installé ou pas dans le PATH. Réinstalle en cochant la case PATH (Windows) ou vérifie l'installation (Mac).
- **"No module named fastapi"** → tu as sûrement oublié d'activer le venv (`(venv)` doit être visible dans le terminal) avant de lancer `python main.py` ou `uvicorn`.
- **Le téléchargement du modèle reste bloqué très longtemps** → vérifie ta connexion Internet, ou relance simplement la commande.
- **Un message d'erreur en rouge que tu ne comprends pas** → copie-colle-le moi intégralement (le texte complet de l'erreur), c'est la meilleure façon que je t'aide précisément.

À chaque étape, si un résultat ne correspond pas à ce que ce guide annonce, arrête-toi là et dis-moi exactement ce que tu vois — ne continue pas en espérant que ça se résolve tout seul plus loin.
