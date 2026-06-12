import path from 'path';
import {type Configuration, DefinePlugin, ManifestPlugin} from 'webpack';

export default function config(
    env: { [key: string]: string | undefined }, argv: { [key: string]: string | undefined }
): Configuration {
  return {
    ...(argv.mode === 'development' && {devtool: 'inline-source-map'}),
    entry: {
      main: {
        import: './src/client/main.js'
      }
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.ts$/,
          use: [{
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.client.json'
            }
          }]
        }
      ]
    },
    optimization: {
      splitChunks: {
        chunks: 'all'
      }
    },
    output: {
      chunkFilename: '[id].[contenthash].chunk.js',
      clean: true,
      filename: '[name].[contenthash].bundle.js',
      path: path.resolve('static/dist')
    },
    plugins: [
      new ManifestPlugin({
        filename: '../../out/webpack-manifest.json'
      }),
      new DefinePlugin({
        'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG)
      })
    ],
    resolve: {
      extensions: ['.js', '.ts']
    },
    watch: true
  };
}
