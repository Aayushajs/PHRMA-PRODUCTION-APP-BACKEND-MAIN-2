/*
┌───────────────────────────────────────────────────────────────────────┐
│  User Model - Mongoose model for user accounts.                       │
│  Connects User Schema to the 'User' collection.                       │
└───────────────────────────────────────────────────────────────────────┘
*/

import { userSchema } from "../Schema/user.Schema.js";
import { Iuser } from "../Entities/user.Interface.js";
import { model } from 'mongoose';

const User = model<Iuser>("User", userSchema);
export default User;