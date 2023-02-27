const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 3001;
const app = express();

app.use(
	cors({
		origin: "http://localhost:3000",
	})
);

app.use(bodyParser.json());

app.get("/", async (req, res) => {
	try {
		if (!req.query.url) {
			res.status(400).send({ message: "Invalid request format" });
			return;
		}
		const { url } = req.query;
		const browser = await puppeteer.launch({
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
