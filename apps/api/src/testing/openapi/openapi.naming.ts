import { WORD_CASE_OVERRIDES } from "./openapi.constants.js";
import type { DocumentedHttpMethod } from "./openapi.types.js";

const EXPRESS_PATH_PARAM_PATTERN = /:(\w+)/g;
const OPENAPI_PATH_PARAM_PATTERN = /^\{\w+\}$/;
const WORD_BOUNDARY_PATTERN = /[-_\s]+|(?<=[a-z0-9])(?=[A-Z])/;
const MODULES_FOLDER = "modules";
const APP_ROOT_TAG = "Health";
const TAG_SEPARATOR = " ";
const SINGLE_WORD_COUNT = 1;
const FIRST_CHARACTER_INDEX = 0;
const REST_OF_WORD_START = 1;
const PLURAL_ENDINGS: [ending: string, singularEnding: string][] = [
  ["ies", "y"],
  ["sses", "ss"],
  ["ches", "ch"],
  ["shes", "sh"],
  ["s", ""],
];

const splitIntoWords = (identifier: string): string[] =>
  identifier.split(WORD_BOUNDARY_PATTERN).filter(Boolean);

const toDisplayWord = (word: string): string =>
  WORD_CASE_OVERRIDES[word.toLowerCase()] ?? word.toLowerCase();

const capitalizeFirstWord = (phrase: string): string =>
  phrase.charAt(FIRST_CHARACTER_INDEX).toUpperCase() + phrase.slice(REST_OF_WORD_START);

export const humanizeIdentifier = (identifier: string): string =>
  capitalizeFirstWord(splitIntoWords(identifier).map(toDisplayWord).join(" "));

const singularizeWord = (word: string): string => {
  const matchingEnding = PLURAL_ENDINGS.find(([ending]) => word.endsWith(ending));
  if (!matchingEnding || word.endsWith("ss")) return word;
  const [ending, singularEnding] = matchingEnding;
  return word.slice(0, -ending.length) + singularEnding;
};

export const toOpenApiPath = (expressPath: string): string =>
  expressPath.replace(EXPRESS_PATH_PARAM_PATTERN, "{$1}");

export const listPathParamNames = (expressPath: string): string[] =>
  [...expressPath.matchAll(EXPRESS_PATH_PARAM_PATTERN)].flatMap(([, paramName]) =>
    paramName ? [paramName] : [],
  );

export const toOperationKey = (method: DocumentedHttpMethod, openApiPath: string): string =>
  `${method.toUpperCase()} ${openApiPath}`;

export const toOperationId = (method: DocumentedHttpMethod, openApiPath: string): string =>
  [method, ...openApiPath.split("/").filter(Boolean)]
    .map((segment) => segment.replace(/[{}]/g, "").replace(/[^A-Za-z0-9]+/g, "-"))
    .join("-");

const describeResource = (openApiPath: string): string => {
  const segments = openApiPath.split("/").filter(Boolean);
  const staticSegmentPositions = segments.flatMap((segment, position) =>
    OPENAPI_PATH_PARAM_PATTERN.test(segment) ? [] : [position],
  );
  const lastStaticPosition = staticSegmentPositions.at(-SINGLE_WORD_COUNT) ?? segments.length;
  const lastStaticSegment = segments[lastStaticPosition] ?? "";
  const isSingleRecord = lastStaticPosition < segments.length - SINGLE_WORD_COUNT;
  const resourceWords = splitIntoWords(lastStaticSegment).map(toDisplayWord);
  if (isSingleRecord && resourceWords.length > 0) {
    resourceWords.push(singularizeWord(resourceWords.pop() ?? ""));
  }
  return resourceWords.join(" ");
};

export const toOperationSummary = (handlerName: string, openApiPath: string): string => {
  const handlerWords = splitIntoWords(handlerName);
  const hasUsableHandlerName = handlerWords.length > 0 && !handlerName.startsWith("<");
  if (!hasUsableHandlerName) return capitalizeFirstWord(describeResource(openApiPath));

  const actionPhrase = humanizeIdentifier(handlerName);
  if (handlerWords.length > SINGLE_WORD_COUNT) return actionPhrase;

  const resourcePhrase = describeResource(openApiPath);
  const isResourceAlreadyNamed =
    singularizeWord(resourcePhrase.toLowerCase()) === singularizeWord(actionPhrase.toLowerCase());
  return isResourceAlreadyNamed || !resourcePhrase
    ? actionPhrase
    : `${actionPhrase} ${resourcePhrase}`;
};

export const toTagFolder = (sourceFile: string | undefined): string | undefined => {
  if (!sourceFile) return undefined;
  const folders = sourceFile.split("/").slice(0, -SINGLE_WORD_COUNT);
  return folders[FIRST_CHARACTER_INDEX] === MODULES_FOLDER
    ? folders.slice(REST_OF_WORD_START).join("/")
    : undefined;
};

export const toTagName = (tagFolder: string | undefined): string => {
  if (!tagFolder) return APP_ROOT_TAG;
  const [moduleFolder = "", ...topicFolders] = tagFolder.split("/");
  const moduleName = humanizeIdentifier(moduleFolder);
  const lastTopicFolder = topicFolders.at(-SINGLE_WORD_COUNT);
  return lastTopicFolder
    ? `${moduleName}${TAG_SEPARATOR}${splitIntoWords(lastTopicFolder).map(toDisplayWord).join(" ")}`
    : moduleName;
};
