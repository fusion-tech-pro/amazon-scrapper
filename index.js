const { startScrapper } = require('./csvWorker');
const { scrapDataByBatch, scrapRow } = require('./scrapper');

startScrapper('./query_result.csv', scrapDataByBatch);
