from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:5173/"


def click_tab(page, label):
    page.evaluate("""label => {
        const buttons = [...document.querySelectorAll('button')].filter(button => {
            const rect = button.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && button.textContent.trim().toLowerCase() === label.toLowerCase();
        });
        buttons.at(-1)?.click();
    }""", label)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(URL, wait_until="networkidle")
    page.get_by_text("Protein Studio", exact=True).first.click()
    page.get_by_role("button", name="UniProt", exact=True).click()
    page.locator("input").first.fill("P0DTC9")
    page.get_by_role("button", name="Fetch Structure", exact=True).click()
    page.get_by_text("419 aa", exact=True).wait_for(timeout=120000)
    page.wait_for_timeout(6000)
    click_tab(page, "Evidence")
    compare = page.get_by_role("button", name="Compare with AlphaFold", exact=True).first
    compare.wait_for(timeout=120000)
    for _ in range(60):
        if compare.is_enabled():
            break
        page.wait_for_timeout(1000)
    print("compare enabled", compare.is_enabled())
    def block_comparison_request(route):
        if "files.rcsb.org/download/" in route.request.url:
            route.abort()
        else:
            route.continue_()
    page.route("**/*", block_comparison_request)
    compare.click()
    page.get_by_text("Comparison unavailable:", exact=False).wait_for(timeout=30000)
    body = page.locator("body").inner_text()
    local_error = "Comparison unavailable:" in body
    network_wording = any(word in body.lower() for word in ["rcsb", "request failed", "network"])
    tabs = {}
    for label in ["Structure", "Confidence", "Biology", "Evidence", "Sequence", "Mutation"]:
        click_tab(page, label)
        page.wait_for_timeout(300)
        tabs[label] = page.locator("body").inner_text().find(label) >= 0
    click_tab(page, "Structure")
    page.wait_for_timeout(500)
    local_structure = page.locator("canvas").count() > 0 and "419 aa" in page.locator("body").inner_text()
    page.unroute("**/*", block_comparison_request)
    click_tab(page, "Evidence")
    retry = page.get_by_role("button", name="Compare with AlphaFold", exact=True).first
    retry.wait_for(timeout=30000)
    retry.click()
    page.get_by_text("AlphaFold ↔ Experimental Comparison", exact=True).wait_for(timeout=90000)
    print("comparison network failure", {"local_error": local_error, "network_wording": network_wording, "local_structure": local_structure, "tabs_usable": tabs, "retry_success": True})
    browser.close()
