import { normalizeExampleValues } from "./openapi.example-normalizer.js";
import type { EndpointExample, ExamplesByOperation, RecordedExchange } from "./openapi.types.js";

type OperationMatcher = {
  operationKey: string;
  method: string;
  pathPattern: RegExp;
  staticSegmentCount: number;
};

const PATH_PARAM_SEGMENT_PATTERN = /^\{\w+\}$/;
const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;
const MAX_EXAMPLE_CHARACTERS = 6000;
const OPERATION_KEY_SEPARATOR = " ";
const HEX_RUN_PATTERN = /[0-9a-f]{4,}/gi;
const DIGIT_PATTERN = /\d/;
const RANDOM_TOKEN_MARKER = "#";

const maskRandomTokens = (serializedExample: string): string =>
  serializedExample.replace(HEX_RUN_PATTERN, (hexRun) =>
    DIGIT_PATTERN.test(hexRun) ? RANDOM_TOKEN_MARKER : hexRun,
  );

export const toComparableExample = (example: EndpointExample): string =>
  maskRandomTokens(JSON.stringify(example));

const toPathPattern = (openApiPath: string): RegExp => {
  const segmentPatterns = openApiPath
    .split("/")
    .map((segment) =>
      PATH_PARAM_SEGMENT_PATTERN.test(segment)
        ? "[^/]+"
        : segment.replace(REGEX_SPECIAL_CHARACTERS, "\\$&"),
    );
  return new RegExp(`^${segmentPatterns.join("/")}/?$`);
};

const countStaticSegments = (openApiPath: string): number =>
  openApiPath.split("/").filter((segment) => segment && !PATH_PARAM_SEGMENT_PATTERN.test(segment))
    .length;

export const buildOperationMatchers = (operationKeys: string[]): OperationMatcher[] =>
  operationKeys
    .map((operationKey) => {
      const [method = "", openApiPath = ""] = operationKey.split(OPERATION_KEY_SEPARATOR);
      return {
        operationKey,
        method,
        pathPattern: toPathPattern(openApiPath),
        staticSegmentCount: countStaticSegments(openApiPath),
      };
    })
    .sort((first, second) => second.staticSegmentCount - first.staticSegmentCount);

const findOperationKey = (matchers: OperationMatcher[], { method, path }: RecordedExchange) =>
  matchers.find(
    (matcher) => matcher.method === method.toUpperCase() && matcher.pathPattern.test(path),
  )?.operationKey;

const toNormalizedExample = ({ status, query, requestBody, responseBody }: RecordedExchange) => {
  const [normalizedQuery, normalizedRequestBody, normalizedResponseBody] = normalizeExampleValues([
    query,
    requestBody,
    responseBody,
  ]);
  const example: EndpointExample = {
    status,
    query:
      typeof normalizedQuery === "object" &&
      normalizedQuery !== null &&
      !Array.isArray(normalizedQuery)
        ? normalizedQuery
        : {},
    requestBody: normalizedRequestBody ?? null,
    responseBody: normalizedResponseBody ?? null,
  };
  return example;
};

const pickRichestExample = (candidates: EndpointExample[]): EndpointExample | undefined => {
  const rankedCandidates = candidates
    .map((candidate) => ({ candidate, comparable: toComparableExample(candidate) }))
    .sort(
      (first, second) =>
        Number(second.comparable.length <= MAX_EXAMPLE_CHARACTERS) -
          Number(first.comparable.length <= MAX_EXAMPLE_CHARACTERS) ||
        second.comparable.length - first.comparable.length ||
        first.comparable.localeCompare(second.comparable),
    );
  return rankedCandidates[0]?.candidate;
};

const keepSavedWhenOnlyRandomValuesDiffer = (
  savedExamples: EndpointExample[],
  freshExample: EndpointExample,
): EndpointExample => {
  const savedExample = savedExamples.find(({ status }) => status === freshExample.status);
  const isSameApartFromRandomValues =
    savedExample !== undefined &&
    toComparableExample(savedExample) === toComparableExample(freshExample);
  return isSameApartFromRandomValues ? savedExample : freshExample;
};

export const keepUnchangedExamples = (
  savedExamplesByOperation: ExamplesByOperation,
  freshExamplesByOperation: ExamplesByOperation,
): ExamplesByOperation =>
  Object.fromEntries(
    Object.entries(freshExamplesByOperation).map(([operationKey, freshExamples]) => [
      operationKey,
      freshExamples.map((freshExample) =>
        keepSavedWhenOnlyRandomValuesDiffer(
          savedExamplesByOperation[operationKey] ?? [],
          freshExample,
        ),
      ),
    ]),
  );

export const mergeRecordedExamples = (
  operationKeys: string[],
  exchanges: RecordedExchange[],
): ExamplesByOperation => {
  const matchers = buildOperationMatchers(operationKeys);
  const candidatesByOperationStatus = new Map<string, Map<number, EndpointExample[]>>();

  for (const exchange of exchanges) {
    const operationKey = findOperationKey(matchers, exchange);
    if (!operationKey) continue;
    const candidatesByStatus = candidatesByOperationStatus.get(operationKey) ?? new Map();
    const statusCandidates = candidatesByStatus.get(exchange.status) ?? [];
    statusCandidates.push(toNormalizedExample(exchange));
    candidatesByStatus.set(exchange.status, statusCandidates);
    candidatesByOperationStatus.set(operationKey, candidatesByStatus);
  }

  return Object.fromEntries(
    [...candidatesByOperationStatus.entries()]
      .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
      .map(([operationKey, candidatesByStatus]) => [
        operationKey,
        [...candidatesByStatus.entries()]
          .sort(([firstStatus], [secondStatus]) => firstStatus - secondStatus)
          .flatMap(([, candidates]) => pickRichestExample(candidates) ?? []),
      ]),
  );
};
