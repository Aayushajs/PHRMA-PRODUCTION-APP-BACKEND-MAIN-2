/*
┌───────────────────────────────────────────────────────────────────────┐
│  Parent Unit Model - MongoDB model for parent unit entity             │
│  Handles database operations for main unit categories.                │
└───────────────────────────────────────────────────────────────────────┘
*/

import { model } from "mongoose";
import { IParentUnit } from "../Entities/parentUnit.interface.js";
import { parentUnitSchema } from "../Schema/parentUnit.Schema.js";

export const ParentUnit = model<IParentUnit>("ParentUnit", parentUnitSchema);

export default ParentUnit;
