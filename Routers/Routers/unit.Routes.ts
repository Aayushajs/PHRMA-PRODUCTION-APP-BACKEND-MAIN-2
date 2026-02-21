/*
┌───────────────────────────────────────────────────────────────────────┐
│  Unit Routes - API endpoints for Unit management.                     │
│  Routes for managing Parent and Child Units (CRUD operations).        │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Router } from 'express';
import unitServices from '../../Services/unit.Service';
import { adminMiddleware } from '../../Middlewares/auth';


const { ParentUnitServices, ChildUnitServices } = unitServices;

const unitRouter = Router();

// Parent unit routes
unitRouter.post('/add-parent-units', ParentUnitServices.createParentUnit);
unitRouter.get('/get-parent-units', adminMiddleware, ParentUnitServices.getAllParentUnits);
unitRouter.put('/update-parent-units/:id', adminMiddleware, ParentUnitServices.updateParentUnit);
unitRouter.delete('/delete-parent-units/:id', adminMiddleware, ParentUnitServices.deleteParentUnit);

// Child unit routes
unitRouter.post('/add-child-units', ChildUnitServices.createChildUnit);
unitRouter.get('/get-child-units', adminMiddleware, ChildUnitServices.getAllChildUnits);
unitRouter.put('/update-child-units/:id', adminMiddleware, ChildUnitServices.updateChildUnit);
unitRouter.delete('/delete-child-units/:id', adminMiddleware, ChildUnitServices.deleteChildUnit);

export default unitRouter;
