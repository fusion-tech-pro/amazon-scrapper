const ParserCSV = require('./parserCSV');

const parser = new ParserCSV('./query_result.csv');
parser.startScrapper();
