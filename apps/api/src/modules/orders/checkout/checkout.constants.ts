import { HTTP_STATUS } from "#constants/http.constants.js";

export const CHECKOUT_ENDPOINT = "orders.checkout";
export const CART_EMPTY_STATUS = HTTP_STATUS.BAD_REQUEST;
export const ITEMS_UNAVAILABLE_STATUS = HTTP_STATUS.CONFLICT;
