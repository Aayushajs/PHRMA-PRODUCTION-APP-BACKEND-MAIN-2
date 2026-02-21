/*
┌───────────────────────────────────────────────────────────────────────┐
│  Medicine Store Model - Mongoose model for medicine store accounts.   │
│  Connects Medicine Store Schema to the 'MedicineStore' collection.    │
└───────────────────────────────────────────────────────────────────────┘
*/

import { medicineStoreSchema } from "../Schema/medicineStore.Schema.js";
import { IMedicineStore } from "../Entities/medicineStore.Interface.js";
import { model } from "mongoose";

const MedicineStore = model<IMedicineStore>("MedicineStore", medicineStoreSchema);
export default MedicineStore;
