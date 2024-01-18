export enum TagType {
  Partial = ">",
  ChangeTag = "=",
  UnEscaped = "&",
  UnEscapedAlias = "{",
  Section = "#",
  InvertedSection = "^",
  CloseSection = "/",
  Comment = "!",
}

export interface TextToken {
  [0]: "text";
  [1]: string;
  [2]: number;
  [3]: number;
}

export interface NameToken {
  [0]: "name";
  [1]: string;
  [2]: number;
  [3]: number;
}

export interface ChangeTagToken {
  [0]: TagType.ChangeTag;
  [1]: string;
  [2]: number;
  [3]: number;
}

export interface UnEscapedToken {
  [0]: TagType.UnEscaped;
  [1]: string;
  [2]: number;
  [3]: number;
}

export interface SectionToken {
  [0]: TagType.Section;
  [1]: string;
  [2]: number;
  [3]: number;
}

export interface NestedSectionToken extends SectionToken {
  [4]: NestedToken[];
  [5]: number;
}

export interface InvertedSectionToken {
  [0]: TagType.InvertedSection;
  [1]: string;
  [2]: number;
  [3]: number;
}

export interface NestedInvertedSectionToken extends InvertedSectionToken {
  [4]: NestedToken[];
  [5]: number;
}

export interface CloseSectionToken {
  [0]: TagType.CloseSection;
  [1]: string;
  [2]: number;
  [3]: number;
}

export interface CommentToken {
  [0]: TagType.Comment;
  [1]: string;
  [2]: number;
  [3]: number;
}

export interface PartialToken {
  [0]: TagType.Partial;
  [1]: string;
  [2]: number;
  [3]: number;
  [4]: string;
  [5]: number;
  [6]: boolean;
}

export type Token =
  | TextToken
  | NameToken
  | ChangeTagToken
  | UnEscapedToken
  | SectionToken
  | InvertedSectionToken
  | CloseSectionToken
  | CommentToken
  | PartialToken;

export type NestedToken = NestedSectionToken | NestedInvertedSectionToken;

export type ParsedToken =
  | TextToken
  | NameToken
  | ChangeTagToken
  | UnEscapedToken
  | CommentToken
  | PartialToken
  | NestedToken;
