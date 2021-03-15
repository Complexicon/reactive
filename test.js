const express = require('express');
const app = express();
const server = require('http').createServer(app);
const reactive = require('./packReact')({ __dirname, debug: true, hotreload: server });

// logger
app.use(require('morgan')('dev'));

// fastfail helper
app.use((_req, res, next) => {
	res.fail = (msg, code = 400) => {
		res.status(code).send({ 'error': msg })
		next('route')
	}
	next()
})

// middleware for POST requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes Here
app.use('/api-test', (_req, res) => res.fail('demo api route'));
app.use('/', reactive);

server.listen(3000, () => console.log("Express Server Started!"));