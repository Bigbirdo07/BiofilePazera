from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:5173/"

def click_text_button(page, text):
    page.evaluate("""text => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text)?.click()""", text)

def load_accession(page, accession):
    page.goto(URL, wait_until="networkidle")
    page.get_by_text("Protein Studio", exact=True).first.click()
    click_text_button(page, "UniProt")
    page.locator("input").first.fill(accession)
    click_text_button(page, "Fetch Structure")
    if accession == "P04637":
        page.get_by_text("393 aa", exact=True).wait_for(timeout=120000)
    else:
        page.get_by_text(accession, exact=True).last.wait_for(timeout=120000)
    page.wait_for_timeout(5000)

def open_evidence(page):
    page.evaluate("""() => {
        const matches = [...document.querySelectorAll('button')].filter((button) => {
            const rect = button.getBoundingClientRect();
            return button.textContent.trim().toLowerCase() === 'evidence' && rect.width > 0 && rect.height > 0;
        });
        matches.at(-1)?.click();
    }""")
    page.wait_for_timeout(12000)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))

    load_accession(page, "P04637")
    open_evidence(page)
    page.get_by_text("Experimental Structural Evidence", exact=True).wait_for(timeout=120000)
    page.wait_for_timeout(30000)
    page.get_by_text("1TSR", exact=True).first.wait_for(timeout=90000)
    page.evaluate("""() => { const id = [...document.querySelectorAll('*')].find(node => node.textContent.trim() === '1TSR'); const card = id?.closest('div.rounded-lg'); const button = [...(card?.querySelectorAll('button') || [])].find(item => item.textContent.trim() === 'Compare with AlphaFold' && !item.disabled); button?.click(); }""")
    page.get_by_text("AlphaFold ↔ Experimental Comparison", exact=True).wait_for(timeout=90000)
    p53 = page.get_by_text("AlphaFold ↔ Experimental Comparison", exact=True).locator("xpath=ancestor::section[1]").inner_text()
    print("P04637 browser", {"coverage":"94-312 / 393 aa" in p53, "pairs":"196" in p53, "rmsd":"1.05 Å" in p53, "disclaimer":"does not measure accuracy" in p53})
    page.screenshot(path="/tmp/protein-studio-p04637-comparison.png", full_page=True)

    load_accession(page, "P0DTC9")
    open_evidence(page)
    page.get_by_role("button", name="Compare with AlphaFold", exact=True).first.wait_for(timeout=90000)
    page.route("**/files.rcsb.org/download/**", lambda route: route.abort())
    page.evaluate("""() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Compare with AlphaFold' && !button.disabled)?.click()""")
    page.get_by_text("Comparison unavailable:", exact=False).wait_for(timeout=30000)
    body = page.locator("body").inner_text()
    print("comparison network failure", {"local_error":"Comparison unavailable:" in body, "all_tabs":all(label in body for label in ["Structure", "Biology", "Confidence", "Evidence", "Sequence", "Mutation"])})
    print("browser_errors", errors)
    browser.close()
