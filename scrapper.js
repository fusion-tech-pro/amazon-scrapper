const puppeteer = require('puppeteer');

const scrapData = (data) => Promise.all(data.map(el => scrapRow(el)));

const scrapRow = async ({id, storefront_url, name} = {} ) => {
  try {
    const browser = await puppeteer.launch(
      {
        headless: false,
        args: [ '--proxy-server=https=167.99.63.67:8888' ],
        devtools: true
      });
    const page = await browser.newPage();
    await page.goto(storefront_url);
    const data = await getBlocksOnPage(page, browser);

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

const getBlocksOnPage = async (page, browser) => {
  await page.evaluate(() => document.getElementById('products-link').children[0].click());
  await page.waitForNavigation({ waitUntil: 'networkidle0' })
  const urls = await page.evaluate(getElementsOnPage);
  let pages = [];
  for(let i=0; i< urls.length; i++){
    const newPage = await browser.newPage();
    await newPage.goto(urls[i]);
  }
  const promisePages = await urls.map((el) =>
    browser.newPage()
    .then((page) => {
      page.goto(el);
    })
  );
  pages = await Promise.all(promisePages);

  console.log('abra',  pages );
  const data = await getMerchant(pages);
  return  data;
}

const getMerchant = async (pages) => {
  const sellers = [];
  for (let i=0; i< pages.length; i++){
    const data = await pages[i].evaluate(() => (
      {
        seller: document.getElementById('sellerProfileTriggerId'),
        delivery: document.getElementById('SSOFpopoverLink').innerText,
        path: location.pathname,
      }
    ));
    if(!data.delivery.includes('Amazon')){
      sellers.push(data)
    }
    await pages[i].close();
  }
  return sellers;
}


module.exports = {
  scrapData,
  scrapRow,
}
