/*
┌───────────────────────────────────────────────────────────────────────┐
│ Item Routes - Store manager item management endpoints                 │
│ For adding/updating/deleting items by store owners/managers           │
│ medicineStoreId is automatically retrieved from authenticated user    │
└───────────────────────────────────────────────────────────────────────┘
*/

import express from "express";
import { uploadImage } from "../../config/multer";
import ItemServices from "../../Services/item.Service";
import { adminMiddleware, authenticatedUserMiddleware } from "../../Middlewares/auth";
import { storeContextMiddleware } from "../../Middlewares/storeContext";

const itemsRouter = express.Router();


// ========================== 📦 CRUD ==========================

// Create new item (requires authentication + store context)
itemsRouter.post(
    "/add", 
    authenticatedUserMiddleware, 
    storeContextMiddleware, 
    uploadImage.array("itemImages"), 
    ItemServices.createItem
);

// Create premium item (requires authentication + store context)
itemsRouter.post(
    "/premium", 
    authenticatedUserMiddleware, 
    storeContextMiddleware, 
    uploadImage.array("itemImages"), 
    ItemServices.createPremiumItem
);

// Get item by id for polling image processing status
itemsRouter.get(
    "/:itemId",
    authenticatedUserMiddleware,
    storeContextMiddleware,
    ItemServices.getItemById
);

// Update existing item (requires authentication + store context)
itemsRouter.put(
    "/update/:itemId", 
    authenticatedUserMiddleware, 
    storeContextMiddleware, 
    uploadImage.array("itemImages"), 
    ItemServices.updateItem
);

// Delete a single item (admin only)
itemsRouter.delete("/delete/:itemId", adminMiddleware, ItemServices.deleteItem);

// Delete all items (admin only - bulk cleanup)
itemsRouter.delete("/", adminMiddleware, ItemServices.deleteAllItems);


export default itemsRouter;
