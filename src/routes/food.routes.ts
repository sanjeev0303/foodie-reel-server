import express, { Router } from 'express'
import multer from 'multer';
import * as foodController from '../controllers/food.controller'
import { authFoodPartnerMiddleware, authUserMiddleware } from '../middleware/auth.middleware'

const router: Router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
})

/* POST /api/food/ [protected] - Create a new reel */
router.post('/',
    authFoodPartnerMiddleware,
    upload.single("video"),
    foodController.createFood)

/* GET /api/food/ - Get all reels (public for development) */
router.get("/",
    foodController.getFoodItems)

/* POST /api/food/like [protected] - Like/Unlike a reel */
router.post('/like',
    authUserMiddleware,
    foodController.likeFood)

/* POST /api/food/save [protected] - Save/Unsave a reel */
router.post('/save',
    authUserMiddleware,
    foodController.saveFood
)

/* GET /api/food/save [protected] - Get saved reels */
router.get('/save',
    authUserMiddleware,
    foodController.getSaveFood
)

/* GET /api/food/liked [protected] - Get liked reels */
router.get('/liked',
    authUserMiddleware,
    foodController.getLikedReels
)

/* DELETE /api/food/:foodId [protected] - Delete a reel */
router.delete('/:foodId',
    authFoodPartnerMiddleware,
    foodController.deleteFood
)

/* GET /api/food/partner/reels [protected] - Get food partner's reels */
router.get('/partner/reels',
    authFoodPartnerMiddleware,
    foodController.getFoodPartnerReels
)

/* POST /api/food/:foodId/view - Record a view (public for testing) */
router.post('/:foodId/view',
    foodController.recordView
)

/* POST /api/food/streaming/upload [protected] - Upload video for streaming */
router.post('/streaming/upload',
    authFoodPartnerMiddleware,
    upload.single("video"),
    foodController.uploadVideoForStreaming
)

/* GET /api/food/streaming/:videoId - Get streaming video URLs */
router.get('/streaming/:videoId',
    foodController.getStreamingVideo
)

export default router
