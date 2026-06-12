import express, {type NextFunction, type Request, type Response} from 'express';
import parseurl from 'parseurl';
import send from 'send';
import {assertDefined} from '../common/check/defined';
import {assertNotNull} from '../common/check/null';
import {aboutHandler} from './handlers/aboutHandler';
import {mainHandler} from './handlers/mainHandler';

const app: express.Express = express();

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.route('/').get(mainHandler);
app.route('/about').get(aboutHandler);
app.route('/dist/{/*path}').get((req, res) => {
  res.set('Cache-Control', `public, max-age=${365 * 24 * 60 * 60}`);
  send(req, assertDefined(assertNotNull(parseurl(req)?.pathname)), {root: 'static'}).pipe(res);
});

app.use(express.static('static'));

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) {
    console.error('Error after header sent; cannot respond 400');
    console.error(err);
    res.end();
    return;
  }
  res.status(400).contentType('text/plain').send(String(err));
});

app.listen(process.env.PORT ?? 8082);
