const app = require('./service.js');
const metrics = require('./metrics.js');
const httpLogger = require('./logger.js').httpLogger;

if(app.use){
  app.use(metrics.requestTracker);
  app.use(httpLogger);
}

metrics.sendMetricsPeriodically(10000);
const port = process.argv[2] || 3000;
const {logError} = require('./logger.js');
if(app.use){
  app.use((err, req, res, next) => {
    logError(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
  });
}

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

