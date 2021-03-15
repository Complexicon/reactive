const webpack = require('webpack');
const express = require('express');
const path = require('path');
const fs = require('fs')
const cheerio = require('cheerio');
const chalk = require('chalk')
const ws = require('ws')

var hotreloadClients = [];

const wsk = new ws.Server({ noServer: true });
wsk.on('connection', socket => hotreloadClients.push(socket));


module.exports = function (options) {

	const dest = '/' + (options.dest ? options.dest : 'bundle');
	const reactPath = '/' + (options.reactSrc ? options.reactSrc : 'react');
	const root = options.root;

	if (options.hotreload) {
		options.hotreload.server.on('upgrade', (request, socket, head) => {
			wsk.handleUpgrade(request, socket, head, socket => wsk.emit('connection', socket, request));
		});
	}

	const config = {
		entry: root + reactPath + '/App.js',
		output: {
			path: root + dest,
			filename: 'bundle.js',
			clean: true,
		},
		mode: (options.debug ? 'development' : 'production'),
		devtool: (options.debug ? 'eval-cheap-module-source-map' : undefined),
		externals: {
			'react': 'React',
			'react-dom': 'ReactDOM'
		},
		module: {
			rules: [
				{
					test: /\.s[ac]ss$/i,
					use: [
						"style-loader",
						"css-loader",
						"sass-loader",
					],
				},
				{
					test: /\.css$/,
					use: ["style-loader", "css-loader"]
				},
				{
					test: /\.jsx?$/,
					exclude: /node_modules/,
					loader: 'babel-loader',
					options: {
						presets: [['@babel/preset-env', {
							useBuiltIns: 'usage',
							corejs: "3",
							targets: {
								browsers: ['last 2 versions'],
							},
						}], '@babel/preset-react']
					}
				},
				{
					test: /\.(png|jpe?g|gif)$/i,
					use: [
						{
							loader: 'file-loader',
						},
					],
				},
			]
		}
	}

	const compiler = webpack(config);

	if (options.debug) {
		compiler.watch({ aggregateTimeout: 200, ignored: '**/node_modules', poll: 1000 }, WebpackFormatter)
		//require('child_process').exec((process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open') + ' http://localhost:3000');
	} else compiler.run(WebpackFormatter);

	const router = express.Router();

	router.get('*', function (req, res) {
		const lastPartUrl = req.path.substr(req.path.lastIndexOf('/'));

		if (lastPartUrl !== '/' && fs.existsSync(root + dest + req.path)) {
			res.sendFile(root + dest + req.path)
		} else {
			const $ = cheerio.load(fs.readFileSync(root + reactPath + '/index.html'));

			const scriptType = options.debug ? 'development' : 'production.min';

			$('#react').attr('src', `https://unpkg.com/react@${require('react').version}/umd/react.${scriptType}.js`)
			$('#react-dom').attr('src', `https://unpkg.com/react-dom@${require('react-dom').version}/umd/react-dom.${scriptType}.js`)

			if (options.debug && options.hotreload) $('body').append("<script>new WebSocket('ws://localhost:3000').onmessage = event => event.data == 'reload' && this.window.location.reload();</script>")

			res.send($.html());
		}

	});

	return router;

}

function WebpackFormatter(err, stats) {
	console.log()
	console.log(chalk.cyan(stats.toString()))
	console.log()
	hotreloadClients.forEach(sock => sock.send('reload'));
}