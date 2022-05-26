const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const User = require('./models/users');
const products = require('./models/products');
const reviews = require('./models/reviews');
const orders = require('./models/orders');
const passport = require('passport');
const localstrategy = require('passport-local');
const flash = require('connect-flash');
const categories = require('./categories');
// const userroutes = require('./routes/users');
// const productroutes = require('./routes/products');


const apperror = require('./apperror');
const catchAsync = require('./catchAsync');
const Joi = require('joi');
const { ProductSchema } = require('./schemas');

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride('_method'));
app.use('/public', express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

const { isLoggedIn, isAuthor, isReviewAuthor } = require('./middleware');


//const dburl = process.env.DB_URL;
mongoose.connect('mongodb+srv://minutemart:1234@cluster0.vsuxx.mongodb.net/minutemart?retryWrites=true&w=majority');
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log('Database connected');
})
const session = require('express-session');

const sessionOptions = {
    secret: 'thisisnotagoodsecret', resave: false, saveUninitialized: true,
    cookie: {
        expires: Date.now() + 500000000,
        maxAge: 500000000, httpOnly: true
    }
}
app.use(flash());





app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localstrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req, res, next) => {

    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})


const validateproduct = (req, res, next) => {

    const { error } = ProductSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new apperror(msg, 400)
    }
    else {
        next();
    }
}



app.post('/register', catchAsync(async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registereduser = await User.register(user, password);
        req.login(registereduser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to MinuteMart!');
            res.redirect('/products');
        })
    }
    catch (err) {
        req.flash('error', err.message);
        res.redirect('/users/register');
    }
}))
app.post('/neworder', isLoggedIn, catchAsync(async (req, res) => {

    let neworder1 = await new orders(req.body);
    neworder1.username = req.user._id;
    const curuser = await User.findById(req.user._id).populate('cart.item');
    let orditems = [];
    for (let x of curuser.cart) {
        orditems.push(x);
        let ord = {
            orderid: neworder1._id,
            quantity: x.quantity
        }
        x.item.quantity = x.item.quantity - parseInt(x.quantity);
        x.item.orders.push(ord);
        console.log(x.item);
        x.item.save();
    }
    neworder1.ordereditems = orditems;
    let val = 0;
    for (let x of curuser.cart) {
        val += (x.quantity) * (x.item.price);
    }
    neworder1.paymentamount = val;

    while (curuser.cart.length) {
        curuser.cart.pop();
    }
    await neworder1.save();
    curuser.orders.push(neworder1);
    await curuser.save();
    res.redirect('/myorders');
}))
app.get('/myorders', isLoggedIn, catchAsync(async (req, res) => {

    const curuser = await User.findById(req.user._id).populate({
        path: 'orders',
        populate: {
            path: 'ordereditems.item'
        }
    });
    res.render('orders/index', { curuser });

}));

app.get('/myproducts', isLoggedIn, catchAsync(async (req, res) => {
    const productlist = await products.find({ author: req.user._id });
    app.locals.sortOptions = 'none';
    app.locals.pricemin = 0;
    app.locals.pricemax = 1000000000000000;
    app.locals.val = 0;
    app.locals.searchdata = 'none';
    res.render('products/index', { productlist })
}))

app.get('/orders/:orderid', isLoggedIn, catchAsync(async (req, res) => {
    const curorder = await orders.findById(req.params.orderid).populate('ordereditems.item');
    res.render('orders/desc', { curorder });

}))
app.get('/', (req, res) => {
    res.render('home', categories);
})


app.get('/users/register', (req, res) => {
    res.render('users/create')
})

app.get('/users/login', (req, res) => {
    res.render('users/login')
})

app.get('/mycart', isLoggedIn, catchAsync(async (req, res) => {
    const curuser = await User.findById(req.user._id).populate('cart.item');
    //console.log(curuser.cart[0]._id);

    res.render('orders/cart', { curuser })
}))


app.delete('/mycart/delete/:itemid', isLoggedIn, catchAsync(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $pull: { cart: { _id: req.params.itemid } } }, { new: true });

    res.redirect('/mycart');
}))
app.put('/mycart/inc/:itemid', isLoggedIn, catchAsync(async (req, res) => {
    let curuser = await User.findById(req.user._id);
    const { itemid } = req.params;
    function findItem(it) {
        return it._id == itemid;
    }
    let reqitem = curuser.cart.find(findItem);
    reqitem.quantity++;

    await curuser.save();
    res.redirect('/mycart');
}))
app.put('/mycart/dec/:itemid', isLoggedIn, catchAsync(async (req, res) => {
    let curuser = await User.findById(req.user._id);
    const { itemid } = req.params;
    function findItem(it) {
        return it._id == itemid;
    }
    let reqitem = curuser.cart.find(findItem);
    if (reqitem.quantity > 1) {
        reqitem.quantity--;
        await curuser.save();
    }
    else {
        await User.findByIdAndUpdate(req.user._id, { $pull: { cart: { _id: req.params.itemid } } }, { new: true });
    }


    res.redirect('/mycart');
}))

app.get('/users/desc', (req, res) => {
    res.render('orders/desc')
})
app.get('/users/index', (req, res) => {
    res.render('orders/index')
})

app.post('/orders/addtocart/:productid', isLoggedIn, catchAsync(async (req, res) => {
    const curuser = await User.findById(req.user._id);
    let addproduct = {};
    addproduct.item = req.params.productid;
    addproduct.quantity = req.body.quantity;
    curuser.cart.push(addproduct);
    await curuser.save();
    res.redirect(`/products/${req.params.productid}`);
}))

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/users/login' }), catchAsync(async (req, res) => {
    try {
        req.flash('success', `Welcome Back, ${req.user.username}!`);

        const redirectUrl = req.session.returnTo || '/products';
        delete req.session.returnTo;
        res.redirect(redirectUrl);
    }
    catch (err) {
        req.flash('error', 'Invalid Credentials');

    }
}))

app.get('/logout', catchAsync(async (req, res) => {
    req.logout();
    res.redirect('/users/login');
}))

app.get('/products/new', isLoggedIn, (req, res) => {
    console.log(categories);
    res.render('products/new', categories);
})

app.get('/products/', catchAsync(async (req, res) => {
    const productlist = await products.find();
    app.locals.sortOptions = 'none';
    app.locals.pricemin = 0;
    app.locals.pricemax = 1000000000000000;
    app.locals.val = 1;
    app.locals.searchdata = 'none';
    res.render('products/index', { productlist })
}))
app.post('/products', isLoggedIn, validateproduct, catchAsync(async (req, res) => {
    const newproduct = new products(req.body);
    newproduct.author = req.user._id;
    newproduct.avgrating = 0;
    newproduct.available = 1;
    await newproduct.save();
    res.redirect('/myproducts');
}))

app.get('/products/sort', catchAsync(async (req, res) => {
    let productlist;
    let aggregate_options = [];
    let filter = {};
    filter.price = { $gte: app.locals.pricemin, $lt: app.locals.pricemax };
    if (!app.locals.val) {
        filter.author = req.user._id;
    }
    if (app.locals.searchdata != 'none') {
        var regex = new RegExp(app.locals.searchdata, "i");
        filter.name = regex;
    }
    aggregate_options.push({ $match: filter });
    if (req.query.sortOptions == 'priceasc') {
        app.locals.sortOptions = 'priceasc';
        aggregate_options.push({ $sort: { 'price': 1 } });
    }
    else if (req.query.sortOptions == 'pricedesc') {
        app.locals.sortOptions = 'pricedesc';
        aggregate_options.push({ $sort: { 'price': -1 } });
    }
    else if (req.query.sortOptions == 'ratingasc') {
        app.locals.sortOptions = 'ratingasc';
        aggregate_options.push({ $sort: { 'avgrating': 1 } });
    }
    else if (req.query.sortOptions == 'ratingdesc') {
        app.locals.sortOptions = 'ratingdesc';
        aggregate_options.push({ $sort: { 'avgrating': -1 } });
    }
    else {
        app.locals.sortOptions = 'default';
    }
    productlist = await products.aggregate(aggregate_options);
    res.render('products/index', { productlist });
}))

app.get('/products/filter', catchAsync(async (req, res) => {
    let productlist;
    let aggregate_options = [];
    let filter = {};
    if (!app.locals.val) {
        filter.author = req.user._id;
    }
    if (app.locals.searchdata != 'none') {
        var regex = new RegExp(app.locals.searchdata, "i");
        filter.name = regex;
    }
    if (req.query.filterOptions) {
        switch (req.query.filterOptions) {
            case '0to499':
                app.locals.pricemin = 0;
                app.locals.pricemax = 500;
                break;
            case '500to999':
                app.locals.pricemin = 500;
                app.locals.pricemax = 1000;
                break;
            case '1000to1999':
                app.locals.pricemin = 1000;
                app.locals.pricemax = 2000;
                break;
            case '2000to2999':
                app.locals.pricemin = 2000;
                app.locals.pricemax = 3000;
                break;
            case '3000to4999':
                app.locals.pricemin = 3000;
                app.locals.pricemax = 5000;
                break;
            case '5000+':
                app.locals.pricemin = 5000;
                app.locals.pricemax = 1000000000000000;
                break;
            default:
                app.locals.pricemin = 0;
                app.locals.pricemax = 1000000000000000;
                break;
        }
    }
    filter.price = { $gte: app.locals.pricemin, $lt: app.locals.pricemax };
    aggregate_options.push({ $match: filter });
    if (app.locals.sortOptions == 'pricedesc') {
        aggregate_options.push({ $sort: { 'price': -1 } });
    } else if (app.locals.sortOptions == 'priceasc') {
        aggregate_options.push({ $sort: { 'price': 1 } });
    } else if (app.locals.sortOptions == 'ratingasc') {
        aggregate_options.push({ $sort: { 'avgrating': 1 } });
    } else if (app.locals.sortOptions == 'ratingdesc') {
        aggregate_options.push({ $sort: { 'avgrating': -1 } });
    }
    productlist = await products.aggregate(aggregate_options);
    res.render('products/index', { productlist });
}))



app.post('/products/:productid/newreview', isLoggedIn, catchAsync(async (req, res) => {
    const nreview = await new reviews(req.body.review);
    const kal = req.params.productid;
    const curproduct = await products.findById(kal);
    nreview.product = kal;
    nreview.author = req.user._id;
    let rating = (curproduct.reviews.length) * (curproduct.avgrating);
    curproduct.avgrating = (rating + nreview.rating) / (curproduct.reviews.length + 1);
    curproduct.reviews.push(nreview);
    console.log(nreview);
    console.log(curproduct);
    await nreview.save();
    await curproduct.save();

    res.redirect(`/products/${kal}`);
}))


app.delete('/products/:productid', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
    const requiredproduct = await products.findById(req.params.productid);
    if (!requiredproduct.orders.length) {
        await products.findByIdAndDelete(req.params.productid);
    } else {
        requiredproduct.available = 0;
        requiredproduct.save();
    }
    res.redirect('/products');
}))
app.get('/products/:productid/update', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
    const requiredproduct = await products.findById(req.params.productid);
    if (!requiredproduct) {
        req.flash('error', 'Cannot find the product');
        return res.redirect('/myproducts');
    }
    res.render('products/update', { requiredproduct });
}))
app.get('/products/:productid/vieworders', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
    const requiredproduct = await products.findById(req.params.productid).populate('orders');
    if (!requiredproduct) {
        req.flash('error', 'Cannot find the product');
        return res.redirect('/myproducts');
    }
    res.render('products/vieworders', { requiredproduct });
}))
app.put('/products/:productid', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
    const kal = req.params.productid;
    await products.findByIdAndUpdate(req.params.productid, req.body, { runValidators: true });
    res.redirect(`/products/${kal}`);
}))

app.post('/products/:productid/addstock', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
    const curproduct = await products.findById(req.params.productid);
    if (!curproduct) {
        req.flash('error', 'Cannot find the product');
        return res.redirect('/myproducts');
    }
    curproduct.quantity += parseInt(req.body.quantity);
    curproduct.save();
    res.redirect(`/products/${req.params.productid}/vieworders`);
}))

app.post('/products/:productid/removestock', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
    const curproduct = await products.findById(req.params.productid);
    if (!curproduct) {
        req.flash('error', 'Cannot find the product');
        return res.redirect('/myproducts');
    }
    curproduct.quantity -= parseInt(req.body.quantity);
    curproduct.save();
    res.redirect(`/products/${req.params.productid}/vieworders`);
}))

app.get('/products/search', catchAsync(async (req, res) => {
    var regex = new RegExp(req.query.data, "i")
        , query = { name: regex };
    app.locals.sortOptions = 'none';
    app.locals.pricemin = 0;
    app.locals.pricemax = 1000000000000000;
    app.locals.searchdata = req.query.data;
    products.find(query, function (err, productlist) {
        if (err) {
            req.send(err);
        }

        res.render('products/index', { productlist });
    });
}))

app.get('/products/:productid', catchAsync(async (req, res) => {
    const rproduct = await products.findById(req.params.productid).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    if (!rproduct) {
        req.flash('error', 'Cannot find the product');
        return res.redirect('/products');
    }
    res.render('products/desc', { rproduct });
}))

app.delete('/products/:productid/reviews/:reviewid', isLoggedIn, isReviewAuthor, catchAsync(async (req, res) => {
    await products.findByIdAndUpdate(req.params.productid, { $pull: { reviews: req.params.reviewid } });
    await reviews.findByIdAndDelete(req.params.reviewid);
    res.redirect(`/products/${req.params.productid}`)
}))

app.all('*', (req, res, next) => {
    next(new apperror('Page not found', 404));
})

app.use((err, req, res, next) => {
    const { status1 = 500, } = err;
    if (!err.message)
        err.message = 'Something went wrong';
    res.status(status1).render('error', { err })
})


app.listen(3000, () => {
    console.log('serving on port 3000');
})