import socket

import httpx
import pytest

from company import scraper
from company.extract import merge_pages
from company.scraper import ScrapeError, normalize_url, pick_extra_pages, scrape_company

HOME_EN = """<!doctype html><html><head>
<title>Home | Acme Software</title>
<meta property="og:site_name" content="Acme Software">
<meta name="description" content="Acme builds banking software for African and European banks.">
<script type="application/ld+json">{"@context": "https://schema.org", "@graph": [
  {"@type": "WebSite", "name": "Acme website"},
  {"@type": "Organization", "name": "Acme Software", "foundingDate": "2006-03-01",
   "logo": {"@type": "ImageObject", "url": "/img/acme-logo.png"},
   "telephone": "+216 73 000 000",
   "address": {"@type": "PostalAddress", "addressLocality": "Sousse", "addressCountry": "Tunisia"},
   "sameAs": ["https://www.linkedin.com/company/acme-software", "https://twitter.com/acme"]}]}
</script></head><body>
<nav><a href="/en/about-us">About us</a> <a href="/contact">Contact</a> <a href="/blog/post-1">Blog</a>
<a href="https://other.example.org/about">Partner</a> <a href="/brochure.pdf">About (PDF)</a></nav>
<p>We ship Java and Spring Boot platforms on Kubernetes, with React front ends.</p>
<a href="https://www.facebook.com/sharer/sharer.php?u=x">Share</a>
<a href="https://www.facebook.com/acmesoftware">Facebook</a>
</body></html>"""

ABOUT_EN = """<html><body>
<h2>Our mission</h2><p>Help banks launch digital products in weeks, not years.</p>
<h2>Our vision</h2><p>Every bank in Africa runs on modern, open software.</p>
<h2>Our values</h2><ul><li>Innovation</li><li>Commitment</li><li>Transparency</li></ul>
<h2>Team</h2><p>More than 250 employees across our offices.</p>
</body></html>"""

CONTACT_EN = """<html><body><a href="tel:+21673000111">Call</a>
<iframe src="https://www.google.com/maps/embed?pb=acme"></iframe></body></html>"""

HOME_FR = """<html><head><meta name="description" content="Éditeur de logiciels RH à Tunis."></head>
<body><header><img src="/static/logo-rh.svg" alt="RH Soft"></header>
<h2>Notre mission</h2><p>Simplifier la gestion des talents pour les PME.</p>
<h3>Nos valeurs : exigence, bienveillance et transparence</h3>
<p>Fondée en 2012, notre équipe de 45 collaborateurs développe en Python et Django.
Notre siège social est situé à Tunis, Tunisie.</p>
<a href="https://www.instagram.com/rhsoft/">Instagram</a>
<a href="https://maps.app.goo.gl/abc123">Plan d'accès</a>
</body></html>"""

BARE = "<html><head><title>Welcome</title></head><body><p>Coming soon.</p></body></html>"


def test_extracts_what_an_english_site_states():
    fields = merge_pages([("https://acme.example.com/", HOME_EN),
                          ("https://acme.example.com/en/about-us", ABOUT_EN),
                          ("https://acme.example.com/contact", CONTACT_EN)])
    assert fields["companyName"] == "Acme Software"
    assert fields["description"] == "Acme builds banking software for African and European banks."
    assert fields["logo"] == "https://acme.example.com/img/acme-logo.png"
    assert fields["foundedYear"] == 2006
    assert fields["headquarters"] == "Sousse, Tunisia"
    assert fields["phone"] == "+216 73 000 000"  # structured data wins over the contact page link
    assert fields["linkedin"] == "https://www.linkedin.com/company/acme-software"
    assert fields["twitter"] == "https://twitter.com/acme"
    assert fields["facebook"] == "https://www.facebook.com/acmesoftware"  # not the share button
    assert fields["mission"] == "Help banks launch digital products in weeks, not years."
    assert fields["vision"] == "Every bank in Africa runs on modern, open software."
    assert fields["companyValues"] == "Innovation, Commitment, Transparency"
    assert fields["companySize"] == "250 employees"
    assert fields["googleMapsUrl"].startswith("https://www.google.com/maps")
    for tech in ("Java", "Spring Boot", "Kubernetes", "React"):
        assert tech in fields["technologies"]


def test_extracts_what_a_french_site_states():
    fields = merge_pages([("https://rhsoft.example.tn/", HOME_FR)])
    assert fields["description"] == "Éditeur de logiciels RH à Tunis."
    assert fields["logo"] == "https://rhsoft.example.tn/static/logo-rh.svg"
    assert fields["mission"] == "Simplifier la gestion des talents pour les PME."
    assert fields["companyValues"] == "exigence, bienveillance et transparence"
    assert fields["foundedYear"] == 2012
    assert fields["companySize"] == "45 collaborateurs"
    assert fields["headquarters"] == "Tunis, Tunisie"
    assert fields["instagram"] == "https://www.instagram.com/rhsoft/"
    assert fields["googleMapsUrl"] == "https://maps.app.goo.gl/abc123"
    assert "Python" in fields["technologies"] and "Django" in fields["technologies"]


def test_never_invents_fields_a_site_does_not_state():
    fields = merge_pages([("https://empty.example.com/", BARE)])
    assert fields == {}  # not even the <title>: "Welcome" isn't a company name
    english = merge_pages([("https://acme.example.com/", HOME_EN)])
    for missing in ("industry", "companyType", "vision", "offices", "instagram"):
        assert missing not in english


def test_a_passing_mention_of_vision_is_not_a_vision_statement():
    html = "<html><body><p>We have a vision for banking and a mission to deliver.</p></body></html>"
    fields = merge_pages([("https://acme.example.com/", html)])
    assert "vision" not in fields and "mission" not in fields


def test_the_swift_banking_network_is_not_a_technology():
    html = "<html><body><p>Our platform connects to SWIFT and runs on Java.</p></body></html>"
    assert merge_pages([("https://bank.example.com/", html)])["technologies"] == "Java"


def test_picks_same_site_about_and_contact_pages_only():
    picked = pick_extra_pages(HOME_EN, "https://acme.example.com/")
    assert picked == ["https://acme.example.com/en/about-us", "https://acme.example.com/contact"]


@pytest.mark.parametrize("raw, expected", [
    ("acme.example.com", "https://acme.example.com"),
    ("  https://acme.example.com/about#team ", "https://acme.example.com/about"),
    ("http://acme.example.com", "http://acme.example.com"),
])
def test_normalizes_urls(raw, expected):
    assert normalize_url(raw) == expected


@pytest.mark.parametrize("raw", ["", "ftp://acme.example.com", "javascript:alert(1)", "https://user:pw@acme.com",
                                 "https://localhost", "https://acme.example.com:8081", "https://" + "a" * 2050])
def test_rejects_invalid_urls(raw):
    with pytest.raises(ScrapeError) as err:
        normalize_url(raw)
    assert err.value.code == "invalid_url"


def _resolve_to(ip):
    return lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 0))]


@pytest.mark.parametrize("ip", ["127.0.0.1", "10.0.0.5", "192.168.1.10", "169.254.169.254", "0.0.0.0"])
def test_refuses_hosts_on_private_networks(monkeypatch, ip):
    monkeypatch.setattr(socket, "getaddrinfo", _resolve_to(ip))
    with pytest.raises(ScrapeError) as err:
        scrape_company("https://intranet.example.com")
    assert err.value.code == "blocked_host"


def _site(routes):
    def handler(request):
        route = routes.get(request.url.path)
        if route is None:
            return httpx.Response(404, text="not found")
        return route(request) if callable(route) else httpx.Response(200, text=route,
                                                                     headers={"content-type": "text/html"})
    return httpx.MockTransport(handler)


def test_scrapes_homepage_and_about_pages(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", _resolve_to("93.184.216.34"))
    transport = _site({"/": HOME_EN, "/en/about-us": ABOUT_EN, "/contact": CONTACT_EN})
    result = scrape_company("acme.example.com", transport=transport)
    assert result["url"] == "https://acme.example.com"
    assert result["pages"] == ["https://acme.example.com", "https://acme.example.com/en/about-us",
                               "https://acme.example.com/contact"]
    assert result["fields"]["mission"].startswith("Help banks")


def test_a_redirect_to_a_private_address_is_refused(monkeypatch):
    def resolve(host, *args, **kwargs):
        return _resolve_to("10.0.0.1" if host == "internal.example.com" else "93.184.216.34")()
    monkeypatch.setattr(socket, "getaddrinfo", resolve)
    transport = _site({"/": lambda r: httpx.Response(302, headers={"location": "https://internal.example.com/"})})
    with pytest.raises(ScrapeError) as err:
        scrape_company("https://acme.example.com", transport=transport)
    assert err.value.code == "blocked_host"


def test_a_broken_about_page_does_not_fail_the_import(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", _resolve_to("93.184.216.34"))
    transport = _site({"/": HOME_EN, "/contact": CONTACT_EN})  # /en/about-us is a 404
    result = scrape_company("https://acme.example.com", transport=transport)
    assert result["fields"]["companyName"] == "Acme Software"
    assert "mission" not in result["fields"]


@pytest.mark.parametrize("response, code", [
    (httpx.Response(500, text="boom"), "http_error"),
    (httpx.Response(200, content=b"%PDF-1.4", headers={"content-type": "application/pdf"}), "not_html"),
])
def test_homepage_failures_are_reported(monkeypatch, response, code):
    monkeypatch.setattr(socket, "getaddrinfo", _resolve_to("93.184.216.34"))
    with pytest.raises(ScrapeError) as err:
        scrape_company("https://acme.example.com", transport=_site({"/": lambda r: response}))
    assert err.value.code == code


def test_unreachable_and_slow_sites_are_reported(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", _resolve_to("93.184.216.34"))

    def refuse(request):
        raise httpx.ConnectError("connection refused")

    def slow(request):
        raise httpx.ReadTimeout("too slow")

    for handler, code in ((refuse, "unreachable"), (slow, "timeout")):
        with pytest.raises(ScrapeError) as err:
            scrape_company("https://acme.example.com", transport=httpx.MockTransport(handler))
        assert err.value.code == code


def test_unknown_domain_is_reported(monkeypatch):
    def fail(*args, **kwargs):
        raise socket.gaierror("no such host")
    monkeypatch.setattr(socket, "getaddrinfo", fail)
    with pytest.raises(ScrapeError) as err:
        scrape_company("https://does-not-exist.example.com")
    assert err.value.code == "unreachable"


def test_endpoint_returns_422_with_a_message_for_bad_urls():
    from fastapi.testclient import TestClient
    import main

    client = TestClient(main.app)  # no lifespan: the model isn't needed here
    response = client.post("/company/profile", json={"url": "ftp://acme.example.com"})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_url"


def test_endpoint_returns_the_fields(monkeypatch):
    from fastapi.testclient import TestClient
    import main

    monkeypatch.setattr(main, "scrape_company", lambda url: {"url": url, "fields": {"companyName": "Acme"},
                                                             "pages": [url]})
    response = TestClient(main.app).post("/company/profile", json={"url": "https://acme.example.com"})
    assert response.status_code == 200
    assert response.json()["fields"] == {"companyName": "Acme"}
