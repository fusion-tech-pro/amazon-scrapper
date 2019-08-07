const ParserCSV = require('./parserCSV');

/**
 * Create new instance Parser CSV
 * @type {ParserCSV}
 */
const parser = new ParserCSV('./query_result.csv');
parser.startScrapper();
