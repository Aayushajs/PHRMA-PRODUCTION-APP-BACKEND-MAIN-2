/*
┌───────────────────────────────────────────────────────────────────────┐
│  Roles Enum - Enumeration of user roles (Customer, Admin, etc).       │
└───────────────────────────────────────────────────────────────────────┘
*/

enum RoleIndex {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
  PHARMACIST = "PHARMACIST",
  OWNER = "OWNER",
  STAFF = "STAFF",
  UNKNOWN = "UNKNOWN", // for googale sign in users
}

export default RoleIndex;
export type Roles = keyof typeof RoleIndex;
