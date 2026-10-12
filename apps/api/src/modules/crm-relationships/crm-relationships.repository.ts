import { crmCustomerRepository } from "./customers/customer.repository.js";
import { crmPartnerRepository } from "./partners/partner.repository.js";

export const crmRelationshipsRepository = {
  ...crmPartnerRepository,

  ...crmCustomerRepository,
};
