const puppeteer = require('puppeteer');

const scrapData = (data) => Promise.all(data.map(el => scrapRow(el)));

const scrapRow = async ({id, storefront_url:url, name} = {} ) => {
  try {
    const browser = await puppeteer.launch(
      {
        headless: false,
        args: [ '--proxy-server=https=159.203.87.130:3128' ],
        devtools: true
      });
    const page = await browser.newPage();
    await page.goto(url);
    const data = await getBlocksOnPage(page, browser, url);

    // await browser.close();
  } catch (e) {
    console.log('abra',  e );
    return undefined
  }
}

const getElementsOnPage = () => {
  const elements = document.getElementsByClassName('a-section a-spacing-medium');
  const urls = [];
  for (let i = 0; i < elements.length -2; i++){
    if(!elements[i].getElementsByClassName('aok-inline-block s-image-logo-view').length) continue;
    const rows = elements[i].getElementsByClassName('a-row');
    let haveAmazon = false;
    for (let index = 0; index < rows.length; index++ ){
      if(rows[index].children[0].innerText.includes('Amazon')){
        haveAmazon = true;
        break;
      }
    }
    if(haveAmazon) continue;
    let url = elements[i].getElementsByClassName('a-link-normal a-text-normal')[0].href;
    urls.push(url);
  }
  return  urls;
}

const getBlocksOnPage = async (page, browser, url) => {
  await page.evaluate(() => document.getElementById('products-link').children[0].click());
  await page.waitForNavigation({ waitUntil: 'networkidle0' })
  const urls = await page.evaluate(getElementsOnPage);
  const products = []
  for(let i = 0; i < urls.length; i++){
    const newPage = await browser.newPage();
    await newPage.goto(urls[i]);
    const data = await getMerchant(newPage, url)
    products.push(data);
  }
  return  products;
}

const getMerchant = async (page, url) => {
  const sellers = [];
    await page.waitForSelector('#sellerProfileTriggerId');
    const data = await page.evaluate(() => {
      const seller = document.getElementById('sellerProfileTriggerId') || {};
      const delivery = document.getElementById('SSOFpopoverLink') || {};
      const { innerText: sellerName = '' } = seller;
      const { innerText: deliveryName = '' } = delivery;
      return {
        sellerName,
        deliveryName,
        path: location.pathname || '',
      }
    });
    const {sellerName, deliveryName, path } = data;

    if(!sellerName.includes('Amazon') && !deliveryName.includes('Amazon')){
      sellers.push({
        name: sellerName,
        storefront_url: url,
        productPage: path,
      })
    }
    await page.close();

  return sellers;
}


module.exports = {
  scrapData,
  scrapRow,
}
