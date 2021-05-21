import { VercelRequest, VercelResponse } from "@vercel/node";
import chrome from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";
import { create } from "xmlbuilder2";

type Feed = {
  href: string;
  title: string;
  date: string;
  desc: string;
};

const fetchFeeds = async (): Promise<Feed[]> => {
  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: process.env.AWS_LAMBDA_FUNCTION_VERSION
      ? await chrome.executablePath
      : "C:\\Program Files\\Google\\Chrome\\Application\\Chrome.exe",
  });
  const page = await browser.newPage();

  await page.goto("https://vuejsdevelopers.com/newsletter");

  const items = await page.$eval(".past-issues", (elemant) =>
    Array.from(elemant.querySelectorAll("a")).map((el): Feed => {
      const href = el.href;
      const text = el.innerText;
      const [line, desc] = text.split(/\n+/);
      const [title, date] = line.split(", ");

      return { href, title, date, desc };
    })
  );

  browser.close();

  return items;
};

const buildXml = (feeds: Feed[]): string => {
  const root = create().ele("rss").att("version", "2.0");

  const channel = root.ele("channel");
  channel.ele("title").txt("Vue.js Developers Newsletter");
  channel.ele("link").txt("https://vuejsdevelopers.com/newsletter/");
  channel.ele("description").txt("The best Vue articles in your inbox, weekly");

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

module.exports = async (req: VercelRequest, res: VercelResponse) => {
  const feeds = await fetchFeeds();
  const xml = buildXml(feeds);
  res.status(200).send(xml);
};
