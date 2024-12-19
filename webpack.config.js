const path = require('path');

module.exports = {
  entry: './views/index.js', // New entry file location
  output: {
    path:  path.resolve(__dirname, 'views'), // Output directory
    filename: 'bundle.js', // Output file name
  },
  /*
module.exports = {
  entry: './public/index.js', // New entry file location
  output: {
    path:  path.resolve(__dirname, 'public'), // Output directory
    filename: 'bundle.js', // Output file name
  },
  */
};
