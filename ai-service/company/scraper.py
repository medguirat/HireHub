"""Fetches a company's website (homepage + a few "about"/"contact" pages).

Everything is bounded so a slow or hostile site can't hang or exhaust the service:
only public http(s) hosts (no localhost / private network, checked on every
redirect), small page and redirect limits, per-request timeouts and an overall
time budget.
"""

import ipaddress
import logging
import os
import re
import socket
import time
from urllib.parse import urldefrag, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from company.extract import merge_pages

log = logging.getLogger("hirehub.company")

USER_AGENT = "HireHubBot/1.0 (company profile import; +https://github.com/hirehub)"
MAX_URL_LENGTH = 2048
MAX_PAGE_BYTES = 2 * 1024 * 1024
MAX_REDIRECTS = 5
MAX_EXTRA_PAGES = 4
CONNECT_TIMEOUT = 5.0
READ_TIMEOUT = 10.0
TOTAL_BUDGET_SECONDS = 25.0

_INTERESTING_PAGE = re.compile(
    r"about|a-propos|apropos|qui-sommes|who-we-are|company|entreprise|societe|soci%c3%a9t%c3%a9|"
    r"contact|mission|values|valeurs|presentation|notre-histoire|our-story", re.I)
_SKIP_EXTENSIONS = re.compile(r"\.(pdf|jpe?g|png|gif|svg|webp|zip|docx?|xlsx?|pptx?|mp4|mp3)$", re.I)


class ScrapeError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def _allow_private():
    # Only for local tests against a server on 127.0.0.1; never set in production.
    return os.getenv("COMPANY_SCRAPER_ALLOW_PRIVATE") == "1"


def normalize_url(raw):
    """Validated absolute http(s) URL, or ScrapeError("invalid_url")."""
    url = (raw or "").strip()
    if not url:
        raise ScrapeError("invalid_url", "Please enter your company's website address.")
    if len(url) > MAX_URL_LENGTH:
        raise ScrapeError("invalid_url", "This website address is too long.")
    if not re.match(r"^[a-z][a-z0-9+.-]*://", url, re.I):
        url = "https://" + url
    parsed = urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise ScrapeError("invalid_url", "The website address must start with http:// or https://.")
    if parsed.username or parsed.password:
        raise ScrapeError("invalid_url", "The website address can't contain a username or password.")
    host = parsed.hostname or ""
    try:
        port = parsed.port
    except ValueError:
        raise ScrapeError("invalid_url", "This website address isn't valid.") from None
    if not host or (("." not in host) and not _allow_private()):
        raise ScrapeError("invalid_url", "This website address isn't valid.")
    if port not in (None, 80, 443) and not _allow_private():
        raise ScrapeError("invalid_url", "Only standard web ports are supported.")
    return urldefrag(url)[0]


def check_public_host(url):
    """Refuses hosts that resolve to loopback, private, link-local or reserved addresses."""
    if _allow_private():
        return
    host = urlparse(url).hostname
    try:
        infos = socket.getaddrinfo(host, None)
    except (socket.gaierror, UnicodeError):
        raise ScrapeError("unreachable", "We couldn't find this website. Please check the address.") from None
    for info in infos:
        address = ipaddress.ip_address(info[4][0].split("%")[0])
        if not address.is_global:
            raise ScrapeError("blocked_host", "This address points to a private network and can't be imported.")


def _fetch(client, url, deadline):
    """(final_url, html) of one page, following redirects by hand so each hop is checked."""
    for _ in range(MAX_REDIRECTS + 1):
        if time.monotonic() > deadline:
            raise ScrapeError("timeout", "The website took too long to respond.")
        check_public_host(url)
        with client.stream("GET", url) as response:
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    raise ScrapeError("http_error", "The website returned an invalid redirect.")
                url = normalize_url(urljoin(url, location))
                continue
            if response.status_code >= 400:
                raise ScrapeError("http_error", f"The website answered with an error (HTTP {response.status_code}).")
            content_type = response.headers.get("content-type", "").lower()
            if "html" not in content_type:
                raise ScrapeError("not_html", "This address doesn't point to a web page.")
            body = bytearray()
            for chunk in response.iter_bytes():
                body.extend(chunk)
                if len(body) > MAX_PAGE_BYTES:
                    break
            encoding = response.encoding or "utf-8"
            return url, bytes(body[:MAX_PAGE_BYTES]).decode(encoding, errors="replace")
    raise ScrapeError("http_error", "The website redirects too many times.")


def _same_site(a, b):
    def strip(h):
        h = (h or "").lower()
        return h[4:] if h.startswith("www.") else h
    return strip(urlparse(a).hostname) == strip(urlparse(b).hostname)


def pick_extra_pages(html, base_url, limit=MAX_EXTRA_PAGES):
    """Same-site links that look like about/contact pages, best first."""
    soup = BeautifulSoup(html, "html.parser")
    seen, picked = {urldefrag(base_url)[0].rstrip("/")}, []
    for a in soup.find_all("a", href=True):
        url = urldefrag(urljoin(base_url, a["href"].strip()))[0]
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not _same_site(url, base_url):
            continue
        if _SKIP_EXTENSIONS.search(parsed.path) or url.rstrip("/") in seen:
            continue
        label = f"{parsed.path} {a.get_text(' ', strip=True)}"
        if _INTERESTING_PAGE.search(label):
            seen.add(url.rstrip("/"))
            picked.append(url)
        if len(picked) >= limit:
            break
    return picked


def scrape_company(raw_url, transport=None):
    """{"url": final homepage url, "fields": {...}, "pages": [...]} or ScrapeError."""
    url = normalize_url(raw_url)
    deadline = time.monotonic() + TOTAL_BUDGET_SECONDS
    timeout = httpx.Timeout(READ_TIMEOUT, connect=CONNECT_TIMEOUT)
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml",
               "Accept-Language": "en, fr;q=0.9"}
    with httpx.Client(timeout=timeout, headers=headers, follow_redirects=False, transport=transport) as client:
        try:
            home_url, home_html = _fetch(client, url, deadline)
        except httpx.TimeoutException:
            raise ScrapeError("timeout", "The website took too long to respond.") from None
        except httpx.HTTPError as exc:
            log.info("Company scrape of %s failed: %s", url, exc)
            raise ScrapeError("unreachable", "We couldn't reach this website. Please check the address.") from None
        pages = [(home_url, home_html)]
        for extra in pick_extra_pages(home_html, home_url):
            if time.monotonic() > deadline:
                break
            try:
                pages.append(_fetch(client, extra, deadline))
            except (ScrapeError, httpx.HTTPError) as exc:
                log.info("Skipping %s: %s", extra, exc)
    return {"url": home_url, "fields": merge_pages(pages), "pages": [p[0] for p in pages]}
