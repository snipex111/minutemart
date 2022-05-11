const Joi = require('joi');

module.exports.ProductSchema = Joi.object({

    price: Joi.number().required().min(1),
    name: Joi.string().required(),
    image: Joi.string().required(),
    description: Joi.string().required(),
    category: Joi.string().required()
})