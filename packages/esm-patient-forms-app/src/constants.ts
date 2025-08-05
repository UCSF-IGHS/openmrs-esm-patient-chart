import { restBaseUrl } from '@openmrs/esm-framework';

export const customFormRepresentation =
  '(uuid,name,display,encounterType:(uuid,name,viewPrivilege,editPrivilege),version,published,retired,resources:(uuid,name,dataType,valueReference))';
export const customEncounterRepresentation = `custom:(uuid,encounterDatetime,encounterType:(uuid,name,viewPrivilege,editPrivilege),form:${customFormRepresentation}`;

export const formEncounterUrl = `${restBaseUrl}/form?v=custom:${customFormRepresentation}`;
export const formEncounterUrlPoc = `${restBaseUrl}/form?v=custom:${customFormRepresentation}&q=poc`;

// Sorting options for the forms
export const FORM_SORT_OPTIONS = {
  NAME: 'name',
  MOST_RECENT: 'most-recent',
};
