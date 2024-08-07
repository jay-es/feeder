import type { VercelRequest, VercelResponse } from "@vercel/node";
import chrome from "@sparticuz/chromium";
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
    ...(process.env.AWS_LAMBDA_FUNCTION_VERSION
      ? { executablePath: await chrome.executablePath() }
      : { channel: "chrome" }),
  });
  const page = await browser.newPage();

  await page.goto("https://vuejsdevelopers.com/newsletter");

  const items = await page.$eval(".past-issues", (element) =>
    Array.from(element.querySelectorAll("a")).map((el): Feed => {
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
  channel.ele("lastBuildDate").txt(new Date().toUTCString());

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

export default async (req: VercelRequest, res: VercelResponse) => {
  const feeds = await fetchFeeds();
  const xml = buildXml(feeds);

  res.setHeader(
    "Cache-Control",
    "max-age=0, s-maxage=21600, stale-while-revalidate=86400"
  );
  res.status(200).send(xml);
};

export const config = {
  maxDuration: 15,
};
