const cliOptions = require('command-line-args')
const morgan = require('morgan')
const { engine } = require('express-handlebars')
const express = require('express')
const metrics = require('./metrics')
const winston = require('winston')
const expressWinston = require('express-winston')

const rnd = (range = 14, total = 4) => {
	const nums = []

	for (let i = 0; i < range; i++)
		nums.push(i)

	for (let i = 0; i < range; i++) {
		const idx = Math.floor(Math.random() * range)
		const t = nums[i]
		nums[i] = nums[idx]
		nums[idx] = t
	}

	return nums.splice(0, total)
}

let opt = {}

try {
	opt = cliOptions([ 
		{ name: 'port', alias: 'p', type: Number },
		{ name: 'metricsPort', alias: 'm', type: String },
		{ name: 'name', alias: 'n', type: String },
		{ name: 'hash', type: String },
		{ name: 'promtailHost', type: String },
		{ name: 'promtailPort', type: Number, defaultValue: 5000 }
	])
} catch (err) {
	console.error('Parse CLI options error: ', err)
	if (!process.env.HEROKU_WORKAROUND)
		throw(err)
	opt = {}
}

const port = opt['port'] || opt['p'] || parseInt(process.env.PORT) || 3000
const instanceName = opt['name'] || opt['n'] || process.env.INSTANCE_NAME || 'dov-bear'
const instanceHash = opt['hash'] || process.env.INSTANCE_HASH || '' 
const promtailHost = opt['promtailHost'] || !!process.env.PROMTAIL_HOST || ''
const promtailPort = opt['promtailPort'] || parseInt(process.env.PROMTAIL_PORT) || 0


// Prometheus
const metricsPort = opt['metricsPort'] || opt['m'] || parseInt(process.env.METRICS_PORT) || 3100
const { meter, exporter } = metrics(metricsPort)

// Create metrics
const requestCounter = meter.createCounter('request_total'
	, { description: 'Number of request' }
)
const imageCounters = [...Array(14).keys()]
		.map(i => meter.createCounter('dovs', { 
				description: `Image dov${i}.gif`,
			})
		)
const requestDuration = meter.createHistogram('request_duration_ms'
	, { description: 'Request duration' }
)
const requestInflight = meter.createUpDownCounter('request_inflight_total'
	, { description: 'Total number of inflight requests' }
)

const transports = [
	new winston.transports.Console()
]

if (!!promtailHost) 
	transports.push(
		new winston.transports.Http({
			host: promtailHost,
			port: promtailPort,
			path: '/promtail/api/v1/raw',
			//batch: true,
			//batchInterval: 5000,
			//batchCount: 10
		})
	)

const logger = winston.createLogger({
	format: winston.format.json(),
	defaultMeta: { 
		instance: instanceName, 
		hash: instanceHash
	},
	transports
})

// logger
var expressLogger = expressWinston.logger({
	winstonInstance: logger,
	defaultMeta: { 
		instance: instanceName, 
		hash: instanceHash,
		//service_name: 'dov-bear'
	},
	//format: winston.format.json(),
	//transports,
	ignoreRoute: (req) => req.path.endsWith('/healthz')
})

const app = express()

app.engine('hbs', engine({ defaultLayout: 'main.hbs' }))
app.set('view engine', 'hbs')

app.use(expressLogger)

app.get('/healthz', (req, resp) => {
	resp.status(204).end()
})

app.use(express.static(__dirname + '/public'))

app.get([ '/', '/index.html' ], (req, resp) => {
	requestInflight.add(1, 
		{ name: instanceName, pid: process.pid })
	req.on('end', () => {
	requestInflight.add(-1, 
		{ name: instanceName, pid: process.pid })
	})
	const total = parseInt(req.query['num']) || 4
	const dovs = rnd(14, total)
	const start = (new Date()).getTime()
	resp.status(200).type('text/html')
	resp.render('index', { dovs, instanceName, instanceHash })
	requestCounter.add(1, 
		{ name: instanceName, pid: process.pid }
	)
	dovs.map(v => imageCounters[v].add(1, 
		{ name: instanceName, pid: process.pid, image_number: v })
	)
	const stop = (new Date()).getTime()
	requestDuration.record(stop - start, 
		{ name: instanceName, pid: process.pid }
	)
})

exporter.startServer()
	.then(() => {
		app.listen(port, () => {
			console.info(`Application started on port ${port} at ${new Date()}`)
			console.info(`Metrics endpoint at /metrics on port ${metricsPort}`)
			if (!!promtailHost)
				console.info(`Central logging at ${promtailHost}:${promtailPort}`)
		})
	})
	.catch(error => {
		console.error('Cannot start metrics: ', error)
	})


