"""Turns a company's web pages into recruiter-profile fields.

Pure functions over HTML (no network), so they can be tested with fixtures.
Rule: a field is only filled with text found on the site. Anything that isn't
stated there (industry, company type, ...) stays empty for the recruiter to fill.
"""

import json
import re
from datetime import date
from urllib.parse import unquote, urljoin, urlparse

from bs4 import BeautifulSoup

from matching.parsing import extract_skills
from matching.taxonomy import SKILLS

FIELDS = (
    "companyName", "description", "logo", "foundedYear", "mission", "vision", "companyValues",
    "googleMapsUrl", "headquarters", "offices", "companySize", "technologies", "phone",
    "linkedin", "facebook", "instagram", "twitter",
)

MAX_TEXT = 1000
MAX_SECTION = 600
MAX_TECHNOLOGIES = 20

# Skills from the matching taxonomy that are not technologies a company "uses".
_NON_TECH_SKILLS = {
    "agile", "scrum", "jira", "project management", "team management", "uml", "seo",
    "digital marketing", "content writing", "crm", "accounting", "financial analysis",
    "recruitment", "payroll", "customer support", "sales", "excel", "statistics",
    "data analysis", "data visualization", "manual testing", "istqb", "unit testing",
    "test automation", "ui/ux", "photoshop", "illustrator", "adobe xd", "figma",
    # Ambiguous on a company website: SWIFT is also the banking network.
    "swift",
}

_ORG_TYPES = {"organization", "corporation", "localbusiness", "professionalservice", "company", "ngo",
              "educationalorganization", "governmentorganization", "onlinebusiness"}

_HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"]
_SECTION_PATTERNS = {
    "mission": re.compile(r"^(?:our|the|notre|la)?\s*missions?\b", re.I),
    "vision": re.compile(r"^(?:our|the|notre|la)?\s*vision\b", re.I),
    "companyValues": re.compile(r"^(?:our|the|nos|les)?\s*(?:core\s+)?(?:values|valeurs)\b", re.I),
}

_FOUNDED_RE = re.compile(
    r"\b(?:founded|established|created|fond[ée]e?|cr[ée]{2}e?)\s+(?:in|en)\s+((?:18|19|20)\d{2})\b", re.I)
_SIZE_RE = re.compile(
    r"(?<![\d.,])(\d{1,3}(?:[ ,.  ]\d{3})*|\d+)\s*(\+?)\s*"
    r"(employees|employ[ée]s|collaborateurs|collaborators|salari[ée]s)\b", re.I)
_HQ_RE = re.compile(
    r"(?:headquartered\s+in|headquarters\s*(?:is\s+|are\s+)?(?:in|:)|head\s+office\s*(?:in|:)|"
    r"si[èe]ge\s+social\s*(?:est\s+)?(?:situ[ée]\s+)?(?:à|a|:))\s*"
    r"([A-ZÀ-Ý][\wÀ-ÿ'\-]+(?:[ \-][A-ZÀ-Ý][\wÀ-ÿ'\-]+)*(?:,\s*[A-ZÀ-Ý][\wÀ-ÿ'\-]+(?:[ \-][A-ZÀ-Ý][\wÀ-ÿ'\-]+)*)?)")

_SOCIAL_HOSTS = {
    "linkedin": ("linkedin.com",),
    "facebook": ("facebook.com", "fb.com"),
    "instagram": ("instagram.com",),
    "twitter": ("twitter.com", "x.com"),
}
# Share buttons point at the social network, not at the company's own page.
_SHARE_MARKERS = ("sharer", "share", "intent/", "sharearticle", "/dialog/", "plugins/")
_MAPS_MARKERS = ("google.com/maps", "maps.google.", "goo.gl/maps", "maps.app.goo.gl")


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def truncate(text, limit):
    text = clean(text)
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    return cut[:end + 1] if end > limit // 2 else cut.rsplit(" ", 1)[0] + "…"


def _host(url):
    host = (urlparse(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def _is_host(url, domains):
    host = _host(url)
    return any(host == d or host.endswith("." + d) for d in domains)


def _http_url(value, base):
    if not isinstance(value, str) or not value.strip():
        return ""
    absolute = urljoin(base, value.strip())
    return absolute if urlparse(absolute).scheme in ("http", "https") else ""


# ---------------------------------------------------------------------------
# Structured data (JSON-LD, meta tags)
# ---------------------------------------------------------------------------

def _json_ld_objects(soup):
    objects = []
    for script in soup.find_all("script", attrs={"type": re.compile(r"ld\+json", re.I)}):
        try:
            data = json.loads(script.string or script.get_text() or "")
        except (ValueError, TypeError):
            continue
        stack = [data]
        while stack:
            item = stack.pop()
            if isinstance(item, list):
                stack.extend(item)
            elif isinstance(item, dict):
                objects.append(item)
                if "@graph" in item:
                    stack.append(item["@graph"])
    return objects


def _types(obj):
    t = obj.get("@type", [])
    return {x.lower() for x in (t if isinstance(t, list) else [t]) if isinstance(x, str)}


def _as_text(value):
    if isinstance(value, dict):
        value = value.get("url") or value.get("@id") or value.get("name") or ""
    if isinstance(value, list):
        value = value[0] if value else ""
    return value if isinstance(value, str) else ("" if value is None else str(value))


def _address_text(address):
    if isinstance(address, list):
        address = address[0] if address else None
    if isinstance(address, str):
        return clean(address)
    if not isinstance(address, dict):
        return ""
    country = address.get("addressCountry")
    if isinstance(country, dict):
        country = country.get("name")
    parts = [address.get("addressLocality"), address.get("addressRegion"), country]
    return ", ".join(clean(str(p)) for p in parts if p and clean(str(p)))


def _employees_text(value):
    if isinstance(value, dict):
        if value.get("value") is not None:
            return f"{value['value']} employees"
        low, high = value.get("minValue"), value.get("maxValue")
        if low is not None and high is not None:
            return f"{low}-{high} employees"
        if low is not None:
            return f"{low}+ employees"
        return ""
    if isinstance(value, (int, float)) or (isinstance(value, str) and value.strip()):
        return f"{value} employees"
    return ""


def _from_json_ld(soup, base):
    out = {}
    for obj in _json_ld_objects(soup):
        if not (_types(obj) & _ORG_TYPES):
            continue
        out.setdefault("companyName", clean(_as_text(obj.get("name"))))
        out.setdefault("description", truncate(_as_text(obj.get("description")), MAX_TEXT))
        out.setdefault("logo", _http_url(_as_text(obj.get("logo")), base))
        founded = re.search(r"(18|19|20)\d{2}", _as_text(obj.get("foundingDate")))
        if founded:
            out.setdefault("foundedYear", int(founded.group(0)))
        out.setdefault("phone", clean(_as_text(obj.get("telephone"))))
        out.setdefault("headquarters", _address_text(obj.get("address")))
        out.setdefault("companySize", _employees_text(obj.get("numberOfEmployees")))
        locations = obj.get("location")
        if isinstance(locations, list) and len(locations) > 1:
            names = [_address_text(loc.get("address", loc)) if isinstance(loc, dict) else clean(str(loc))
                     for loc in locations]
            out.setdefault("offices", ", ".join(n for n in names if n))
        same_as = obj.get("sameAs") or []
        for link in same_as if isinstance(same_as, list) else [same_as]:
            _add_social(out, _http_url(_as_text(link), base))
    return {k: v for k, v in out.items() if v}


def _meta(soup, **attrs):
    tag = soup.find("meta", attrs=attrs)
    return clean(tag.get("content")) if tag and tag.get("content") else ""


# ---------------------------------------------------------------------------
# Links, logo, phone
# ---------------------------------------------------------------------------

def _add_social(out, url):
    if not url:
        return
    lower = url.lower()
    if any(marker in lower for marker in _SHARE_MARKERS):
        return
    for field, domains in _SOCIAL_HOSTS.items():
        if field not in out and _is_host(url, domains) and urlparse(url).path.strip("/"):
            out[field] = url
            return


def _from_links(soup, base):
    out = {}
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().startswith("tel:") and "phone" not in out:
            phone = clean(unquote(href[4:]))
            if re.search(r"\d{6,}", re.sub(r"\D", "", phone)):
                out["phone"] = phone
            continue
        url = _http_url(href, base)
        if not url:
            continue
        if "googleMapsUrl" not in out and any(m in url.lower() for m in _MAPS_MARKERS):
            out["googleMapsUrl"] = url
        _add_social(out, url)
    if "googleMapsUrl" not in out:
        for frame in soup.find_all("iframe", src=True):
            url = _http_url(frame["src"], base)
            if any(m in url.lower() for m in _MAPS_MARKERS):
                out["googleMapsUrl"] = url
                break
    return out


def _logo(soup, base):
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or ""
        hints = " ".join([src, img.get("alt") or "", " ".join(img.get("class") or []), img.get("id") or ""])
        if "logo" in hints.lower():
            url = _http_url(src, base)
            if url:
                return url
    link = soup.find("link", rel=lambda r: r and "apple-touch-icon" in " ".join(r).lower())
    return _http_url(link.get("href"), base) if link else ""


# ---------------------------------------------------------------------------
# Sections (mission, vision, values) and free-text facts
# ---------------------------------------------------------------------------

def _section_text(heading):
    """Text right under a heading, up to the next heading."""
    parts, items, length = [], [], 0
    for node in heading.find_all_next(string=True):
        if heading in node.parents:
            continue
        parent = node.parent
        if parent.name in _HEADINGS or parent.find_parent(_HEADINGS) is not None:
            break
        if parent.name in ("script", "style", "noscript") or parent.find_parent(["nav", "footer"]) is not None:
            continue
        text = clean(node)
        if not text:
            continue
        li = parent if parent.name == "li" else parent.find_parent("li")
        if li is not None:
            items.append(text)
        else:
            parts.append(text)
        length += len(text)
        if length > MAX_SECTION:
            break
    return parts, items


def _sections(soup):
    out = {}
    for heading in soup.find_all(_HEADINGS):
        title = clean(heading.get_text(" "))
        if not title or len(title) > 80:
            continue
        for field, pattern in _SECTION_PATTERNS.items():
            if field in out or not pattern.match(title):
                continue
            inline = re.split(r"\s*[:–—-]\s+", title, maxsplit=1)
            parts, items = _section_text(heading)
            if field == "companyValues" and items:
                value = ", ".join(dict.fromkeys(items))
            elif len(inline) == 2 and len(inline[1]) > 15:
                value = inline[1]
            else:
                value = " ".join(parts + items)
            value = truncate(value, MAX_SECTION)
            if len(value) >= 3:
                out[field] = value
    return out


def _from_text(text):
    out = {}
    founded = _FOUNDED_RE.search(text)
    if founded and 1800 <= int(founded.group(1)) <= date.today().year:
        out["foundedYear"] = int(founded.group(1))
    size = _SIZE_RE.search(text)
    if size:
        out["companySize"] = f"{size.group(1)}{size.group(2)} {size.group(3).lower()}"
    hq = _HQ_RE.search(text)
    if hq:
        out["headquarters"] = clean(hq.group(1))
    return out


def page_text(soup):
    for tag in soup(["script", "style", "noscript", "template"]):
        tag.decompose()
    return clean(soup.get_text(" "))


def technologies(text):
    keys = [k for k in extract_skills(text) if k not in _NON_TECH_SKILLS]
    return ", ".join(sorted({SKILLS[k].display for k in keys}, key=str.lower)[:MAX_TECHNOLOGIES])


# ---------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------

def extract_page(html, url):
    """Every field this single page states, keyed like the recruiter profile."""
    soup = BeautifulSoup(html, "html.parser")
    fields = _from_json_ld(soup, url)
    fallbacks = {
        "companyName": _meta(soup, property="og:site_name") or _meta(soup, name="application-name"),
        "description": truncate(_meta(soup, property="og:description") or _meta(soup, name="description"),
                                MAX_TEXT),
        "logo": _logo(soup, url),
    }
    for source in (fallbacks, _from_links(soup, url), _sections(soup)):
        for key, value in source.items():
            if value and key not in fields:
                fields[key] = value
    text = page_text(soup)
    for key, value in _from_text(text).items():
        fields.setdefault(key, value)
    return fields, text


def merge_pages(pages):
    """pages: [(url, html)], homepage first. First page that states a field wins."""
    merged, texts = {}, []
    for url, html in pages:
        fields, text = extract_page(html, url)
        texts.append(text)
        for key, value in fields.items():
            merged.setdefault(key, value)
    techs = technologies(" \n ".join(texts))
    if techs:
        merged["technologies"] = techs
    return {k: v for k, v in merged.items() if k in FIELDS and v not in ("", None)}
