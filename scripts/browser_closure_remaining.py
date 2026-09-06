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


def load_accession(page, accession):
    page.goto(URL, wait_until="networkidle")
    page.get_by_text("Protein Studio", exact=True).first.click()
    page.get_by_role("button", name="UniProt", exact=True).click()
    page.locator("input").first.fill(accession)
    page.get_by_role("button", name="Fetch Structure", exact=True).click()
    page.get_by_text("419 aa" if accession == "P0DTC9" else "393 aa", exact=True).wait_for(timeout=120000)
    page.wait_for_timeout(6000)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    load_accession(page, "P0DTC9")
    click_tab(page, "Evidence")
    page.get_by_role("button", name="Compare with AlphaFold", exact=True).first.wait_for(timeout=120000)
    page.get_by_role("button", name="Compare with AlphaFold", exact=True).first.click()
    page.get_by_text("AlphaFold ↔ Experimental Comparison", exact=True).wait_for(timeout=120000)
    page.wait_for_timeout(5000)
    comparison = page.get_by_text("AlphaFold ↔ Experimental Comparison", exact=True).locator("xpath=ancestor::section[1]")
    points = comparison.locator("div.h-36 button")
    point_count = points.count()
    print("comparison points", point_count)
    for index in [0, point_count // 2, point_count - 1]:
        points.nth(index).click()
        page.wait_for_timeout(500)
        inspector = page.get_by_text("Residue Inspector", exact=True).locator("xpath=ancestor::section[1]").inner_text()
        print("matched selection", index, inspector.replace("\n", " | "))

    click_tab(page, "Sequence")
    page.locator("button[title^='Residue 210:']").click()
    click_tab(page, "Structure")
    page.wait_for_timeout(500)
    out_body = page.locator("body").inner_text()
    print("out of coverage", {
        "canonical_210": "CANONICAL POSITION\n210" in out_body,
        "not_represented": "PDB author chain: Not represented · PDB author residue: Not represented" in out_body,
        "no_displacement": "Cα displacement after superposition" not in page.get_by_text("Residue Inspector", exact=True).locator("xpath=ancestor::section[1]").inner_text(),
    })

    points.nth(0).click()
    page.wait_for_timeout(300)
    inspector_a = page.get_by_text("Residue Inspector", exact=True).locator("xpath=ancestor::section[1]").inner_text()
    page.screenshot(path="/tmp/protein-studio-p0dtc9-residue-highlight.png", full_page=True)
    summary_a = comparison.inner_text()
    comparison.locator("select").select_option("B")
    page.wait_for_timeout(700)
    inspector_b = page.get_by_text("Residue Inspector", exact=True).locator("xpath=ancestor::section[1]").inner_text()
    summary_b = comparison.inner_text()
    print("chain remap", {
        "canonical_preserved": "CANONICAL POSITION\n48" in inspector_a and "CANONICAL POSITION\n48" in inspector_b,
        "chain_a": "PDB author chain: A" in inspector_a,
        "chain_b": "PDB author chain: B" in inspector_b,
        "pair_count_changed": "MATCHED Cα PAIRS\n121" in summary_a and "MATCHED Cα PAIRS\n126" in summary_b,
        "rmsd_changed": "0.92 Å" in summary_a and "1.15 Å" in summary_b,
    })

    page.get_by_role("button", name="Exit Comparison", exact=True).click()
    page.wait_for_timeout(1500)
    print("exit", {"comparison_gone": not page.get_by_text("AlphaFold ↔ Experimental Comparison", exact=True).count()})
    browser.close()
