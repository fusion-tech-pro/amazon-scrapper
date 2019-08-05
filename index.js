const { startScrapper } = require('./csvWorker');
const { scrapData, scrapRow } = require('./scrapper');

startScrapper('./query_result.csv', scrapRow);
