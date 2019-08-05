const csv = require('csv-parser');
const fs = require('fs');

const useDataFromFile = async (filename, callback) => {
  const results = [];
  fs.createReadStream(filename)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => callback(results[5]));
};

module.exports = {
  useDataFromFile
}
