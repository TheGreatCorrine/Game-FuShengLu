"""Run with a local Vite dev server. Uses the same environment as test-annual-double-click.py."""
import os
import re
from playwright.sync_api import expect, sync_playwright


def play(browser, seed, care):
    page = browser.new_page()
    page.goto(os.getenv("GAME_URL", "http://127.0.0.1:5173"))
    button = lambda name: page.get_by_role("button", name=name, exact=True)
    debug = page.get_by_text("开发者调试 · 含隐藏信息", exact=True)
    debug.click()
    page.get_by_label("指定种子").fill(seed)
    button("按种子生成").click()
    debug.click()
    page.get_by_placeholder("输入名").fill("宁")
    button("落名，开始此生").click()
    panel = page.locator("main > section").first
    journal = page.locator("section").filter(has=page.get_by_role("heading", name="人生纪事"))
    known = page.get_by_text("相识 · 布贩张平", exact=True)
    expect(known).to_have_count(0)
    for _ in range(350):
        rows = journal.locator("p").all_inner_texts()
        if any(("留家照护亲人，错过了与张平" if care else "张平认出你") in row for row in rows):
            assert any("引见布贩张平" in row for row in rows)
            if care:
                assert any("你应下照料" in row for row in rows)
                assert any("到布市见面" in row for row in rows)
                assert not panel.get_by_role("button", name=re.compile("^到布市赴")).count()
            else:
                assert any("上回说过" in row and "到布市见面" in row for row in rows)
                assert any("这批人手已足" in row for row in rows)
            known.click()
            print(seed, panel.locator("small").first.inner_text(), rows[0], flush=True)
            page.close()
            return
        opts = panel.get_by_role("button").all_inner_texts()
        if "结束本年行动" in opts:
            choices = [o for o in opts if o.startswith(("向布贩", "到布市赴"))]
            for prefix in ["去本地集市面谈", "随"]:
                choices += [o for o in opts if o.startswith(prefix) and any(j in o for j in ["整理布匹", "照看货担"])]
            if choices:
                button(choices[0]).press("Enter")
                button("确定前往").press("Enter")
            else:
                button("结束本年行动").press("Enter")
        elif opts:
            button("自己留下守候" if "自己留下守候" in opts else opts[0]).press("Enter")
        else:
            raise AssertionError((seed, "life ended before expected encounter", rows[:3]))
    raise AssertionError((seed, "step limit"))


if __name__ == "__main__":
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH"))
        play(browser, "marriage-audit-31", False)
        play(browser, "marriage-audit-197", True)
        browser.close()
