const csv = require("csv-parser");
const fs = require("fs");
const Scrapper = require("./scrapper");

class ParserCSV {
  constructor(inputFilename, callback) {
    this.inputFilename = inputFilename;
    this.callback = callback;
  }

  /**
   * Start scrap data, get row from input file, and use callback for this data
   * @param inputFilename
   * @param callback
   */
  startScrapper({ inputFilename, callback } = {}) {
    const results = [];
    if (!inputFilename) {
      inputFilename = this.inputFilename;
    }
    if (!callback) {
      callback = this.callback;
    }
    fs.createReadStream(inputFilename)
      .pipe(csv())
      .on("data", data => results.push(data))
      .on("end", async () => {
        if (!callback) {
          const scrapper = new Scrapper({
            data: results,
            start: 1
          });
          await scrapper.startScrapper();
          return;
        }
        callback(results);
      });
  }
}

module.exports = ParserCSV;
