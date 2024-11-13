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
if (!fs.existsSync(tempDir)) {
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

// PDF Generation endpoint for Motives
app.post('/generate-pdf', async (req, res) => {
    let browser;
    try {
        console.log('Received request to generate Motives PDF...');
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

        console.log('Setting viewport size...');
        await page.setViewportSize({ width: 1280, height: 800 });

        console.log(`Navigating to URL: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

        console.log('Page loaded successfully, simulating user actions...');
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });

        await page.waitForTimeout(10000); // Optional delay

        console.log('Generating Motives PDF...');
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
        await browser.close();

        const outputFilePath = path.join(tempDir, `motives-report-${Date.now()}.pdf`);
        await writeFileAsync(outputFilePath, pdfBuffer);

        console.log('Sending Motives PDF as response...');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=motives-report.pdf');
        res.sendFile(outputFilePath, (err) => {
            if (err) {
                console.error('Error while sending file:', err);
                res.status(500).send('An error occurred while generating the PDF.');
            } else {
                console.log('Motives PDF sent successfully, cleaning up...');
                fs.unlinkSync(outputFilePath);
            }
        });
    } catch (error) {
        console.error('Error generating Motives PDF:', error);
        if (browser) {
            await browser.close();
        }
        res.status(500).send('An error occurred while generating the PDF.');
    }
});

// PDF Generation endpoint for AMP
app.post('/generate-amp-pdf', async (req, res) => {
    let browser;
    try {
        console.log('Received request to generate AMP PDF...');
        const targetUrl = req.query.url || 'https://tu-url-por-defecto.com';

        console.log('Opening browser...');
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

        console.log('Setting viewport size...');
        await page.setViewportSize({ width: 1124, height: 794 });

        console.log(`Navigating to URL: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

        console.log('Page loaded successfully, simulating user actions...');
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });

        await page.waitForTimeout(10000); // Optional delay

        console.log('Generating AMP PDF...');
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
        await browser.close();

        const outputFilePath = path.join(tempDir, `amp-report-${Date.now()}.pdf`);
        await writeFileAsync(outputFilePath, pdfBuffer);

        console.log('Sending AMP PDF as response...');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=amp-report.pdf');
        res.sendFile(outputFilePath, (err) => {
            if (err) {
                console.error('Error while sending file:', err);
                res.status(500).send('An error occurred while generating the AMP PDF.');
            } else {
                console.log('AMP PDF sent successfully, cleaning up...');
                fs.unlinkSync(outputFilePath);
            }
        });
    } catch (error) {
        console.error('Error generating AMP PDF:', error);
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
