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

// Ensure the 'temp' directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)){
    fs.mkdirSync(tempDir, { recursive: true });
}

// Function to clean up temporary directory
function cleanTempDirectory() {
  fs.readdir(tempDir, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${tempDir}:`, err);
      return;
    }
    files.forEach((file) => {
      const filePath = path.join(tempDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting file stats for ${filePath}:`, err);
          return;
        }
        if (stats.isFile()) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file ${filePath}:`, err);
            } else {
              console.log(`Deleted file: ${filePath}`);
            }
          });
        }
      });
    });
  });
}

// Call the clean-up function at startup
cleanTempDirectory();

// Schedule the clean-up function to run every 24 hours
setInterval(cleanTempDirectory, 24 * 60 * 60 * 1000);

// PDF Generation endpoint
app.post('/generate-pdf', async (req, res) => {
  let browser;
  try {
    console.log('Received request to generate PDF...');
    const targetUrl = req.query.url || 'https://tu-url-por-defecto.com';

    console.log('Opening browser...');
    // Use Playwright's chromium to launch the browser
    browser = await chromium.launch({
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
    const page = await browser.newPage();

    console.log(`Navigating to URL: ${targetUrl}`);
    // Navigate to the provided URL and wait for full rendering
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

    console.log('Page loaded successfully, waiting for any additional content...');
    // Optional delay to ensure all JavaScript is loaded
    await new Promise(resolve => setTimeout(resolve, 25000));

    console.log('Generating PDF...');
    // Generate PDF from the loaded page
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      scale: 1,
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
    const outputFilePath = path.join(tempDir, `generated-report-${Date.now()}.pdf`);
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
