// @ts-check
const puppeteer = require("puppeteer");
const { create } = require("xmlbuilder2");

/**
 * @typedef {object} Feed
 * @property {string} href
 * @property {string} title
 * @property {string} date
 * @property {string} desc
 */

/**
 * @returns {Promise<Feed[]>}
 */
const fetchFeeds = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto("https://vuejsdevelopers.com/newsletter");

  const items = await page.$eval(".past-issues", (elemant) =>
    Array.from(elemant.querySelectorAll("a")).map(
      /** @returns {Feed} */ (el) => {
        const href = el.href;
        const text = el.innerText;
        const [line, desc] = text.split(/\n+/);
        const [title, date] = line.split(", ");

        return { href, title, date, desc };
      }
    )
  );

  browser.close();

  return items;
};

/**
 * @param {Feed[]} feeds
 * @returns {string}
 */
const buildXml = (feeds) => {
  const root = create().ele("rss").att("version", "2.0");

  const channel = root.ele("channel");
  channel.ele("title").txt("Vue.js Developers Newsletter");
  channel.ele("link").txt("https://vuejsdevelopers.com/newsletter/");
  channel.ele("description");

  feeds.forEach((v) => {
    const item = channel.ele("item");
    item.ele("title").txt(v.title);
    item.ele("link").txt(v.href);
    item.ele("guid").txt(v.href);
    item.ele("pubDate").txt(new Date(v.date).toUTCString());
    item.ele("description").txt(v.desc);
  });

  const xml = root.end({ prettyPrint: true });
  return xml;
};

const main = async () => {
  const feeds = await fetchFeeds();
  const xml = buildXml(feeds);
  console.log(xml);
};

main();
