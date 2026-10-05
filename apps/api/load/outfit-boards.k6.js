import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

const API_URL = __ENV.LOAD_API_URL || "http://localhost:3000";
const BOARDS_FILE = __ENV.BOARDS_FILE || "./outfit-boards.json";
const VIRTUAL_PEOPLE = Number(__ENV.LOAD_PEOPLE || 500);
const DURATION = __ENV.LOAD_DURATION || "3m";
const PAUSE_BETWEEN_EDITS_SECONDS = 2.5;
const CHANCE_OF_TAPPING_HAPPY = 0.5;
const SERVER_ERROR_STATUS = 500;
const CONFLICT_STATUS = 409;
const OK_STATUS = 200;

const boards = new SharedArray("boards", () => JSON.parse(open(BOARDS_FILE)));

const serverErrors = new Rate("server_errors");
const versionConflicts = new Rate("version_conflicts");
const acceptedEditDuration = new Trend("accepted_edit_duration", true);

export const options = {
  scenarios: {
    boards: { executor: "constant-vus", vus: VIRTUAL_PEOPLE, duration: DURATION },
  },
  thresholds: {
    accepted_edit_duration: ["p(95)<200"],
    server_errors: ["rate<0.001"],
  },
};

const personFor = (virtualPersonId) => {
  const board = boards[virtualPersonId % boards.length];
  const seat = Math.floor(virtualPersonId / boards.length) % board.tokens.length;
  return { outfitId: board.outfitId, token: board.tokens[seat] };
};

const idempotencyKey = () => `load-${__VU}-${__ITER}-${Date.now()}`;

export default function boardSession() {
  const { outfitId, token } = personFor(__VU);
  const authHeaders = { Authorization: `Bearer ${token}` };

  const boardResponse = http.get(`${API_URL}/api/outfits/${outfitId}`, { headers: authHeaders });
  serverErrors.add(boardResponse.status >= SERVER_ERROR_STATUS);
  check(boardResponse, { "board loads": (response) => response.status === OK_STATUS });
  if (boardResponse.status !== OK_STATUS) return;

  const { version } = boardResponse.json("data");
  const editResponse = http.put(
    `${API_URL}/api/outfits/${outfitId}/happy`,
    JSON.stringify({ isHappy: Math.random() < CHANCE_OF_TAPPING_HAPPY }),
    {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
        "X-Outfit-Version": String(version),
        "Idempotency-Key": idempotencyKey(),
      },
    },
  );
  serverErrors.add(editResponse.status >= SERVER_ERROR_STATUS);
  versionConflicts.add(editResponse.status === CONFLICT_STATUS);
  if (editResponse.status === OK_STATUS) acceptedEditDuration.add(editResponse.timings.duration);
  check(editResponse, {
    "edit is accepted or a clean conflict": (response) =>
      response.status === OK_STATUS || response.status === CONFLICT_STATUS,
  });

  sleep(PAUSE_BETWEEN_EDITS_SECONDS);
}
