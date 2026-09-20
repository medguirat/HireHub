from companies.proxym import scrape_proxym
import json


company = scrape_proxym()

with open(
    "output/company.json",
    "w",
    encoding="utf-8"
) as file:
    
    json.dump(
        company,
        file,
        indent = 4,
        ensure_ascii = False  
    )

print("Donnees de l'entreprise enregistrées dans le fichier company.json")