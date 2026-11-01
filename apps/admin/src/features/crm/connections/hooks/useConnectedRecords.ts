import { useQuery } from "@tanstack/react-query";

import { type ConnectionSubject, crmConnectionsApi } from "../api/connectionsApi";
import { CONNECTIONS_QUERY_KEY } from "../constants/connectionsQueryKeys";

export const useConnectedRecords = (subject: ConnectionSubject) =>
  useQuery({
    queryKey: [...CONNECTIONS_QUERY_KEY, subject.subjectType, subject.subjectId],
    queryFn: () => crmConnectionsApi.getConnections(subject),
  });
