export type Paritals = PartialObject | PartialFunction;

export type PartialObject = Record<string, string>;

export type PartialFunction = (name: string) => string;
