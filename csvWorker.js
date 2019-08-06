const csv = require('csv-parser');
const fs = require('fs');
const csvWriter = require('csv-write-stream');
const writer = csvWriter({ headers: ['name', 'storefront_url', 'productPage'] });
writer.pipe(fs.createWriteStream('query_result_after_scrapper.csv', { flags: 'a' }));


const startScrapper = (filename, callback) => {
  const results = [];
  fs.createReadStream(filename)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => callback(results));

};
const writeRecords = (records) => {
  for (let i = 0; i < records.length; i++) {
    writer.write(records[i])
  }
}

const writeRecord = (data) => {
  writer.write(data)
}

module.exports = {
  startScrapper,
  writeRecord
}
