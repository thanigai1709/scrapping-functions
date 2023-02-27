const puppeteer = require("puppeteer-extra");
const chrome = require("chrome-aws-lambda");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
const app = express();

app.use(
	cors({
		origin: "*",
	})
);

app.use(bodyParser.json());
app.get("/", async (req, res) => {
	try {
		if (req.method !== "GET") {
			res.status(405).send({ message: "Only GET requests allowed" });
			return;
		}
		if (!req.query.url) {
			res.status(400).send({ message: "Invalid request format" });
			return;
		}
		const { url } = req.query;
		const browser = await puppeteer.launch({
			args: chrome.args,
			executablePath: "/usr/bin/chromium-browser",
			headless: true,
		});
		const page = await browser.newPage();
		await page.goto(String(url));
		await page.evaluate(() => {
			let links = document.querySelectorAll("a");
			links.forEach((element) => {
				element.setAttribute("href", "javascript:void(0)");
			});
		});
		const html = await page.content();
		await browser.close();
		res.status(200).send({ status: true, page: html });
	} catch (error) {
		res.status(500).send({ status: false, err: error.message });
	}
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
