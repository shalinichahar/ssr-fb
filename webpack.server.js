const path = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  // ... other config
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: path.resolve(__dirname, 'src', 'shared', 'assets', 'img'),
          to: path.resolve(__dirname, 'dist', 'images')
        },
      ],
    }),
  ],
  // ... rest of config
};

module.exports = {
    mode: 'development',
    target: 'node',
    entry: './src/server/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'server.js',
        publicPath: '/',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react'],
                    },
                },
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[name].[ext]',
                            outputPath: 'images/',
                            publicPath: '/images/',
                            emitFile: false, // Don't emit files for server build
                        },
                    },
                ],
            },
            {
                test: /\.css$/i,
                use: 'null-loader'
            },
        ],
    },
    externals: [nodeExternals()], // Ignore node_modules for server-side
    resolve: {
        extensions: ['.js', '.jsx'],
    },
    plugins: [
        new CopyPlugin({
          patterns: [
            { 
              from: path.resolve(__dirname, 'src', 'shared', 'assets', 'img'),
              to: path.resolve(__dirname, 'dist', 'images')
            },
          ],
        }),
      ],
};