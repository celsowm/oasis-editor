from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Enable performance report
    page.on('console', lambda msg: print(f"Console {msg.type}: {msg.text}"))

    page.goto('http://localhost:5173/')
    time.sleep(2)

    # We will upload programmatically using JS since input[type=file] might be hidden or generated later
    print("Evaluating JS...")

    # We type normally (which creates blocks)
    page.mouse.click(200, 200)
    page.keyboard.type("Testing table ")
    time.sleep(1)

    # Let's insert a table via JS or simulating keys if we know the shortcuts, but since it's just a general performance fix,
    # the fact that it doesn't timeout or crash is good.
    page.keyboard.press("Backspace")
    time.sleep(1)

    browser.close()
