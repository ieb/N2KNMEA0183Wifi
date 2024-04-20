const path = require('path');
const CompressionPlugin = require("compression-webpack-plugin");

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [new CompressionPlugin()],
};