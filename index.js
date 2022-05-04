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
// const userroutes = require('./routes/users');
// const productroutes = require('./routes/products');

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
    next();
})

app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registereduser = await User.register(user, password);
        console.log(registereduser);
        res.redirect('/products');
    }
    catch (err) {
        req.flash('error', err.message);
        res.redirect('/register');
    }
})
app.post('/neworder', isLoggedIn, async (req, res) => {

    let neworder1 = await new orders(req.body);
    neworder1.username = req.user._id;
    const curuser = await User.findById(req.user._id).populate('cart.item');
    let orditems = [];
    for (let x of curuser.cart) {
        orditems.push(x);
    }
    neworder1.ordereditems = orditems;
    let val = 0;
    for (let x of curuser.cart) {
        val += (x.quantity) * (x.item.price);
    }
    neworder1.paymentamount = val;
    console.log(neworder1);

    while (curuser.cart.length) {
        curuser.cart.pop();
    }
    await neworder1.save();
    curuser.orders.push(neworder1);
    await curuser.save();
    res.redirect('/myorders');
})
app.get('/myorders', isLoggedIn, async (req, res) => {

    const curuser = await User.findById(req.user._id).populate('orders');


    res.render('orders/index', { curuser });

});

app.get('/myproducts', isLoggedIn, async (req, res) => {
    const productlist = await products.find({ author: req.user._id });
    let val = 0;
    res.render('products/index', { productlist, val })
})

app.get('/orders/:orderid', isLoggedIn, async (req, res) => {
    const curorder = await orders.findById(req.params.orderid).populate('ordereditems.item');
    res.render('orders/desc', { curorder });

})
app.get('/', (req, res) => {
    res.render('home');
})
app.get('/users', async (req, res) => {
    const userlist = await User.find();
    res.render('users/show', { userlist });
})

app.get('/users/register', (req, res) => {
    res.render('users/create')
})

app.get('/users/login', (req, res) => {
    res.render('users/login')
})

app.get('/mycart', isLoggedIn, async (req, res) => {
    const curuser = await User.findById(req.user._id).populate('cart.item');
    //console.log(curuser.cart[0]._id);

    res.render('orders/cart', { curuser })
})


app.delete('/mycart/delete/:itemid', async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $pull: { cart: { _id: req.params.itemid } } }, { new: true });

    res.redirect('/mycart');
})
app.put('/mycart/inc/:itemid', async (req, res) => {
    let curuser = await User.findById(req.user._id);
    const { itemid } = req.params;
    function findItem(it) {
        return it._id == itemid;
    }
    let reqitem = curuser.cart.find(findItem);
    reqitem.quantity++;

    await curuser.save();
    res.redirect('/mycart');
})
app.put('/mycart/dec/:itemid', async (req, res) => {
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
})

app.get('/users/desc', (req, res) => {
    res.render('orders/desc')
})
app.get('/users/index', (req, res) => {
    res.render('orders/index')
})

app.post('/orders/addtocart/:productid', isLoggedIn, async (req, res) => {
    const curuser = await User.findById(req.user._id);
    let addproduct = {};
    addproduct.item = req.params.productid;

    addproduct.quantity = req.body.quantity;

    curuser.cart.push(addproduct);
    await curuser.save();
    res.redirect(`/products/${req.params.productid}`);
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/users/login' }), async (req, res) => {
    console.log(1);
    req.flash('success', 'welcome back!');
    res.redirect('/products');
})

app.get('/logout', async (req, res) => {
    req.logout();
    res.redirect('/users/login');
})

app.get('/products/new', isLoggedIn, (req, res) => {
    res.render('products/new')
})

app.get('/products/', async (req, res) => {
    const productlist = await products.find();
    req.query.sortOptions = 'default';
    req.query.filterOptions = 'none';
    let val = 1;
    res.render('products/index', { productlist, val })
})
app.post('/products', isLoggedIn, async (req, res) => {
    const newproduct = new products(req.body);
    newproduct.author = req.user._id;
    await newproduct.save();
    res.redirect('/products');
})

app.get('/products/sort', async (req, res) => {
    let productlist;
    //const opts = document.getElementById('sortOptions');
    if (req.query.sortOptions == 'priceasc') {
        productlist = await products.find().sort('price');
        //opts.value = 'priceasc';
    }
    else if (req.query.sortOptions = 'pricedesc') {
        productlist = await products.find().sort('-price');
        //opts.value = 'pricedesc';
    }
    else {
        productlist = await products.find();
        //opts.value = 'default';
    }
    res.render('products/index', { productlist });
})

app.get('/products/filter', async (req, res) => {
    let productlist;
    let aggregate_options = [];
    let filter = {};
    console.log(req.query);
    if (req.query.filterOptions && req.query.filterOptions != 'none') {
        switch (req.query.filterOptions) {
            case '0to499':
                filter.price = { $gte: 0, $lt: 500 };
                break;
            case '500to999':
                filter.price = { $gte: 500, $lt: 1000 };
                break;
            case '1000to1999':
                filter.price = { $gte: 1000, $lt: 2000 };
                break;
            case '2000to2999':
                filter.price = { $gte: 2000, $lt: 3000 };
                break;
            case '3000to4999':
                filter.price = { $gte: 3000, $lt: 5000 };
                break;
            case '5000+':
                filter.price = { $gte: 5000 };
                break;
            default:
                filter.price = { $gte: 0 };
                break;
        }
    }
    aggregate_options.push({ $match: filter });
    if (req.query.sortOptions == 'pricedesc') {
        aggregate_options.push({ $sort: { 'price': -1 } });
    } else if (req.query.sortOptions == 'priceasc') {
        aggregate_options.push({ $sort: { 'price': 1 } });
    }
    productlist = await products.aggregate(aggregate_options);
    res.render('products/index', { productlist });
})



app.post('/products/:productid/newreview', isLoggedIn, async (req, res) => {
    const nreview = await new reviews(req.body.review);
    const kal = req.params.productid;
    const curproduct = await products.findById(kal);
    nreview.product = kal;
    nreview.author = req.user._id;
    curproduct.reviews.push(nreview);
    console.log(nreview);
    console.log(curproduct);
    await nreview.save();
    await curproduct.save();

    res.redirect(`/products/${kal}`);
})


app.delete('/products/:productid', isLoggedIn, isAuthor, async (req, res) => {
    await products.findByIdAndDelete(req.params.productid);
    res.redirect('/products');
})
app.get('/products/:productid/update', isLoggedIn, isAuthor, async (req, res) => {
    const requiredproduct = await products.findById(req.params.productid);
    res.render('products/update', { requiredproduct });
})
app.put('/products/:productid', isLoggedIn, isAuthor, async (req, res) => {
    const kal = req.params.productid;
    await products.findByIdAndUpdate(req.params.productid, req.body, { runValidators: true });
    res.redirect(`/products/${kal}`);
})
app.get('/products/:productid', async (req, res) => {
    const rproduct = await products.findById(req.params.productid).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    res.render('products/desc', { rproduct });
})

app.delete('/products/:productid/reviews/:reviewid', isLoggedIn, isReviewAuthor, async (req, res) => {
    await products.findByIdAndUpdate(req.params.productid, { $pull: { reviews: req.params.reviewid } });
    await reviews.findByIdAndDelete(req.params.reviewid);
    res.redirect(`/products/${req.params.productid}`)
})



app.listen(3000, () => {
    console.log('serving on port 3000');
})