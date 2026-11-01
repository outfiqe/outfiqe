export const formatMoment = (value: string | null) => (value ? formatDateTime(value) : "—");
import { formatDateTime } from "@outfiqe/utils";
