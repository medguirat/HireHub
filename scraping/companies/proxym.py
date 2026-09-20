import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

def get_internal_links(soup, base_url):

    links = []

    for a in soup.find_all("a", href=True):

        url = urljoin(base_url, a["href"])

        domain = urlparse(url).netloc

        if domain == urlparse(base_url).netloc:
            links.append(url)

    return list(set(links))


def scrape_proxym():

    url = "https://www.proxym-it.com"

    response = requests.get(url)

    soup = BeautifulSoup(response.text, "html.parser")


    pages = get_internal_links(soup, url)

    all_text = soup.get_text(
        " ",
        strip=True
    ).lower()


    for page in pages:

        try:

            response = requests.get(page)

            page_soup = BeautifulSoup(
                response.text,
                "html.parser"
            )

            all_text += page_soup.get_text(
                " ",
                strip=True
            ).lower()

        except:

            pass


    # Nom de l'entreprise
    name = soup.title.string if soup.title else "Proxym"


    # Description
    description = soup.find(
        "meta",
        attrs={"name": "description"}
    )

    if description:
        description = description["content"]
    else:
        description = ""


    # Logo
    logo = ""

    for image in soup.find_all("img"):

        src = image.get("src")

        if src and "logo-proxym" in src.lower():
            logo = src
            break




    # Réseaux sociaux
    social_media = {}

    for link in soup.find_all("a"):

        href = link.get("href")

        if href:

            if "linkedin.com" in href:
                social_media["linkedin"] = href

            elif "facebook.com" in href:
                social_media["facebook"] = href

            elif "instagram.com" in href:
                social_media["instagram"] = href

            elif "twitter.com" in href:
                social_media["twitter"] = href



    googleMapsUrl = ""

    for link in soup.find_all("a", href=True):

        href = link["href"]

        if "google.com/maps" in href:
            googleMapsUrl = href
            break


    text = all_text




    technologies = []

    possible_techs = [

        "java",
        "spring",
        "angular",
        "react",
        "python",
        "django",
        "sql",
        "mysql",
        "postgresql",
        "mongodb",
        "docker",
        "kubernetes",
        "aws",
        "azure",
        "cloud",
        "ai",
        "machine learning",
        "devops"

    ]

    for possible_tech in possible_techs:
        if possible_tech in text:
            technologies.append(possible_tech)      

    technologies = ", ".join(technologies)





    mission = ""

    keywords_mission = [
        "mission",
        "our mission",
        "we help",
        "help financial",
        "digital transformation"
    ]

    for keyword in keywords_mission:
        if keyword in text:
            mission = keyword
            break





    vision = ""

    if "vision" in text:
        vision = "Become a digital leader"
    


    company_values = ""

    values_keywords = [
        "innovation",
        "agility",
        "excellence",
        "commitment"
    ]

    found_values = []

    for value in values_keywords:
        if value in text:
            found_values.append(value)

    company_values = ", ".join(found_values)




    company_size = ""

    sizes = [
        "10-50",
        "50-200",
        "200-500",
        "500+",
        "employees"
    ]

    for size in sizes:
        if size in text:
            company_size = size
            break





    headquarters = ""
    offices = ""

    locations = [
        "sousse",
        "tunis",
        "paris",
        "dubai"
    ]

    found_locations = []

    for location in locations:
        if location in text:
            found_locations.append(location)


    if found_locations:

        headquarters = "Sousse, Tunisia"

        other_locations = []

        for loc in found_locations:
            if loc not in ["sousse", "tunis"]:
                other_locations.append(loc)

        if other_locations:
            offices = ", ".join(other_locations)


    company = {

    "companyName": "Proxym",
    "description": description,
    "website": url,
    "logo": logo,

    "foundedYear": 2006,
    "industry": "IT - FinTech",

    "mission": mission,
    "vision": vision,
    "companyValues": company_values,

    "googleMapsUrl": googleMapsUrl,
    "headquarters": headquarters,
    "offices": offices,

    "companySize": company_size,
    "companyType": "Software Company",
    "technologies": technologies,

    "linkedin": social_media.get("linkedin", ""),
    "facebook": social_media.get("facebook", ""),
    "instagram": social_media.get("instagram", ""),
    "twitter": social_media.get("twitter", "")

}

    print("\n===== TEXTE DE LA PAGE =====\n")
    print(soup.get_text())


    return company
