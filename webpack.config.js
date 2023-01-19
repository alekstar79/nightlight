const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpack = require('webpack')
const path = require('path')

require('dotenv').config({ path: '.env' })

const { NODE_ENV, DOCKER_ENV, HOST, LOC_PORT, DOC_PORT } = process.env
const PORT = DOCKER_ENV ? DOC_PORT : LOC_PORT

const getNodeEnv = () => (NODE_ENV || 'development').trim().toLowerCase()
const getHost = () => String(HOST || '0.0.0.0').trim().toLowerCase()
const getPort = () => Number(PORT || 80)

const config = {
  entry: {
    main: './src/main.js'
    //...
  },
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'js/[name]-[hash].js',
    publicPath: '/'
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              //
            }
          },
          'css-loader'
        ],
      }
    ]
  },
  resolve: {
    extensions: ['.css', '.js']
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      template: __dirname + '/public/index.html',
      inject: 'body'
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name]-[hash].css',
      chunkFilename: "css/[id].css"
    }),
    new CopyWebpackPlugin({
      patterns: [
        path.resolve(__dirname, 'public', 'favicon.png')
      ]
    })
  ],
  watchOptions: {
	  ignored: ['**/node_modules']
  },
  devServer: {
    compress: !!DOCKER_ENV,
    static: {
      directory: path.join(__dirname, 'dist/'),
      publicPath: '/'
    },
    ...(!DOCKER_ENV && {
      watchFiles: ['src/**/*', 'public/**/*'],
      liveReload: true,
      client: {
        progress: true
      }
    })
  }
}

module.exports = (env /* , argv */) => {
  const NODE_ENV = env.NODE_ENV || getNodeEnv()
  const host = getHost()
  const port = getPort()

  config.devServer = {
    ...config.devServer,
    host,
    port,

    ...(!DOCKER_ENV && {
      open: {
        target: [`http://${host}:${port}`],
        app: {
          name: 'firefox',
          arguments: []
        }
      }
    })
  }

  switch (NODE_ENV) {
    case 'development':
      config.devtool = 'eval-source-map'
      config.mode = 'development'
      break;
    case 'production':
      config.mode = 'production'
      break

    default:
      break
  }

  return config
}
