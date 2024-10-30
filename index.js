// Import necessary modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { chromium } = require('playwright-chromium');

// Convert fs.writeFileSync to promise-based
const writeFileAsync = promisify(fs.writeFile);

// Initialize express app
const app = express();

// Set port for local testing
const PORT = process.env.PORT || 3000;

// PDF Generation endpoint
app.post('/generate-pdf', async (req, res) => {
  try {
    console.log('Received request to generate PDF...');
    // Input URL to generate PDF from
    const targetUrl = req.query.url || 'https://c3b20c6d-f716-45d4-998d-f044908a2a87.weweb-preview.io/rapport-motives/1144/2930/';

    console.log('Opening browser...');
    // Create browser instance with Playwright
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ],
    });

    console.log('Browser opened, creating a new page...');
    // Create a new page
    const page = await browser.newPage();

    console.log(`Navigating to URL: ${targetUrl}`);
    // Navigate to the provided URL and wait for full rendering
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    console.log('Page loaded successfully, waiting for any additional content...');
    // Optional delay to ensure all JavaScript is loaded
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('Generating PDF...');
    // Generate PDF from the loaded page
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
    // Close browser instance
    await browser.close();

    // Set up file path to store the PDF temporarily
    const outputFilePath = path.join(__dirname, 'temp', `generated-report-${Date.now()}.pdf`);
    await writeFileAsync(outputFilePath, pdfBuffer);

    console.log('Sending PDF as response...');
    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=generated-report.pdf');

    // Send PDF as response
    res.sendFile(outputFilePath, (err) => {
      if (err) {
        console.error('Error while sending file:', err);
        res.status(500).send('An error occurred while generating the PDF.');
      } else {
        console.log('PDF sent successfully, cleaning up...');
        // Clean up the temporary file
        fs.unlinkSync(outputFilePath);
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('An error occurred while generating the PDF.');
  }
});

// Start express server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// To run the script locally, run node index.js
// Test endpoint: POST http://localhost:3000/generate-pdf?url=<target-url>
