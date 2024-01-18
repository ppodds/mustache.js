import { Tags } from "./tags";

export type WriterConfigObject = {
  escape?: EscapeFunction;
  tags?: Tags;
};

export type WriterConfigWithTagsOnly = Tags;

export type EscapeFunction = (str: string) => string;

export type WriterConfig = WriterConfigObject | WriterConfigWithTagsOnly;
