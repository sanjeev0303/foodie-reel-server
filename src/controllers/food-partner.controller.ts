import { Request, Response } from 'express'
import { foodPartnerModel } from '../models/food-partner.model'
import { foodModel } from '../models/food.model'


export const getFoodPartnerById = async (req: Request, res: Response) => {
    const foodPartnerId = req.params.id

    const foodPartner = await foodPartnerModel.findById(foodPartnerId)
    const foodItemByFoodPartner = await foodModel.find({ foodPartner: foodPartnerId })

    if (!foodPartner) {
        res.status(404).json({ message: "Food partner not found" });
        return
    }

    res.status(200).json({
        message: "Food partner retrieved successfylly",
        foodPartner: {
            ...foodPartner.toObject(),
            foodItems: foodItemByFoodPartner
        }
    })
}
