export class Source<InputValue> {
  readonly tokens: InputValue[];
  readonly offset: number;

  constructor(tokens: InputValue[], offset: number) {
    this.tokens = tokens;
    this.offset = offset;
  }

  public get isEnd(): boolean {
    return this.tokens.length <= this.offset;
  }

  public get currentToken(): InputValue {
    return this.tokens[this.offset];
  }

  public get next(): Source<InputValue> {
    return new Source<InputValue>(this.tokens, this.offset + 1);
  }
}

export enum ParseResultTag {
  Success,
  Failure,
}

type ParseSuccess<InputValue, OutputValue> = {
  tag: ParseResultTag.Success,
  value: OutputValue,
  source: Source<InputValue>,
};

type ParseFailure<ErrorValue> = {
  tag: ParseResultTag.Failure,
  error: ErrorValue,
};

export type ParseResult<InputValue, OutputValue, ErorrValue> = ParseSuccess<InputValue, OutputValue> | ParseFailure<ErorrValue>;

type ParserFunction<InputValue, OutputValue, ErrorValue> = (source: Source<InputValue>) => ParseResult<InputValue, OutputValue, ErrorValue>;

export class Parser<InputValue, OutputValue, ErrorValue> {
  private parser: ParserFunction<InputValue, OutputValue, ErrorValue>;

  constructor(parser: ParserFunction<InputValue, OutputValue, ErrorValue>) {
    this.parser = parser;
  }

  public parse(source: Source<InputValue>): ParseResult<InputValue, OutputValue, ErrorValue> {
    return this.parser(source);
  }

  public map<NewOutputValue>(f: (value: OutputValue) => NewOutputValue): Parser<InputValue, NewOutputValue, ErrorValue> {
    return new Parser(source => {
      const result = this.parse(source);
      switch (result.tag) {
        case ParseResultTag.Success:
          return { tag: ParseResultTag.Success, value: f(result.value), source: result.source };
        case ParseResultTag.Failure:
          return result;
      }
    });
  }

  public error<NewErrorValue>(error: NewErrorValue): Parser<InputValue, OutputValue, NewErrorValue> {
    return new Parser(source => {
      const result = this.parse(source);
      switch (result.tag) {
        case ParseResultTag.Success:
          return result;
        case ParseResultTag.Failure:
          return { tag: ParseResultTag.Failure, error };
      }
    });
  }

  public then<NextOutputValue>(nextParser: Parser<InputValue, NextOutputValue, ErrorValue>): Parser<InputValue, NextOutputValue, ErrorValue> {
    return new Parser(source => {
      const result = this.parse(source);
      switch (result.tag) {
        case ParseResultTag.Success:
          return nextParser.parse(result.source);
        case ParseResultTag.Failure:
          return result;
      }
    });
  }

  public skip<NextOutputValue>(nextParser: Parser<InputValue, NextOutputValue, ErrorValue>): Parser<InputValue, OutputValue, ErrorValue> {
    return new Parser(source => {
      const result = this.parse(source);
      switch (result.tag) {
        case ParseResultTag.Success:
          return nextParser.map(x => result.value).parse(result.source);
        case ParseResultTag.Failure:
          return result;
      }
    });
  }

  public many(): Parser<InputValue, OutputValue[], ErrorValue> {
    return new Parser(source => {
      const values: OutputValue[] = [];
      while (!source.isEnd) {
        const result = this.parse(source);
        switch (result.tag) {
          case ParseResultTag.Success:
            values.push(result.value);
            source = result.source;
            break;
          case ParseResultTag.Failure:
            return { tag: ParseResultTag.Success, value: values, source };
        }
      }
      return { tag: ParseResultTag.Success, value: values, source };
    });
  }

  public sepBy<O>(separatorParser: Parser<InputValue, O, ErrorValue>): Parser<InputValue, OutputValue[], null> {
    return alt(seq(this, separatorParser.then(this).many()).map(([x, xs]) => [x, ...xs]).error(null), succeed([]));
  }
}

type Predicate<T> = (x: T) => boolean;

export function when<InputValue>(predicate: Predicate<InputValue>): Parser<InputValue, InputValue, null> {
  return new Parser(source => {
    if (source.isEnd) return { tag: ParseResultTag.Failure, error: null };
    if (predicate(source.currentToken)) return { tag: ParseResultTag.Success, source: source.next, value: source.currentToken };
    return { tag: ParseResultTag.Failure, error: null };
  });
}

export function alt<InputValue, OutputValue>(...parsers: Parser<InputValue, OutputValue, unknown>[]): Parser<InputValue, OutputValue, null> {
  return new Parser(source => {
    for (const parser of parsers) {
      const result = parser.parse(source);
      if (result.tag === ParseResultTag.Success) return result;
    }
    return { tag: ParseResultTag.Failure, error: null };
  });
}

export function seq<InputValue, OutputValue1, OutputValue2, ErrorValue>(parser1: Parser<InputValue, OutputValue1, ErrorValue>, parser2: Parser<InputValue, OutputValue2, ErrorValue>): Parser<InputValue, [OutputValue1, OutputValue2], ErrorValue>;
export function seq<InputValue, OutputValue, ErrorValue>(...parsers: Parser<InputValue, OutputValue, ErrorValue>[]): Parser<InputValue, OutputValue[], ErrorValue> {
  return new Parser(source => {
    const values: OutputValue[] = [];
    for (const parser of parsers) {
      const result = parser.parse(source);
      switch (result.tag) {
        case ParseResultTag.Success:
          values.push(result.value);
          source = result.source;
          break;
        case ParseResultTag.Failure:
          return result;
      }
    }
    return { tag: ParseResultTag.Success, value: values, source };
  });
}

export function succeed<InputValue, OutputValue, ErrorValue>(value: OutputValue): Parser<InputValue, OutputValue, ErrorValue> {
  return new Parser(source => ({ tag: ParseResultTag.Success, value, source }));
}
