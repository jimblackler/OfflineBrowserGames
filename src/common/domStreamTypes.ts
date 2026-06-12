export type Node = {
  readonly ownerDocument?: Document;
};

export type Element = Node & {
  readonly tagName: string;
};

export type HTMLElement = Element & {
  append(...nodes: (Node | string)[]): void;

  setAttribute(qualifiedName: string, value: string): void;
};

export type Document = Node & {
  documentElement: HTMLElement;
  head: HTMLElement;
  body: HTMLElement;

  createElement(tagName: string): HTMLElement;

  createElementNS(namespace: string, tagName: string): HTMLElement;
};
