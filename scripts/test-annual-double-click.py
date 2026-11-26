"""With npm run dev running locally, run: python scripts/test-annual-double-click.py
Requires Python Playwright and Chromium. Set CHROMIUM_PATH to use a local binary.
"""
import os
import re

from playwright.sync_api import expect, sync_playwright


def check(browser):
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.goto(os.getenv("GAME_URL", "http://127.0.0.1:5173"))
    debug = page.get_by_text("开发者调试 · 含隐藏信息", exact=True)
    debug.click()
    page.get_by_label("指定种子").fill("marriage-audit-0")
    page.get_by_role("button", name="按种子生成").click()
    debug.click()
    page.get_by_placeholder("输入名").fill("宁")
    page.get_by_role("button", name="落名，开始此生").click()

    panel = page.locator("main > section").first
    inquiry = panel.get_by_role("button", name="随父亲 郑安到本地集市问工：整理布匹")
    for _ in range(40):
        if inquiry.is_visible():
            break
        panel.get_by_role("button").first.click()
    expect(inquiry).to_be_visible()
    year = panel.locator("small").first
    initial_year = year.inner_text()
    assert "18 岁" in initial_year
    expect(panel.get_by_role("heading", name=re.compile("还可行动 2 次"))).to_be_visible()
    inquiry.click()
    confirm = panel.get_by_role("button", name="确定前往")
    confirm.dblclick()

    expect(confirm).to_have_count(0)
    expect(year).to_have_text(initial_year)
    expect(panel.get_by_role("heading", name=re.compile("还可行动 1 次"))).to_be_visible()
    chronicle = page.locator("section").filter(has=page.get_by_role("heading", name="人生纪事"))
    expect(chronicle.locator("p").filter(has_text="郑安约你最迟明年年底")).to_have_count(1)
    expect(chronicle.get_by_text(re.compile("你依约和郑安"))).to_have_count(0)
    interview = panel.get_by_role("button", name=re.compile("^去本地集市面谈"))
    # A deliberate keyboard activation is available immediately after the double click.
    interview.press("Enter")
    expect(confirm).to_be_visible()
    confirm.press("Enter")
    expect(chronicle.locator("p").filter(has_text="你依约和郑安")).to_have_count(1)
    expect(year).to_have_text(initial_year)
    page.close()


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH"))
        check(browser)
        browser.close()
