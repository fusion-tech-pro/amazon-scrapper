const puppeteer = require('puppeteer');
const { writeRecord } = require('./csvWorker');

const scrapData = data => Promise.all(data.map(el => scrapRow(el)));

const getPageByUrl = async (browser, url) => {
  const pages = await browser.pages();
  const page = pages.find(el => el.url() == url);
  return page;
};

const scrapDataByBatch = async data => {
  try {
    const vpnServers = [
      '159.203.87.130:3128',
      '165.22.236.64:8080',
      '167.99.63.67:8888',
      '159.203.87.130:3128'
    ];
    for (let i = 1; i < data.length; i += 4) {
      const promises = [
        scrapRow(data[i], vpnServers[0], i),
        scrapRow(data[i + 1], vpnServers[1], i + 1),
        scrapRow(data[i + 2], vpnServers[2], i + 2),
        scrapRow(data[i + 3], vpnServers[3], i + 3)
      ];
      await Promise.all(promises);
    }
  } catch (e) {
    console.log('error', e);
  }
};

const scrapRow = async (
  { id, storefront_url: url, name } = {},
  server = `159.203.87.130:3128`,
  position
) => {
  try {
    const browser = await puppeteer.launch({
      // devtools: true,
      // headless: false,
      args: [`--proxy-server=https=${server}`]
    });
    browser.on('targetcreated', target => {
      console.log('created', target);
      return target.page();
    });
    const page = await browser.newPage();
    await page.goto(url);
    await page.evaluate(() =>
      document.getElementById('products-link').children[0].click()
    );
    await getBlocksOnPage(page, browser, url);
    // click to Page(2)
    await page.evaluate(() =>
      document.getElementsByClassName('a-normal')[0].children[0].click()
    );
    await getBlocksOnPage(page, browser, url);
    // click to Page(3)
    await page.evaluate(() =>
      document.getElementsByClassName('a-normal')[1].children[0].click()
    );
    await getBlocksOnPage(page, browser, url);
    await browser.close();
    console.log('position', position);
    console.log('id', id);
  } catch (e) {
    console.log('abra', e);
    return undefined;
  }
};

const getElementsOnPage = () => {
  const elements = document.getElementsByClassName(
    'a-section a-spacing-medium'
  );
  const urls = [];
  for (let i = 0; i < elements.length - 2; i++) {
    if (
      !elements[i].getElementsByClassName('aok-inline-block s-image-logo-view')
        .length
    )
      continue;
    const rows = elements[i].getElementsByClassName('a-row');
    let haveAmazon = false;
    for (let index = 0; index < rows.length; index++) {
      if (rows[index].children[0].innerText.includes('Amazon')) {
        haveAmazon = true;
        break;
      }
    }
    if (haveAmazon) continue;
    let urlElement = elements[i].getElementsByClassName(
      'a-link-normal a-text-normal'
    )[0];
    urls.push({
      href: urlElement.href,
      selector: `h2 .a-link-normal.a-text-normal[href="${urlElement.getAttribute(
        'href'
      )}"]`
    });
  }
  return urls;
};

const getBlocksOnPage = async (page, browser, url) => {
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  const urls = await page.evaluate(getElementsOnPage);
  const products = [];
  // await newPage.goto(urls[i]);
  for (let i = 0; i < urls.length; i++) {
    // const newPage = await browser.newPage();
    await page.click(urls[i].selector);
    await page.waitFor(1000);
    const newPage = await getPageByUrl(browser, urls[i].href);
    const data = await getMerchant(newPage, page.url());
    products.push(data);
  }
  await writeRecord(products);
};

const getMerchant = async (page, url) => {
  let response = {};
  try {
    await page.waitForSelector('#sellerProfileTriggerId', { timeout: 2000 });
    const data = await page.evaluate(() => {
      const seller = document.getElementById('sellerProfileTriggerId') || {};
      const delivery = document.getElementById('SSOFpopoverLink') || {};
      const { innerText: sellerName = '' } = seller;
      const { innerText: deliveryName = '' } = delivery;
      return {
        sellerName,
        deliveryName,
        path: location.pathname || ''
      };
    });
    const { sellerName, deliveryName, path } = data;

    if (!sellerName.includes('Amazon') && !deliveryName.includes('Amazon')) {
      response = {
        name: sellerName,
        storefront_url: url,
        productPage: path
      };
    }
    await page.close();
    return response;
  } catch (e) {
    return undefined;
  }
};

module.exports = {
  scrapDataByBatch,
  scrapRow
};
