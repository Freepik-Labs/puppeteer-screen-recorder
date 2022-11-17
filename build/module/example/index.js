import fs from 'fs';
import { PassThrough } from 'stream';
import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from '../lib/PuppeteerScreenRecorder';
function sleep(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
/**
 * @ignore
 */
async function testStartMethod(format) {
    const browser = await puppeteer.launch({
        executablePath: process.env['PUPPETEER_EXECUTABLE_PATH'],
    });
    const page = await browser.newPage();
    const recorder = new PuppeteerScreenRecorder(page);
    await recorder.start(format);
    await page.goto('https://www.youtube.com/watch?v=fh4RNP4bMWk');
    await sleep(2000);
    await page.evaluate(() => {
        const buttonElement = Array.from(document.querySelectorAll('a yt-formatted-string')).find((element) => element.textContent === 'Reject all');
        if (buttonElement) {
            buttonElement.click();
        }
    });
    await page.click('button[title="Play (k)"]');
    await page.waitFor(20 * 1000);
    await recorder.stop();
    await browser.close();
}
/**
 * @ignore
 */
async function testStartStreamMethod(format) {
    const browser = await puppeteer.launch({
        executablePath: process.env['PUPPETEER_EXECUTABLE_PATH'],
    });
    const page = await browser.newPage();
    const recorder = new PuppeteerScreenRecorder(page);
    const passthrough = new PassThrough();
    format = format.replace('video', 'stream');
    const fileWriteStream = fs.createWriteStream(format);
    passthrough.pipe(fileWriteStream);
    await recorder.startStream(passthrough);
    await page.goto('https://www.youtube.com/watch?v=fh4RNP4bMWk');
    await sleep(2000);
    await page.click('button[title="Play (k)"]');
    await page.waitFor(20 * 1000);
    await recorder.stop();
    await browser.close();
}
/**
 * @ignore
 */
async function executeSample(format) {
    const argList = process.argv.slice(2);
    const isStreamTest = argList.includes('stream');
    if (isStreamTest) {
        console.log('Testing with startSteam Method');
        return testStartStreamMethod(format);
    }
    console.log('Testing with start Method');
    return testStartMethod(format);
}
executeSample('./report/video/simple1.mp4').then(() => {
    console.log('completed');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXhhbXBsZS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDcEIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUVyQyxPQUFPLFNBQVMsTUFBTSxXQUFXLENBQUM7QUFFbEMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFekUsU0FBUyxLQUFLLENBQUMsSUFBWTtJQUN6QixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDN0IsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRDs7R0FFRztBQUNILEtBQUssVUFBVSxlQUFlLENBQUMsTUFBTTtJQUNuQyxNQUFNLE9BQU8sR0FBRyxNQUFNLFNBQVMsQ0FBQyxNQUFNLENBQUM7UUFDckMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUM7S0FDekQsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDckMsTUFBTSxRQUFRLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDN0IsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7SUFDL0QsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUN2QixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUM5QixRQUFRLENBQUMsZ0JBQWdCLENBQW9CLHVCQUF1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