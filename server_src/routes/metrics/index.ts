import { Express } from 'express'

const { collectDefaultMetrics, register } = require('prom-client');
collectDefaultMetrics()

export default async function metrics(app: Express) {
    
    app.get('/prommetrics', async (_req, res) => {
        try {
          res.set('Content-Type', register.contentType);
          res.end(await register.metrics());
        } catch (err) {
          res.status(500).end(err);
        }
      });

}