import type {NextFunction, Request, Response} from 'express';
import {DomStream} from '../domStream';

export function aboutHandler(req: Request, res: Response, _next: NextFunction) {
  const domStream = new DomStream(res);
  const {document} = domStream;

  const {head} = document;
  const titleElement = document.createElement('title');
  head.append(titleElement);
  titleElement.append('Offline Solitaire');

  const style = document.createElement('link');
  head.append(style);
  style.setAttribute('rel', 'stylesheet');
  style.setAttribute('type', 'text/css');
  style.setAttribute('href', 'styles/about.css');

  const {body} = document;

  const h1First = document.createElement('h1');
  body.append(h1First);
  h1First.append('Rules of Klondike Solitaire');

  const img = document.createElement('img');
  body.append(img);
  img.setAttribute('src', 'images/rules_illustration.png');

  const p1 = document.createElement('p');
  body.append(p1);
  p1.append(
    'A' +
      ' standard deck of 52 playing cards is shuffled. Cards are dealt onto the \'tableaux\',' +
      ' an arrangement of seven columns on the bottom half of the playing area. In each tableau' +
      ' an increasing number of cards is placed from one to seven. All but the bottom card are' +
      ' dealt face down. The bottom card is dealt face up.'
  );

  const p2 = document.createElement('p');
  body.append(p2);
  p2.append(
    'The remaining cards are placed face down in the top left of the playing area. This' +
      ' is the \'stock\'.'
  );

  const p3 = document.createElement('p');
  body.append(p3);
  p3.append(
    'At any time the player can deal (depending on settings) one or three cards (facing them' +
      ' up) from the stock to a \'waste\' pile to the right of the stock. If there are just' +
      ' one or two cards remaining in the stock all the remaining cards can be dealt to the' +
      ' stock. If there are no cards in the stock the player can take all the waste cards and' +
      ' return them, face down, to the stock area.'
  );

  const p4 = document.createElement('p');
  body.append(p4);
  p4.append(
    'The objective of the game is to move all of the cards to the' +
      ' \'foundations\', four slots for cards on the top right of the playing area. The player' +
      ' may move any ace card from the top of the waste or the bottom of any of the tableau' +
      ' columns onto any empty foundation slot. When a foundation slot is occupied, the player' +
      ' may move any single card (from the top of the waste or bottom of the tableau) onto' +
      ' a foundation, provided it is the same suit and one higher in value than the top' +
      ' occupying card.'
  );

  const p5 = document.createElement('p');
  body.append(p5);
  p5.append(
    'The player may also move certain cards onto the tableaux. The criteria' +
      ' is that the moved card must be of opposite color suit and exactly one fewer value' +
      ' of the bottom card of the tableau column moved onto. The cards that can be moved' +
      ' are any single card that meets the criteria from the waste or top of a foundation;' +
      ' or any single card or group of cards taken from the bottom of a tableau where the' +
      ' top card of the group meets the criteria.'
  );

  const h1Second = document.createElement('h1');
  body.append(h1Second);
  h1Second.append('Credits / Licenses');

  const p6 = document.createElement('p');
  body.append(p6);
  p6.append('Offline Solitaire by Jim Blackler. Contact: ');
  const aMail = document.createElement('a');
  p6.append(aMail);
  aMail.setAttribute('href', 'mailto:jimblackler@gmail.com');
  aMail.append('jimblackler@gmail.com');

  const p7 = document.createElement('p');
  body.append(p7);
  p7.append(
    'Original parts of the program are Free Software offered with a GPL license.' +
      ' (c) Jim Blackler 2011'
  );

  const pre1 = document.createElement('pre');
  body.append(pre1);
  pre1.append(
    'This program is free software: you can redistribute it and/or modify\n' +
      'it under the terms of the GNU General Public License as published by\n' +
      'the Free Software Foundation, either version 3 of the License, or\n' +
      '(at your option) any later version.\n\n' +
      'This program is distributed in the hope that it will be useful,\n' +
      'but WITHOUT ANY WARRANTY; without even the implied warranty of\n' +
      'MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n' +
      'GNU General Public License for more details.'
  );

  const p8 = document.createElement('p');
  body.append(p8);
  p8.append('Original visual elements are offered with a GPL license. ');
  const aCC = document.createElement('a');
  p8.append(aCC);
  aCC.setAttribute('href', 'http://creativecommons.org/licenses/by/3.0/');
  aCC.append('Creative Commons Attribution 3.0 Unported (CC BY 3.0)');

  const p9 = document.createElement('p');
  body.append(p9);
  p9.append('Since the 2019 edition, playing cards are modified ');
  const aRevK = document.createElement('a');
  p9.append(aRevK);
  aRevK.setAttribute(
    'href',
    'https://www.revk.uk/2018/06/svg-vector-playing-cards.html'
  );
  aRevK.append('from a design by Rev K');
  p9.append('.\n\nLicensed under ');
  const aCC0 = document.createElement('a');
  p9.append(aCC0);
  aCC0.setAttribute(
    'href',
    'https://creativecommons.org/publicdomain/zero/1.0/legalcode'
  );
  aCC0.append('CC0 Public Domain');

  const p10 = document.createElement('p');
  body.append(p10);
  p10.append(
    'Playing card backs are based on a design by David Bellot. Licensed under LGPL. '
  );
  const aBellot = document.createElement('a');
  p10.append(aBellot);
  aBellot.setAttribute(
    'href',
    'http://commons.wikimedia.org/wiki/File:Card_back_01.svg'
  );
  aBellot.append('http://commons.wikimedia.org/wiki/File:Card_back_01.svg');

  const pre2 = document.createElement('pre');
  body.append(pre2);
  pre2.append(
    'This library is free software; you can redistribute it and/or modify it under the terms of the GNU\n' +
      'Lesser General Public License as published by the Free Software Foundation; either version 2.1 of\n' +
      'the License, or (at your option) any later version. This library is distributed in the hope that it\n' +
      'will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of merchantability or\n' +
      'fitness for a particular purpose. See version 2.1 and version 3 of the GNU Lesser General Public\n' +
      'License for more details.\n'
  );

  const p11 = document.createElement('p');
  body.append(p11);
  p11.append(
    'Random number generator \'Alea\' by Johannes Baag\u00F8e used under MIT Expat license.'
  );
  const aAlea = document.createElement('a');
  p11.append(aAlea);
  aAlea.setAttribute('href', 'http://baagoe.com/en/RandomMusings/javascript');
  aAlea.append('http://baagoe.com/en/RandomMusings/javascript');

  const pre3 = document.createElement('pre');
  body.append(pre3);
  pre3.append(
    'Copyright (C) 2010 by Johannes Baag\u00F8e baagoe@baagoe.org\n\n' +
      'Permission is hereby granted, free of charge, to any person obtaining a copy of\n' +
      'this software and associated documentation files (the "Software"), to deal in\n' +
      'the Software without restriction, including without limitation the rights to\n' +
      'use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies\n' +
      'of the Software, and to permit persons to whom the Software is furnished to do\n' +
      'so, subject to the following conditions:\n\n' +
      'The above copyright notice and this permission notice shall be included in all\n' +
      'copies or substantial portions of the Software.\n\n' +
      'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n' +
      'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n' +
      'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n' +
      'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n' +
      'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n' +
      'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\n' +
      'SOFTWARE.\n'
  );

  domStream.end();
}
