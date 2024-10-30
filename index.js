// Import necessary modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const puppeteer = require('puppeteer');


// Convert fs.writeFileSync to promise-based
const writeFileAsync = promisify(fs.writeFile);

// Initialize express app
const app = express();

// Set port for local testing
const PORT = process.env.PORT || 3000;

// PDF Generation endpoint
app.post('/generate-pdf', async (req, res) => {
  let browser;
  try {
    console.log('Received request to generate PDF...');
    const targetUrl = req.query.url || 'https://c3b20c6d-f716-45d4-998d-f044908a2a87.weweb-preview.io/rapport-motives/1144/2930/';
   
    console.log('Opening browser...');


    // Crear el directorio de caché si no existe
    const cacheDir = path.resolve(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Encontrar la ruta de Chromium
    const chromiumDir = fs.readdirSync(path.join(cacheDir, '.local-chromium')).find(dir => dir.startsWith('linux'));
    const chromiumPath = path.join(cacheDir, '.local-chromium', chromiumDir, 'chrome-linux', 'chrome');

    if (!fs.existsSync(chromiumPath)) {
      throw new Error('Chromium executable not found at ' + chromiumPath);
    }
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ],
      executablePath: puppeteer.executablePath(),
      userDataDir: cacheDir
    });

    console.log('Browser opened, creating a new page...');
    const page = await browser.newPage();

    console.log(`Navigating to URL: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Page loaded successfully, waiting for any additional content...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      scale: 0.9,
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      }
    });

    console.log('PDF generated, closing browser...');
    await browser.close();

    const outputFilePath = path.join(__dirname, 'temp', `generated-report-${Date.now()}.pdf`);
    await writeFileAsync(outputFilePath, pdfBuffer);

    console.log('Sending PDF as response...');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=generated-report.pdf');

    res.sendFile(outputFilePath, (err) => {
      if (err) {
        console.error('Error while sending file:', err);
        res.status(500).send('An error occurred while generating the PDF.');
      } else {
        console.log('PDF sent successfully, cleaning up...');
        fs.unlinkSync(outputFilePath);
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (browser) {
      await browser.close();
    }
    res.status(500).send('An error occurred while generating the PDF.');
  }
});

// Start express server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// To run the script locally, run node index.js
// Test endpoint: POST http://localhost:3000/generate-pdf?url=<target-url>
