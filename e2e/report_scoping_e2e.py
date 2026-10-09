"""
End-to-end check: overdue report and recurring schedule counts stay scoped per login.

For every account it signs in, then verifies:
  * top-bar "N overdue reports" == Report Register "Overdue (N)" tab == Overdue KPI card
  * manager Dashboard "Reports attention" == the same N
  * Recurring Settings tab badge == "Total (N)" filter pill == rows in the table
  * a customer success engineer sees only her own name in the engineer picker,
    only her own rows in the Recurring Settings table

Accounts (never commit credentials). For each NAME in E2E_ACCOUNTS (default
"MANAGER,ISHA,LAXMI") provide either
  E2E_<NAME>_EMAIL + E2E_<NAME>_PASSWORD   -> signs in through the login form
  E2E_<NAME>_SESSION=/path/session.json   -> restores a saved session
  E2E_<NAME>_ROLE=manager|engineer (MANAGER defaults to manager, others engineer)

Run:  python3 e2e/report_scoping_e2e.py      (app must be running; E2E_BASE_URL, default http://localhost:8080)
"""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright, Page

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
SHOTS = os.environ.get("E2E_SHOTS", "/tmp/e2e-report-scoping")
failures: list[str] = []


def check(name: str, cond: bool, detail: str):
    print(("  PASS " if cond else "  FAIL ") + f"{name}: {detail}")
    if not cond:
        failures.append(f"{name}: {detail}")


def num(text: str) -> int:
    m = re.search(r"(\d+)", text or "")
    if not m:
        raise AssertionError(f"no number in {text!r}")
    return int(m.group(1))


async def kpi(page: Page, label: str) -> int:
    """Value of a KPI card whose caption matches label (case-insensitive)."""
    txt = await page.evaluate(
        """(label) => {
          const el = [...document.querySelectorAll('main *')].find(
            (e) => e.children.length === 0 && e.textContent.trim().toLowerCase() === label.toLowerCase());
          return el ? el.parentElement.textContent.slice(el.textContent.length) : null;
        }""",
        label,
    )
    if txt is None:
        raise AssertionError(f"KPI '{label}' not found")
    return num(txt)


async def sign_in(context, page: Page, name: str):
    session = os.environ.get(f"E2E_{name}_SESSION")
    if session:
        m = json.load(open(os.path.expanduser(session)))
        cookies = m.get("cookies") or []
        for c in cookies:
            c["url"] = BASE
        if cookies:
            await context.add_cookies(cookies)
        await page.goto(f"{BASE}/auth")
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(m['storage_key'])}, {json.dumps(json.dumps(m['session']))})"
        )
        await page.goto(f"{BASE}/")
    else:
        email = os.environ[f"E2E_{name}_EMAIL"]
        password = os.environ[f"E2E_{name}_PASSWORD"]
        await page.goto(f"{BASE}/auth")
        await page.locator('input[type="email"]').fill(email)
        await page.locator('input[autocomplete="current-password"]').fill(password)
        await page.locator('button[type="submit"]').click()
    await page.locator("header a[href*='timing=overdue']").first.wait_for(timeout=30000)
    await page.wait_for_timeout(3000)  # let the cloud data finish loading


async def run_account(browser, name: str):
    role = os.environ.get(f"E2E_{name}_ROLE", "manager" if name == "MANAGER" else "engineer")
    print(f"\n== {name} ({role})")
    context = await browser.new_context(viewport={"width": 1280, "height": 1800})
    page = await context.new_page()
    try:
        await sign_in(context, page, name)
        pill = page.locator("header a[href*='timing=overdue']").last
        top = num(await pill.inner_text())
        me = (await page.locator("header").last.inner_text())
        print(f"  top bar: {top} overdue")

        # Dashboard
        if role == "manager":
            check("dashboard", await kpi(page, "Reports attention") == top, f"Reports attention == top bar ({top})")
        await page.screenshot(path=f"{SHOTS}/{name}_dashboard.png")

        # Report Register (opened from the pill, Overdue filter active)
        await pill.click()
        await page.get_by_role("button", name=re.compile(r"^Overdue \(\d+\)$")).wait_for(timeout=15000)
        await page.wait_for_timeout(1000)
        tab = num(await page.get_by_role("button", name=re.compile(r"^Overdue \(\d+\)$")).inner_text())
        check("register tab", tab == top, f"Overdue ({tab}) == top bar ({top})")
        check("register KPI", await kpi(page, "Overdue") == top, f"Overdue card == top bar ({top})")
        eng_select = page.locator("main select").filter(has=page.locator("option", has_text="All engineers")).first
        options = [o.strip() for o in await eng_select.locator("option").all_inner_texts() if o.strip() != "All engineers"]
        if role == "engineer":
            check("register scope", len(options) == 1 and options[0] in me, f"engineer picker only lists self: {options}")
        else:
            check("register scope", len(options) >= 2, f"manager picker lists the team: {options}")
        await page.screenshot(path=f"{SHOTS}/{name}_register.png")

        # Recurring Settings
        rec_tab = page.get_by_role("button", name=re.compile(r"^Recurring Settings"))
        badge = num(await rec_tab.inner_text())
        await rec_tab.click()
        total_pill = page.get_by_role("button", name=re.compile(r"^Total \(\d+\)$")).last
        await total_pill.wait_for(timeout=10000)
        pill_n = num(await total_pill.inner_text())
        rows = page.locator("main table tbody tr")
        row_n = await rows.count()
        check("recurring badge", badge == pill_n, f"tab badge ({badge}) == Total filter ({pill_n})")
        check("recurring rows", row_n == pill_n, f"table rows ({row_n}) == Total filter ({pill_n})")
        if role == "engineer" and row_n:
            names = set(await rows.locator("td:nth-child(4)").all_inner_texts())
            check("recurring scope", len(names) == 1 and next(iter(names)) in me, f"only own schedules: {sorted(names)}")
        await page.screenshot(path=f"{SHOTS}/{name}_recurring.png")
    except Exception as e:  # noqa: BLE001
        check("run", False, f"{type(e).__name__}: {e}")
        await page.screenshot(path=f"{SHOTS}/{name}_error.png")
    finally:
        await context.close()


async def main():
    os.makedirs(SHOTS, exist_ok=True)
    names = [n.strip().upper() for n in os.environ.get("E2E_ACCOUNTS", "MANAGER,ISHA,LAXMI").split(",") if n.strip()]
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for n in names:
            await run_account(browser, n)
        await browser.close()
    print(f"\n{'FAILED' if failures else 'ALL PASSED'} — {len(failures)} failure(s). Screenshots: {SHOTS}")
    sys.exit(1 if failures else 0)


asyncio.run(main())
