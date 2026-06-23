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

  const dialog = document.createElement('dialog');
  body.append(dialog);
  dialog.setAttribute('id', 'preferencesDialog');

  const dialogTitle = document.createElement('h2');
  dialog.append(dialogTitle);
  dialogTitle.append('3D Renderer Preferences');

  const slidersContainer = document.createElement('div');
  dialog.append(slidersContainer);
  slidersContainer.setAttribute('class', 'sliders-grid');

  const preferencesKeys = [
    {key: 'cameraX', label: 'Camera X', min: -1000, max: 2000, step: 10, default: 450},
    {key: 'cameraY', label: 'Camera Y', min: -2000, max: 1000, step: 10, default: -500},
    {key: 'cameraZ', label: 'Camera Z', min: 100, max: 2000, step: 10, default: 450},
    {key: 'lookAtX', label: 'Look At X', min: -1000, max: 2000, step: 10, default: 460},
    {key: 'lookAtY', label: 'Look At Y', min: -2000, max: 1000, step: 10, default: -380},
    {key: 'lookAtZ', label: 'Look At Z', min: -500, max: 500, step: 5, default: 0}
  ] as const;

  for (const pref of preferencesKeys) {
    const group = document.createElement('div');
    slidersContainer.append(group);
    group.setAttribute('class', 'slider-group');

    const labelContainer = document.createElement('div');
    group.append(labelContainer);
    labelContainer.setAttribute('class', 'slider-label-container');

    const labelSpan = document.createElement('span');
    labelContainer.append(labelSpan);
    labelSpan.setAttribute('class', 'slider-label');
    labelSpan.append(pref.label);

    const valSpan = document.createElement('span');
    labelContainer.append(valSpan);
    valSpan.setAttribute('id', `${pref.key}Val`);
    valSpan.setAttribute('class', 'slider-value');
    valSpan.append(String(pref.default));

    const input = document.createElement('input');
    group.append(input);
    input.setAttribute('type', 'range');
    input.setAttribute('id', pref.key);
    input.setAttribute('min', String(pref.min));
    input.setAttribute('max', String(pref.max));
    input.setAttribute('step', String(pref.step));
    input.setAttribute('value', String(pref.default));
    input.setAttribute('class', 'slider-input');
  }

  const buttonsContainer = document.createElement('div');
  dialog.append(buttonsContainer);
  buttonsContainer.setAttribute('class', 'dialog-buttons');

  const closeButton = document.createElement('button');
  buttonsContainer.append(closeButton);
  closeButton.setAttribute('id', 'closePreferences');
  closeButton.append('Done');

  addScripts(document, body, 'main');

  domStream.end();
}
