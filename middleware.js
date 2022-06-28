const products = require('./models/products');
const reviews = require('./models/reviews');
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/users/login');
    }
    next();
}
module.exports.isAuthor = async (req, res, next) => {
    const { productid } = req.params;
    const product1 = await products.findById(productid);
    console.log(product1);
    if (!product1.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/products/${productid}`);
    }
    next();
}
module.exports.isReviewAuthor = async (req, res, next) => {
    const { productid, reviewid } = req.params;
    const review = await reviews.findById(reviewid);
    console.log(review);
    if (!review.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/products/${productid}`);
    }
    next();
}
module.exports.checkStock = async (req, res, next) => {
    const { productid } = req.params;
    const prod = await products.findById(productid);
    if (!prod) {
        req.flash('error', 'Cannot find the product');
        return res.redirect('/myproducts');
    }
    if (prod.quantity < parseInt(req.body.quantity)) {
        req.flash('error', 'Cannot sell more units than available');
        return res.redirect(`/products/${productid}/vieworders`);
    }
    next();
}