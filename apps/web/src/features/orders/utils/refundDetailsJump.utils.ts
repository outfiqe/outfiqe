import { REFUND_DETAILS_HEADING_ID } from "../constants/refundDetailsSection";

export const jumpToRefundDetails = () => {
  const heading = document.getElementById(REFUND_DETAILS_HEADING_ID);
  if (!heading) return;
  heading.scrollIntoView({ block: "start" });
  heading.focus({ preventScroll: true });
};
