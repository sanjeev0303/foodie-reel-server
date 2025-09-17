import express from 'express'
import { authUserMiddleware } from '../middleware/auth.middleware';
import * as foodPartnerController from '../controllers/food-partner.controller'


const router = express.Router();


/* /api/food-partner/:id */
router.get("/:id",
    authUserMiddleware,
    foodPartnerController.getFoodPartnerById)

export default router;
