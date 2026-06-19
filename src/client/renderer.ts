export type DragHandler = {
  cardClickedOrDropped(card: number | undefined, click: boolean): void;
  startDrag(cardNumber: number): number[];
};

export type Renderer = {
  placeHolder(x: number, y: number, onClick?: (ev: MouseEvent) => void): void;
  setFaceUp(cardNumber: number, faceUp: boolean): void;
  setDraggable(cardNumber: number, draggable: boolean): void;
  getCardPosition(cardNumber: number): [number, number, number];
  positionCard(cardNumber: number, x: number, y: number, z: number): void;
  setDragHandler(handler: DragHandler): void;
};
