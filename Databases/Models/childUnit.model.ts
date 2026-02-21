/*
┌───────────────────────────────────────────────────────────────────────┐
│  Child Unit Model - MongoDB model for child unit entity               │
│  Handles database operations for specific unit variations.            │
└───────────────────────────────────────────────────────────────────────┘
*/

import { model } from "mongoose";
import { IChildUnit } from "../Entities/childUnit.interface.js";
import { childUnitSchema } from "../Schema/childUnit.Schema.js";

export const ChildUnit = model<IChildUnit>("ChildUnit", childUnitSchema);

export default ChildUnit;
