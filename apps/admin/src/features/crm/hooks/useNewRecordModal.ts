import { rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

const OPEN_MODAL_VALUE = "yes";
const CLOSED_MODAL_VALUE = "";

export const useNewRecordModal = () => {
  const [newRecordParam, setNewRecordParam] = useSearchFilter("new", rawTextFilter);

  return {
    isNewRecordModalOpen: newRecordParam === OPEN_MODAL_VALUE,
    openNewRecordModal: () => setNewRecordParam(OPEN_MODAL_VALUE),
    closeNewRecordModal: () => setNewRecordParam(CLOSED_MODAL_VALUE),
  };
};
