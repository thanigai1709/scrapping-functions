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
		origin: ["https://pirate-crawler-fd1blmu0q-thanigai-excrin.vercel.app/", "http://localhost:3000/"],
	})
);

app.use(bodyParser.json());

app.get("/fetch-page", async (req, res) => {
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

app.post("/crawl-targets", async (req, res) => {
	try {
		const { crawler } = req.body;
		if (!crawler || crawler.length < 1) {
			return res.status(400).send({ message: "Invalid request format" });
		}

		const browser = await puppeteer.launch({
			args: chrome.args,
			executablePath: "/usr/bin/chromium-browser",
			headless: true,
		});

		const page = await browser.newPage();

		const selectors = crawler.crawlTargets;
		await page.goto(String(crawler.targetUrl));

		const data = await Promise.all(
			selectors.map(async (selector) => {
				let innerData = await page.$eval(selector.DOMPath, (el) => {
					return getElementData(el);
					function getElementData(el) {
						let data = {};
						data["tagName"] = el.tagName;
						data["classList"] = el.classList.toString();
						if (el.children.length === 0 && el.innerText != "") {
							data.innerText = el.innerText;
						}
						if (el.tagName === "IMG") {
							data["src"] = el.getAttribute("src");
						}
						if (el.tagName === "VIDEO") {
							data["src"] = el.getAttribute("src");
						}
						if (el.tagName === "IFRAME") {
							data["src"] = el.getAttribute("src");
						}
						if (el.tagName === "SVG") {
							data["svg"] = el.innerHTML;
						}

						if (el.tagName === "A") {
							data["href"] = el.getAttribute("href");
						}

						if (el.childNodes.length > 0) {
							data["childNodesRAW"] = el.innerHTML;
							data["childNodes"] = [];
							for (let i = 0; i < el.childNodes.length; i++) {
								if (el.childNodes[i].nodeType === 1) {
									data["childNodes"].push(getElementData(el.childNodes[i]));
								}
							}
						}

						return data;
					}
				});
				return { [selector.keyName]: innerData };
			})
		);
		await browser.close();
		res.status(200).send({ status: true, data });
	} catch (error) {
		res.status(500).send({ status: false, err: error.message });
	}
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
