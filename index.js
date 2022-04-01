const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const users = require('./models/users');
//const products = require('./models/products');



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

app.post('/users', async (req, res) => {
    const newuser = new users(req.body);
    await newuser.save();
    res.redirect('/users');
})



app.listen(3000, () => {
    console.log('serving on port 3000');
})