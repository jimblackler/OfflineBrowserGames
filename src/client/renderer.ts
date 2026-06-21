export type DragHandler = {
  startDrag(cardNumber: number): void;
  drag(dx: number, dy: number): void;
  endDrag(click: boolean): void;
};

export type Renderer = {
  placeHolder(x: number, y: number, onClick?: (ev: MouseEvent) => void): void;
  setFaceUp(cardNumber: number, faceUp: boolean): void;
  setDraggable(cardNumber: number, draggable: boolean): void;
  positionCard(cardNumber: number, x: number, y: number, z: number): void;
  setDragHandler(handler: DragHandler): void;
};
