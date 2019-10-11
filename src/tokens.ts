export enum TokenTag {
  EqualEqual,
  NotEqual,
  LessThan,
  LessThanEqual,
  GreaterThan,
  GreaterThanEqual,
  And,
  Or,
  Not,
  Equal,
  Plus,
  Minus,
  Asterisk,
  Slash,
  Percent,
  BackSlash,
  Arrow,
  If,
  Then,
  Else,
  OpenParenthesis,
  CloseParenthesis,
  OpenSquareBracket,
  CloseSquareBracket,
  OpenBrace,
  CloseBrace,
  Semicolon,
  Comma,
  Number,
  String,
  Identifier,
}

export type EqualEqualToken = {
  tag: TokenTag.EqualEqual,
};

export type NotEqualToken = {
  tag: TokenTag.NotEqual,
};

export type LessThanToken = {
  tag: TokenTag.LessThan,
};

export type LessThanEqualToken = {
  tag: TokenTag.LessThanEqual,
};

export type GreaterThanToken = {
  tag: TokenTag.GreaterThan,
};

export type GreaterThanEqualToken = {
  tag: TokenTag.GreaterThanEqual,
};

export type AndToken = {
  tag: TokenTag.And,
};

export type OrToken = {
  tag: TokenTag.Or,
};

export type NotToken = {
  tag: TokenTag.Not,
}

export type EqualToken = {
  tag: TokenTag.Equal,
};

export type PlusToken = {
  tag: TokenTag.Plus,
};

export type MinusToken = {
  tag: TokenTag.Minus,
};

export type AsteriskToken = {
  tag: TokenTag.Asterisk,
};

export type SlashToken = {
  tag: TokenTag.Slash,
};

export type PercentToken = {
  tag: TokenTag.Percent,
};

export type BackSlashToken = {
  tag: TokenTag.BackSlash,
};

export type ArrowToken = {
  tag: TokenTag.Arrow,
};

export type IfToken = {
  tag: TokenTag.If,
};

export type ThenToken = {
  tag: TokenTag.Then,
};

export type ElseToken = {
  tag: TokenTag.Else,
};

export type OpenParenthesisToken = {
  tag: TokenTag.OpenParenthesis,
};

export type CloseParenthesisToken = {
  tag: TokenTag.CloseParenthesis,
};

export type OpenSquareBracketToken = {
  tag: TokenTag.OpenSquareBracket,
};

export type CloseSquareBracketToken = {
  tag: TokenTag.CloseSquareBracket,
};

export type OpenBraceToken = {
  tag: TokenTag.OpenBrace,
};

export type CloseBraceToken = {
  tag: TokenTag.CloseBrace,
};

export type SemicolonToken = {
  tag: TokenTag.Semicolon,
};

export type CommaToken = {
  tag: TokenTag.Comma,
}

export type NumberToken = {
  tag: TokenTag.Number,
  number: number,
};

export type StringToken = {
  tag: TokenTag.String,
  string: string,
}

export type IdentifierToken = {
  tag: TokenTag.Identifier,
  identifier: string,
};

export type Token
  = EqualEqualToken
  | NotEqualToken
  | LessThanToken
  | LessThanEqualToken
  | GreaterThanToken
  | GreaterThanEqualToken
  | AndToken
  | OrToken
  | NotToken
  | EqualToken
  | PlusToken
  | MinusToken
  | AsteriskToken
  | SlashToken
  | PercentToken
  | BackSlashToken
  | ArrowToken
  | IfToken
  | ThenToken
  | ElseToken
  | OpenParenthesisToken
  | CloseParenthesisToken
  | OpenSquareBracketToken
  | CloseSquareBracketToken
  | OpenBraceToken
  | CloseBraceToken
  | SemicolonToken
  | CommaToken
  | NumberToken
  | StringToken
  | IdentifierToken;
