import express from 'express';
import ytdl from 'ytdl-core';
import cors from 'cors';
import contentDisposition from 'content-disposition';

//puppeteer
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
puppeteer.use(StealthPlugin())
puppeteer.use(
  RecaptchaPlugin({
    provider: { id: '2captcha', token: '740c28b96fd3f8d9a0d030a01e66fd19' }
  })
);

const app = express();
const port = 5000;

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cors
app.use(cors());

app.post('/api/download-youtube', async (req, res) => {
  try {
    const { url } = req.body;
    const videoInfo = await ytdl.getInfo(url);

    // Find the best video format with audio
    const videoFormat = ytdl.chooseFormat(videoInfo.formats, { filter: 'videoandaudio', quality: 'highest' });

    const filename = `${videoInfo.videoDetails.title}.${videoFormat.container}`;
    res.setHeader('Content-Type', `video/${videoFormat.container}`);
    res.setHeader('Content-Disposition', contentDisposition(filename));
    
    ytdl(url, { format: videoFormat })
      .pipe(res);  
  } catch (error) {
    console.error('Error downloading video:', error);
    res.status(500).send('Error downloading video');
  }
});

app.post('/api/download-coursera', async (req, res) => {
  try {
    const { url } = req.body;

    const browser = await puppeteer.launch({
      "headless": true,
      "args": ["--fast-start", "--disable-extensions", "--no-sandbox"],
      "ignoreHTTPSErrors": true,
    });

    const login = "mkhitaryan-arthur2@mail.ru";
    const password = "Arthur58";

    //login
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 })
    await page.goto('https://www.coursera.org/', { waitUntil: 'domcontentloaded' })
    await page.click('a[data-e2e="header-login-button"]')
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', login);
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', password);
    await page.click('button[data-e2e="login-form-submit-button"]');
    await page.click('button[data-e2e="login-form-submit-button"]');
    await page.click('button[data-e2e="login-form-submit-button"]');

    const { solved } = await page.solveRecaptchas();
    if (solved) {
      console.log('✔️ The captcha has been solved');
    }

    await page.waitForNavigation();

    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const videoElement = await page.$('video > source[type="video/mp4"]');

    let videoSrc = null;

    if (videoElement) {
      videoSrc = videoElement.attr('src');
    }else {
      await page.waitForSelector('a[data-e2e="try_course_button"]');
      await page.click('a[data-e2e="try_course_button"]');

      await page.waitForNavigation({
        waitUntil: 'domcontentloaded',
      });

      await page.waitForSelector('button[data-e2e="enroll-button"]');
      await page.click('button[data-e2e="enroll-button"]');

      const choiceInput = page.$('input[name="choice-input"]');

      if (choiceInput) {
        await page.waitForSelector('input[name="choice-input"]');
        await page.click('input[name="choice-input"]');
        await page.click('button[data-e2e="course_enroll_modal_continue_button"]');
        await page.click('button[data-e2e="course_enroll_modal_continue_button"]');
        await page.click('button[data-e2e="course_enroll_modal_continue_button"]');
      }

      await page.goto(url, { waitUntil: 'domcontentloaded' })
      const videoElement = await page.$('video > source[type="video/mp4"]');
      videoSrc = videoElement.attr('src');
    }
    

    // await browser.close();

    res.send({ video: videoSrc });
  } catch (error) {
    console.error('Error downloading video:', error);
    res.status(500).send('Error downloading video');
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});