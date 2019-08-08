const puppeteer = require("puppeteer");
const writerCSV = require("./csvWriter");

const sleepTypes = {
  navigation: "navigation",
  sleep: "sleep",
  select: "select"
};

class Scrapper {
  constructor({
    data,
    proxies,
    selectedProxy = -1,
    proxy,
    start = 1,
    filename = "shops.csv",
    quantityPages = 3
  } = {}) {
    this.data = data;
    const proxiesDefault = ["159.203.87.130:3128", "167.99.63.67:8888"];
    this.selectedProxy = proxy ? proxy :
      selectedProxy > -1 ? proxies[selectedProxy] : proxiesDefault[0];
    this.proxies = [...proxiesDefault, proxies];
    this.start = start;
    this.writer = new writerCSV(filename);
    this.quantityPages = quantityPages;
  }

  /**
   * This function will start Scrapper
   * @returns {Promise<void>}
   */
  async startScrapper() {
    for (let i = this.start; i < this.data.length; i += 1) {
      this.position = i;
      await this.scrapRow(this.data[i]);
    }
    this.printInformationAboutEvent(this.data.length, "End");
  }

  /**
   * It's decorator for puppeteer browser
   * @param options
   * @returns {Promise<void>}
   */
  async createBrowser(
    options = {
      // devtools: true,
      headless: false,
      args: [`--proxy-server=https=${this.selectedProxy}`]
    }
  ) {
    try {
      this.browser = await puppeteer.launch(options);
      this.browser.on("targetcreated", target => target.page());
    } catch (e) {
      console.error("Please check your browser", e);
    }
  }

  /**
   * Go to Products
   * @returns {Promise<void>}
   */
  async goToProducts() {
    await this.currentPage.goto(this.currentUrl);
    await this.currentPage.evaluate(() =>
      document.getElementById("products-link").children[0].click()
    );
  }

  /**
   * Go to next Page
   * @param page, number of Page
   * @returns {Promise<void>}
   */
  async goToNextPage(page = 0) {
    // page = 0 click for 2  page = 1 click for 3 and etc
    await this.currentPage.evaluate(
      page =>
        document.getElementsByClassName("a-normal")[page].children[0].click(),
      page
    );
  }

  /**
   * * It's decorator for puppeteer page.wait
   * @param type it's wait type
   * @param page it's page, which puppeteer selected
   * @param max it's max time for randomize wait
   * @returns {Promise<void>}
   */
  async waitPage(type, page = this.currentPage, max = 7) {
    if (type === sleepTypes.navigation) {
      await page.waitForNavigation({ waitUntil: "networkidle0" });
      return;
    }

    if (type === sleepTypes.sleep) {
      await page.waitFor(1000);
      return;
    }

    if (type === sleepTypes.select) {
      await page.waitForSelector("#sellerProfileTriggerId", { timeout: 2000 });
      return;
    }

    const getRandomInt = max => Math.floor(Math.random() * Math.floor(max));
    await page.waitFor(getRandomInt(max));
  }

  /**
   * This method use in chromium through page.evaluate
   * @returns {[]} Array with urls(selected products)
   */
  getUrls() {
    const elements = document.getElementsByClassName(
      "a-section a-spacing-medium"
    );
    const urls = [];
    for (let i = 0; i < elements.length - 2; i++) {
      if (
        !elements[i].getElementsByClassName(
          "aok-inline-block s-image-logo-view"
        ).length
      )
        continue;
      const rows = elements[i].getElementsByClassName("a-row");
      let haveAmazon = false;
      for (let index = 0; index < rows.length; index++) {
        if (rows[index].children[0].innerText.includes("Amazon")) {
          haveAmazon = true;
          break;
        }
      }
      if (haveAmazon) continue;
      let urlElement = elements[i].getElementsByClassName(
        "a-link-normal a-text-normal"
      )[0];
      urlElement.setAttribute("target", "_blank");
      urls.push({
        href: urlElement.href,
        selector: `h2 .a-link-normal.a-text-normal[href="${urlElement.getAttribute(
          "href"
        )}"]`
      });
    }
    return urls;
  }

  /**
   * get Page by url
   * @param url - url e.g http://google.com
   * @returns {Promise<?AXNode|number|bigint|Promise<*>|any>}
   */
  async getPageByUrl(url) {
    const pages = await this.browser.pages();
    return pages.find(el => el.url() === url);
  }

  /**
   * get Merchant and Delivery if Merchant or Delivery includes Amazon, then go out
   * @param page it's page, which puppeteer selected
   * @returns {Promise<{}>}
   */
  async getMerchant(page) {
    try {
      let response = {};
      await this.waitPage(sleepTypes.select, page);
      const data = await page.evaluate(() => {
        const seller = document.getElementById("sellerProfileTriggerId") || {};
        const delivery = document.getElementById("SSOFpopoverLink") || {};
        const { innerText: sellerName = "" } = seller;
        const { innerText: deliveryName = "" } = delivery;
        return { sellerName, deliveryName };
      });
      const { sellerName, deliveryName } = data;
      if (!sellerName.includes("Amazon") && !deliveryName.includes("Amazon")) {
        response = {
          name: sellerName,
          storefront_url: this.currentUrl,
          productPage: page.url()
        };
      }
      await page.close();
      return response;
    } catch (e) {
      await page.close();
      console.error("getMerchant error:", e);
      return {};
    }
  }

  /**
   * get Product page by url
   * @param url
   * @returns {Promise<Promise<?AXNode|number|bigint|Promise<*>|any>|undefined>}
   */
  async getProductPage(url) {
    try {
      await this.currentPage.evaluate(() => {
        setInterval(selector => {
          document.querySelector(selector).scrollBy(0, 10);
        }, 100);
      }, url.selector);
      await this.waitPage();
      await this.currentPage.evaluate(
        selector => document.querySelector(selector).click(),
        url.selector
      );
      await this.waitPage(sleepTypes.sleep);
      return this.getPageByUrl(url.href);
    } catch (e) {
      console.log("getProductPage error", e);
      return undefined;
    }
  }

  /**
   * Function for check page. Is there a page with products
   * @returns {Promise<boolean>}
   */
  async hasSuitableProductOnPage() {
    await this.waitPage(sleepTypes.navigation);
    const urls = await this.currentPage.evaluate(this.getUrls);
    for (let i = 0; i < urls.length; i++) {
      const page = await this.getProductPage(urls[i]);
      const data = await this.getMerchant(page);
      if (Object.keys(data).length) {
        this.writer.writeRecord(data);
        await this.browser.close();
        return true;
      }
    }
  }

  /**
   * Print information and event name
   * @param id
   * @param event
   */
  printInformationAboutEvent(id, event) {
    console.log(`--------------------${event}---------------------`);
    console.log("position", this.position);
    console.log("id", id);
    console.log(`--------------------${event}---------------------`);
  }

  /**
   * Scrap current row
   * @param id id from doc.csv
   * @param url url from doc.csv
   * @param name name from doc.csv
   * @returns {Promise<void>}
   */
  async scrapRow({ id, storefront_url: url, name } = {}) {
    try {
      await this.createBrowser();
      this.currentPage = await this.browser.newPage();
      this.currentUrl = url;
      this.printInformationAboutEvent(id, "Start");

      for (let index = 0; index < this.quantityPages; index++) {
        if (!index) {
          await this.goToProducts();
        }
        if (index) {
          this.goToNextPage(index - 1);
        }
        let response = await this.hasSuitableProductOnPage();
        if (response) return;
      }
    } catch (e) {
      console.error("Please check scrapRow method", e);
      this.printInformationAboutEvent(id, "Not Found Products");
    }
    await this.browser.close();
  }
}

module.exports = Scrapper;
