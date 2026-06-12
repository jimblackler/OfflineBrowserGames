import type {Response} from 'express';
import type {Document, HTMLElement, Node} from '../common/domStreamTypes';

const VOID_ELEMENTS = {
  area: true,
  base: true,
  br: true,
  col: true,
  command: true,
  embed: true,
  hr: true,
  img: true,
  input: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true
};

class LocalNode implements Node {
  readonly ownerDocument: LocalDocument | undefined;

  constructor(ownerDocument?: LocalDocument) {
    this.ownerDocument = ownerDocument;
  }

  get useDocument() {
    if (!this.ownerDocument) {
      throw new Error();
    }
    return this.ownerDocument;
  }

  open() {

  }

  close() {

  }
}

class LocalElement extends LocalNode implements HTMLElement {
  readonly tagName: string;
  private mode: 'closed' | 'in_attributes' | 'in_children' | 'unopened';

  constructor(ownerDocument: LocalDocument, tagName: string, namespace?: string) {
    super(ownerDocument);
    this.tagName = tagName;
    this.mode = 'unopened';
  }

  open() {
    if (this.mode !== 'unopened') {
      throw new Error(`Attempt to add <${this.tagName}> twice.`);
    }
    this.mode = 'in_attributes';
    this.useDocument.write(`<${this.tagName}`);
  }

  close() {
    if (this.mode === 'in_attributes') {
      const lowerCaseTag = this.tagName.toLowerCase();
      if (lowerCaseTag in VOID_ELEMENTS) {
        this.useDocument.write('>');
      } else {
        this.useDocument.write(`></${this.tagName}>`);
      }
    } else if (this.mode === 'in_children') {
      this.useDocument.write(`</${this.tagName}>`);
    } else {
      throw new Error();
    }
    this.mode = 'closed';
  }

  setAttribute(name: string, value: string): void {
    switch (this.mode) {
      case 'unopened':
        throw new Error(`Attempt to setAttribute on <${this.tagName}> which has no parent`);
      case 'in_attributes':
        break;
      case 'in_children':
        throw new Error(`Attempt to setAttribute on <${this.tagName}> which already has children`);
      case 'closed':
        throw new Error(`Attempt to setAttribute on <${this.tagName}> \
            which has already had an element added to an ancestor`);
      default:
        throw new Error(`Unexpected mode ${this.mode}`);
    }
    this.useDocument.write(` ${name}="${
        value.split('&').join('&amp;').split('<').join('&lt;').split('"').join('&quot;')}"`);
  }

  append(...nodes: (LocalNode | string)[]): void {
    switch (this.mode) {
      case 'unopened':
        throw new Error(`Attempt to append to <${this.tagName}> which has no parent`);
      case 'in_attributes':
        this.useDocument.write('>');
        this.mode = 'in_children';
        break;
      case 'in_children':
        break;
      case 'closed':
        throw new Error(`Attempt to append to <${this.tagName}> \
            which has already had an element added to an ancestor`);
      default:
        throw new Error(`Unexpected mode ${this.mode}`);
    }
    for (const node of nodes) {
      if (typeof node === 'string') {
        this.useDocument.closeTo(this);
        this.useDocument.write(node.split('&').join('&amp;').split('<').join('&lt;')
            .split('>').join('&gt;').split('\'').join('&quot;').split('\'').join('&#039;'));
      } else {
        this.useDocument.newChild(node, this);
      }
    }
  }
}

class LocalHTMLElement extends LocalElement implements HTMLElement {

}

class LocalDocument extends LocalNode implements Document {
  documentElement: LocalHTMLElement;
  private readonly writer: (str: string) => void;
  private readonly activeStack: LocalNode[] = [];
  private _head?: LocalHTMLElement;
  private _body?: LocalHTMLElement;

  constructor(writer: (str: string) => void) {
    super();
    this.writer = writer;
    const element = this.createElement('html');
    this.documentElement = element;
    this.activeStack.push(element);
    element.open();
  }

  get head() {
    if (!this._head) {
      const head = this.createElement('head');
      this.documentElement.append(head);
      this._head = head;
    }
    return this._head;
  }

  get body() {
    if (!this._body) {
      const body = this.createElement('body');
      this.documentElement.append(body);
      this._body = body;
    }
    return this._body;
  }

  get useDocument() {
    return this;
  }

  close() {
    for (let idx = this.activeStack.length - 1; idx !== 0; idx--) {
      this.activeStack[idx]?.close();
    }
  }

  createElement(tagName: string): LocalHTMLElement {
    return new LocalHTMLElement(this, tagName);
  }

  createElementNS(namespace: string, tagName: string): LocalHTMLElement {
    // This is only supplied to maintain compatibility with common client/server code that uses this
    // method to create SVGs. Setting the namespace is not needed on the server.
    return new LocalHTMLElement(this, tagName);
  }

  newChild(child: LocalNode, parent: LocalNode) {
    this.closeTo(parent);
    this.activeStack.push(child);
    child.open();
  }

  closeTo(parent: LocalNode) {
    for (let idx = this.activeStack.length - 1; idx >= 0; idx--) {
      const node = this.activeStack[idx];
      if (parent === node) {
        this.activeStack.length = idx + 1;
        return;
      }
      node?.close();
    }
    throw new Error('Parent not on active stack');
  }

  write(str: string) {
    this.writer(str);
  }
}

export class DomStream {
  private readonly res: Response;
  private readonly _document: LocalDocument;

  constructor(res: Response) {
    this.res = res;

    this.res.setHeader('Content-Type', 'text/html');

    function writeString(str: string) {
      res.write(str);
    }

    writeString('<!DOCTYPE html>\n');
    this._document = new LocalDocument(writeString);
  }

  get document(): Document {
    return this._document;
  }

  end() {
    this._document.close();
    this.res.end();
  }
}
