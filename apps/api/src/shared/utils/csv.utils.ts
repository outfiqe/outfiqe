const FIELD_SEPARATOR = ",";
const QUOTE = '"';
const CARRIAGE_RETURN = "\r";
const LINE_FEED = "\n";
const BYTE_ORDER_MARK = "﻿";
const NEXT_CHARACTER_STEP = 1;
const ESCAPED_QUOTE_LENGTH = 2;

export class CsvParseError extends Error {}

type CsvParserState = {
  rows: string[][];
  currentRow: string[];
  currentField: string;
  isInsideQuotes: boolean;
};

const finishField = (state: CsvParserState) => {
  state.currentRow.push(state.currentField);
  state.currentField = "";
};

const finishRow = (state: CsvParserState) => {
  finishField(state);
  state.rows.push(state.currentRow);
  state.currentRow = [];
};

const isBlankRow = (row: readonly string[]) => row.every((field) => field.trim() === "");

const readQuotedCharacter = (state: CsvParserState, text: string, index: number): number => {
  const character = text[index];
  if (character !== QUOTE) {
    state.currentField += character;
    return NEXT_CHARACTER_STEP;
  }
  if (text[index + NEXT_CHARACTER_STEP] === QUOTE) {
    state.currentField += QUOTE;
    return ESCAPED_QUOTE_LENGTH;
  }
  state.isInsideQuotes = false;
  return NEXT_CHARACTER_STEP;
};

const readUnquotedCharacter = (state: CsvParserState, text: string, index: number): number => {
  const character = text[index];
  if (character === QUOTE && state.currentField === "") {
    state.isInsideQuotes = true;
  } else if (character === FIELD_SEPARATOR) {
    finishField(state);
  } else if (character === LINE_FEED) {
    finishRow(state);
  } else if (character !== CARRIAGE_RETURN) {
    state.currentField += character;
  }
  return NEXT_CHARACTER_STEP;
};

export const parseCsv = (text: string): string[][] => {
  const content = text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text;
  const state: CsvParserState = {
    rows: [],
    currentRow: [],
    currentField: "",
    isInsideQuotes: false,
  };

  let index = 0;
  while (index < content.length) {
    index += state.isInsideQuotes
      ? readQuotedCharacter(state, content, index)
      : readUnquotedCharacter(state, content, index);
  }
  if (state.isInsideQuotes) throw new CsvParseError("A quoted value is never closed.");
  finishRow(state);

  return state.rows.filter((row) => !isBlankRow(row));
};
