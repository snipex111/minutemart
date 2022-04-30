const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const users = require('./models/users');
const products = require('./models/products');
const reviews = require('./models/reviews');


// const userroutes = require('./routes/users');
// const productroutes = require('./routes/products');

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));



//const dburl = process.env.DB_URL;
mongoose.connect('mongodb+srv://minutemart:1234@cluster0.vsuxx.mongodb.net/minutemart?retryWrites=true&w=majority');
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log('Database connected');
})

app.get('/', (req, res) => {
    res.render('home');
})
app.get('/users', async (req, res) => {
    const userlist = await users.find();
    res.render('users/show', { userlist });
})

app.get('/users/new', (req, res) => {
    res.render('users/create')
})
app.get('/products/new', (req, res) => {
    res.render('products/new')
})

app.get('/products/', async (req, res) => {
    const productlist = await products.find();
    res.render('products/index', { productlist })
})
app.post('/products', async (req, res) => {
    const newproduct = new products(req.body);
    await newproduct.save();
    res.redirect('/products');
})
app.post('/products/:productid/newreview', async (req, res) => {
    const nreview = await new reviews(req.body.review);
    const kal = req.params.productid;
    const curproduct = await products.findById(kal);
    nreview.product = kal;
    curproduct.reviews.push(nreview);
    console.log(nreview);
    console.log(curproduct);
    await nreview.save();
    await curproduct.save();

    res.redirect(`/products/${kal}`);
})
app.delete('/products/:productid', async (req, res) => {
    await products.findByIdAndDelete(req.params.productid);
    res.redirect('/products');
})
app.get('/products/:productid/update', async (req, res) => {
    const requiredproduct = await products.findById(req.params.productid);
    res.render('products/update', { requiredproduct });
})
app.put('/products/:id', async (req, res) => {
    const kal = req.params.id;
    await products.findByIdAndUpdate(req.params.id, req.body, { runValidators: true });
    res.redirect(`/products/${kal}`);
})
app.get('/products/:id', async (req, res) => {
    const rproduct = await products.findById(req.params.id).populate('reviews');
    console.log(rproduct);
    res.render('products/desc', { rproduct });
})

app.delete('/products/:productid/reviews/:reviewid', async (req, res) => {
    await products.findByIdAndUpdate(req.params.productid, { $pull: { reviews: req.params.reviewid } });
    await reviews.findByIdAndDelete(req.params.reviewid);
    res.redirect(`/products/${req.params.productid}`)
})
app.post('/users', async (req, res) => {
    const newuser = new users(req.body);
    await newuser.save();
    res.redirect('/users');
})



app.listen(3000, () => {
    console.log('serving on port 3000');
})