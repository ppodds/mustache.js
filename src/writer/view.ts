export type View =
  | ViewObject
  | LambdaViewFunction
  | Array<ViewObject>
  | ViewData;

export interface ViewObject {
  [key: string]:
    | ViewObject
    | LambdaViewFunction
    | ViewData
    | Array<ViewObject>
    | undefined;
}

export type LambdaViewFunction = () => ViewFunction;

export type ViewFunction = (text: string, render: RenderFunction) => string;

export type RenderFunction = (text: string) => string;

export type ViewData = string | number | boolean;
