import * as T from './tokens';

type TokenDefinition = {
  pattern: RegExp,
  gen: (m: RegExpMatchArray) => T.Token
};

const tokenDefinitions: TokenDefinition[] = [
  { pattern: /^==/, gen: () => ({ tag: T.TokenTag.EqualEqual }) },
  { pattern: /^!=/, gen: () => ({ tag: T.TokenTag.NotEqual }) },
  { pattern: /^<=/, gen: () => ({ tag: T.TokenTag.LessThanEqual }) },
  { pattern: /^</, gen: () => ({ tag: T.TokenTag.LessThan }) },
  { pattern: /^>=/, gen: () => ({ tag: T.TokenTag.GreaterThanEqual }) },
  { pattern: /^>/, gen: () => ({ tag: T.TokenTag.GreaterThan }) },
  { pattern: /^=/, gen: () => ({ tag: T.TokenTag.Equal }) },
  { pattern: /^&&/, gen: () => ({ tag: T.TokenTag.And }) },
  { pattern: /^\|\|/, gen: () => ({ tag: T.TokenTag.Or }) },
  { pattern: /^!/, gen: () => ({ tag: T.TokenTag.Not }) },
  { pattern: /^->/, gen: () => ({ tag: T.TokenTag.Arrow }) },
  { pattern: /^\+/, gen: () => ({ tag: T.TokenTag.Plus }) },
  { pattern: /^-/, gen: () => ({ tag: T.TokenTag.Minus }) },
  { pattern: /^\*/, gen: () => ({ tag: T.TokenTag.Asterisk }) },
  { pattern: /^\//, gen: () => ({ tag: T.TokenTag.Slash }) },
  { pattern: /^%/, gen: () => ({ tag: T.TokenTag.Percent }) },
  { pattern: /^\\/, gen: () => ({ tag: T.TokenTag.BackSlash }) },
  { pattern: /^if/, gen: () => ({ tag: T.TokenTag.If }) },
  { pattern: /^then/, gen: () => ({ tag: T.TokenTag.Then }) },
  { pattern: /^else/, gen: () => ({ tag: T.TokenTag.Else }) },
  { pattern: /^\(/, gen: () => ({ tag: T.TokenTag.OpenParenthesis }) },
  { pattern: /^\)/, gen: () => ({ tag: T.TokenTag.CloseParenthesis }) },
  { pattern: /^\[/, gen: () => ({ tag: T.TokenTag.OpenSquareBracket }) },
  { pattern: /^\]/, gen: () => ({ tag: T.TokenTag.CloseSquareBracket }) },
  { pattern: /^{/, gen: () => ({ tag: T.TokenTag.OpenBrace }) },
  { pattern: /^}/, gen: () => ({ tag: T.TokenTag.CloseBrace }) },
  { pattern: /^;/, gen: () => ({ tag: T.TokenTag.Semicolon }) },
  { pattern: /^,/, gen: () => ({ tag: T.TokenTag.Comma }) },
  { pattern: /^[0-9]+/, gen: m => ({ tag: T.TokenTag.Number, number: parseInt(m[0]) }) },
  { pattern: /^"(([^\\"]|\\.)*)"/, gen: m => ({ tag: T.TokenTag.String, string: unescapeSequence(m[1]) }) },
  { pattern: /^[a-zA-Z_]+/, gen: m => ({ tag: T.TokenTag.Identifier, identifier: m[0] }) },
];

export class UnknownTokenError extends Error {
  public token: string;

  constructor(message: string, token: string) {
    super(message);
    this.token = token;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnknownTokenError);
    }
  }
}

export function scan(source: string): T.Token[] {
  const tokens: T.Token[] = [];
  let prevLength = source.length;
  while (source.length > 0) {
    source = source.replace(/^[\s\n]/, '');
    for (const tokenDefinition of tokenDefinitions) {
      const m = source.match(tokenDefinition.pattern);
      if (m !== null) {
        tokens.push(tokenDefinition.gen(m));
        source = source.slice(m[0].length);
        break;
      }
    }
    if (source.length === prevLength) throw new UnknownTokenError(`Unknown token: ${source[0]}`, source[0]);
    prevLength = source.length;
  }
  return tokens;
}

function unescapeSequence(s: string): string {
  return s
    .replace('\\n', '\n')
    .replace('\\r', '\r')
    .replace('\\t', '\t')
    .replace('\\"', '"')
    .replace('\\\\', '\\');
}
