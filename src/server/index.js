import express from 'express';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import puppeteer  from 'puppeteer';
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../shared/App';
import { getReportNumber } from './controllers/jsonController';
require('dotenv').config();
import { performance } from 'perf_hooks'; // Import performance from perf_hooks

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
  timeout: 0
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware for parsing JSON and URL-encoded data
app.use(express.json({ limit: '1gb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

app.use(express.static(resolve(__dirname, '../../public')));

const s3 = new S3Client({ region: process.env.AWS_REGION });

// Function to check if a file exists in S3
const checkIfFileExists = async (filename) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: filename,
    });
    await s3.send(command);
    return true; // File exists
  } catch (error) {
    if (error.name === 'NotFound') {
      return false; // File does not exist
    }
    throw error; // Handle other errors
  }
};

// Function to generate a signed URL
const generateSignedUrl = async (filename) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: filename,
  });

  try {
    console.log('Attempting to generate signed URL...');
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL valid for 1 hour
    console.log('Signed URL generated:', signedUrl);
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

// Function to generate PDF using Puppeteer
async function generatePDF(htmlContent) {
  
  const page = await browser.newPage();

  // Load Tailwind CSS
  const tailwindCSS = readFileSync(resolve(__dirname, '../public/output.css'), 'utf8');

  // Combine CSS and HTML content
  const fullHTMLContent = `
    <html>
      <head>
        <style>${tailwindCSS}</style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  await page.setContent(fullHTMLContent, {
    // waitUntil: 'networkidle0',
    timeout: 0
  });

  // await page.waitForNavigation({
  //   waitUntil: 'load',
  // });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    quality: 10,
    margin: { top: '3mm', right: '3mm', bottom: '3mm', left: '3mm' },
    preferCSSPageSize: true,
    timeout: 0
  });

  // await browser.close();
  await page.close();
  return pdfBuffer;
}

// Function to upload the PDF to S3
async function uploadToS3(pdfBuffer, filename) {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: filename,
    Body: pdfBuffer,
    ContentType: 'application/pdf'
  };

  await s3.send(new PutObjectCommand(params));
}


app.post('/submit', async (req, res) => {
  console.log('Received payload size:', req.rawBody.length, 'bytes');
  const content = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content not found' });
  }

  try {
    const reportNumber = getReportNumber(content);
    if (!reportNumber) {
      return res.status(400).json({ error: 'Report number not found in the provided data' });
    }

    const filename = `credit-report-${reportNumber}.pdf`;

    // Check if the file already exists in S3
    const fileExists = await checkIfFileExists(filename);

    if (fileExists) {
      console.log(`${filename} already exists. Generating signed URL...`);
      const signedUrl = await generateSignedUrl(filename);
      return res.status(200).json({ message: 'File already exists, returning signed URL.', url: signedUrl });
    }

    // If the file doesn't exist, generate and upload it
    console.log('File does not exist. Generating PDF...');

    // Start timing the entire process
    const startTime = performance.now();

    // Measure HTML rendering time
    const startHtmlRender = performance.now();
    const htmlContent = renderToString(<App data={content} />);
    const endHtmlRender = performance.now();
    console.log(`HTML rendering time: ${(endHtmlRender - startHtmlRender).toFixed(2)} ms`);

    // Measure PDF generation time
    const startPdfGeneration = performance.now();
    const pdfBuffer = await generatePDF(htmlContent);
    const endPdfGeneration = performance.now();
    console.log(`PDF generation time: ${(endPdfGeneration - startPdfGeneration).toFixed(2)} ms`);

    // Measure upload time
    const startUpload = performance.now();
    await uploadToS3(pdfBuffer, filename);
    const endUpload = performance.now();
    console.log(`S3 upload time: ${(endUpload - startUpload).toFixed(2)} ms`);

    // Measure signed URL generation time
    const startSignedUrl = performance.now();
    const signedUrl = await generateSignedUrl(filename);
    const endSignedUrl = performance.now();
    console.log(`Signed URL generation time: ${(endSignedUrl - startSignedUrl).toFixed(2)} ms`);

    // Total time for the process
    const endTime = performance.now();
    console.log(`Total time for generation and upload: ${(endTime - startTime).toFixed(2)} ms`);

    res.status(200).json({ 
      message: 'PDF generated and uploaded to S3 successfully!',
      url: signedUrl,
      generationTime: (endPdfGeneration - startPdfGeneration) / 1000, // Convert generation time to seconds
      uploadTime: (endUpload - startUpload) / 1000, // Convert upload time to seconds
      totalTime: (endTime - startTime) / 1000 // Total time in seconds
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
