const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

let browser;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
  }
  return browser;
}

app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let context;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    await page.waitForTimeout(2000);

    const content = await page.evaluate(() => {
      const remove = document.querySelectorAll('script, style, nav, header, footer, iframe, noscript');
      remove.forEach(el => el.remove());
      return document.body.innerText;
    });

    await context.close();

    res.json({ 
      url: url,
      content: content.replace(/\s+/g, ' ').trim().substring(0, 15000)
    });

  } catch (error) {
    if (context) await context.close().catch(() => {});
    browser = null;
    res.status(500).json({ error: error.message, url: url });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scraper server running on port ${PORT}`);
});