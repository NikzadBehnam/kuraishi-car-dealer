export const authUserAdditionalFields = {
  firstName: {
    type: "string",
    required: false,
  },
  lastName: {
    type: "string",
    required: false,
  },
  phone: {
    type: "string",
    required: false,
  },
  termsAcceptedAt: {
    type: "date",
    required: false,
    input: false,
  },
  termsVersion: {
    type: "string",
    required: false,
    input: false,
  },
} as const;
