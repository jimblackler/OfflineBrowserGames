import type {NextFunction, Request, Response} from 'express';
import {DomStream} from '../domStream';
import {addScripts} from '../manifest';

export function mainHandler(req: Request, res: Response, _next: NextFunction) {
  const domStream = new DomStream(res);
  const {document} = domStream;

  const {head} = document;
  const metaContentType = document.createElement('meta');
  head.append(metaContentType);
  metaContentType.setAttribute('http-equiv', 'Content-Type');
  metaContentType.setAttribute('content', 'text/html; charset=ISO-8859-1');

  const titleElement = document.createElement('title');
  head.append(titleElement);
  titleElement.append('Offline Solitaire by Jim Blackler');

  const style = document.createElement('link');
  head.append(style);
  style.setAttribute('rel', 'stylesheet');
  style.setAttribute('type', 'text/css');
  style.setAttribute('href', 'styles/style.css');

  const {body} = document;

  const gameDiv = document.createElement('div');
  body.append(gameDiv);
  gameDiv.setAttribute('id', 'gameDiv');

  const guiDiv = document.createElement('div');
  body.append(guiDiv);
  guiDiv.setAttribute('id', 'guiDiv');

  const gears = document.createElement('span');
  guiDiv.append(gears);
  gears.setAttribute('id', 'gears');

  const menu = document.createElement('ul');
  guiDiv.append(menu);
  menu.setAttribute('id', 'menu');

  const lh = document.createElement('lh');
  menu.append(lh);
  const lhLink = document.createElement('a');
  lh.append(lhLink);
  lhLink.setAttribute('href', '#');
  lhLink.append('Offline Solitaire by Jim Blackler');

  const li1 = document.createElement('li');
  menu.append(li1);
  li1.setAttribute('id', 'newGame3');
  const a1 = document.createElement('a');
  li1.append(a1);
  a1.append('New game: three card draw');

  const li2 = document.createElement('li');
  menu.append(li2);
  li2.setAttribute('id', 'newGame1');
  const a2 = document.createElement('a');
  li2.append(a2);
  a2.append('New game: one card draw');

  const li3 = document.createElement('li');
  menu.append(li3);
  li3.setAttribute('id', 'redrawItem');
  const a3 = document.createElement('a');
  li3.append(a3);
  a3.append('Re-attempt same game');

  const li4 = document.createElement('li');
  menu.append(li4);
  li4.setAttribute('id', 'undoItem');
  const a4 = document.createElement('a');
  li4.append(a4);
  a4.append('Undo last move');

  const li5 = document.createElement('li');
  menu.append(li5);
  const a5 = document.createElement('a');
  li5.append(a5);
  a5.setAttribute('href', 'about');
  a5.append('About, rules and credits');

  const liPrefs = document.createElement('li');
  menu.append(liPrefs);
  liPrefs.setAttribute('id', 'threePreferencesItem');
  const aPrefs = document.createElement('a');
  liPrefs.append(aPrefs);
  aPrefs.append('3D Preferences');

  addScripts(document, body, 'main', false);

  domStream.end();
}
