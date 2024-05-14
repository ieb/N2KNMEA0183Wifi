const path = require('path');
const CompressionPlugin = require("compression-webpack-plugin");

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: {
    main: './src/index.js',
    worker: './src/worker.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [new CompressionPlugin()],
};