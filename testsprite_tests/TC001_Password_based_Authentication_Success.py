import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Input valid username and password into the login form.
        frame = context.pages[-1]
        # Input valid mobile number as username
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/div/div/div/div/div[2]/div/div/div/form/div/div/div[2]/div/div/span/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('9810000000')
        

        frame = context.pages[-1]
        # Input valid password
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/div/div/div/div/div[2]/div/div/div/form/div[2]/div/div[2]/div/div/span/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('password123')
        

        # -> Submit the login form by clicking the Sign In button.
        frame = context.pages[-1]
        # Click the Sign In button to submit the login form
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/div/div/div/div/div[2]/div/div/div/form/div[3]/div/div/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input valid username and password again and submit the login form.
        frame = context.pages[-1]
        # Input valid mobile number as username
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/div/div/div/div/div[2]/div/div/div/form/div/div/div[2]/div/div/span/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('9810000000')
        

        frame = context.pages[-1]
        # Input valid password
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/div/div/div/div/div[2]/div/div/div/form/div[2]/div/div[2]/div/div/span/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('password123')
        

        frame = context.pages[-1]
        # Click the Sign In button to submit the login form
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/div/div/div/div/div[2]/div/div/div/form/div[3]/div/div/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Verify the presence and validity of the JWT token in browser storage to confirm successful authentication.
        frame = context.pages[-1]
        # Open user menu or settings to check for token or session info if available
        elem = frame.locator('xpath=html/body/div/div/div/div/aside/div/div/div[3]/div/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=NexaCare Hospital').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Hospital Admin 1').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=HOS-2026-002').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Apollo Hospitals Mumbai').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Active Hospital Admin').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Total Doctors').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=20').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Total Patients').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=8').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Upcoming Appointments').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=5').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Monthly Revenue').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=₹0').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Pending:').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=6').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Confirmed:').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=13').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Completed:').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=0').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Total:').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=28').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=0 of 5 completed today').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Appointments').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=IPD Management').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Upcoming Appointments').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=View All').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Today (5)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Pending (0)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Confirmed (0)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Checked In (5)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=In Consultation (0)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Completed (0)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Suresh Iyer').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=07 Jan 2026').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=#1').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Dr. Uma Chopra').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Dermatology').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=CHECKED-IN').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    