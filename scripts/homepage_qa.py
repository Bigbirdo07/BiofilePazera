from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:5173/"

with sync_playwright() as p:
    browser = p.chromium.launch()
    desktop = browser.new_page(viewport={"width": 1440, "height": 900})
    desktop.goto(URL, wait_until="networkidle")
    desktop.screenshot(path="/tmp/biofile-home-desktop.png", full_page=True)
    desktop.get_by_role("link", name="See how it works").click()
    desktop.wait_for_timeout(300)
    print("desktop", {"hero": desktop.get_by_role("heading", name="Understand your protein sequence in context.").count() == 1, "workflow_anchor": desktop.url.endswith("#how-it-works"), "preview": desktop.get_by_text("Illustrative preview · not a live result", exact=True).count() >= 1, "overflow": desktop.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")})
    desktop.get_by_role("button", name="Open Protein Studio").first.click()
    print("protein_route", "Protein Studio" in desktop.locator("body").inner_text()[:500])

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    mobile.goto(URL, wait_until="networkidle")
    mobile.screenshot(path="/tmp/biofile-home-mobile.png", full_page=True)
    offenders = mobile.evaluate("""() => [...document.querySelectorAll('*')].filter(el => el.scrollWidth > el.clientWidth + 1).slice(0, 8).map(el => ({tag: el.tagName, cls: el.className, width: el.scrollWidth, client: el.clientWidth}))""")
    print("mobile", {"hero": mobile.get_by_role("heading", name="Understand your protein sequence in context.").count() == 1, "workflow": mobile.get_by_text("What happens to your sequence?", exact=True).count() == 1, "content_overflow": mobile.locator("main").last.evaluate("el => el.scrollWidth > el.clientWidth"), "cta_visible": mobile.get_by_role("button", name="Open Protein Studio").first.is_visible(), "offenders": offenders})
    browser.close()
