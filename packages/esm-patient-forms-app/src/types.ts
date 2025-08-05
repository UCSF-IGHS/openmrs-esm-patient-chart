import { type HtmlFormEntryForm, type Form as CommonLibForm, type Privilege } from '@openmrs/esm-patient-common-lib';

// Ensure Form is compatible with the one from esm-patient-common-lib
export interface Form {
  uuid: string;
  name: string;
  display?: string;
  published: boolean;
  retired: boolean;
  version: string;
  encounterType: {
    uuid: string;
    name: string;
    editPrivilege: Privilege;
    viewPrivilege: Privilege;
  };
  resources: Array<FormEncounterResource>;
}

export interface FormEncounterResource {
  uuid: string;
  name: string;
  dataType: string;
  valueReference: string;
}

export interface EncounterWithFormRef {
  uuid: string;
  encounterDatetime: string;
  form: Form;
  encounterType: {
    uuid: string;
  };
}

export interface ListResponse<T> {
  results: Array<T>;
}

export interface CompletedFormInfo {
  form: Form;
  associatedEncounters: Array<EncounterWithFormRef>;
  lastCompletedDate?: Date;
}

export interface FormSection {
  name: string;
  forms: Array<string>;
  availableForms?: Array<CompletedFormInfo>;
  useInfiniteScrolling?: boolean;
}
