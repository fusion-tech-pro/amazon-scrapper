const {useDataFromFile} = require('./csvWorker');
const { scrapData, scrapRow } = require('./scrapper');

useDataFromFile('./query_result.csv', scrapRow );

// const data = getDataFromFile('./query_result.csv');
// console.log('abra',  data );

// Row data {
//   id: 'ASEVS99O6FS73',
//     storefront_url: ':q\n',
//     name: 'Pharmapacks' }
