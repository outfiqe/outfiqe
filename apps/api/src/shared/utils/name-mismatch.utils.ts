const NAME_PUNCTUATION = /[.,]/g;

const normalizeName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, " ");

const sortedNameWords = (name: string): string[] =>
  normalizeName(name.replace(NAME_PUNCTUATION, " "))
    .split(" ")
    .filter(Boolean)
    .sort((firstWord, secondWord) => firstWord.localeCompare(secondWord));

export const isNameMismatch = (accountName: string, legalName: string): boolean =>
  normalizeName(accountName) !== normalizeName(legalName);

export const isSameNameIgnoringWordOrder = (firstName: string, secondName: string): boolean =>
  sortedNameWords(firstName).join(" ") === sortedNameWords(secondName).join(" ");
