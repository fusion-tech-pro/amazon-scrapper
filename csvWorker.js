const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');

const useDataFromFile = (filename, callback) => {
  const results = [];
  fs.createReadStream(filename)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => callback(results[5]));
};

const writeRecord = () => {
  const csvWriter = createObjectCsvWriter({
    path: 'query_result.csv',
    header: [
      {id: 'name', title: 'NAME'},
      {id: 'storefront_url', title: 'URL'},
      {id: 'productPage',  title: 'Product Page' }
    ]
  });
}

module.exports = {
  useDataFromFile,
  writeRecord
}
