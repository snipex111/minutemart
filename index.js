const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const bodyParser = require('body-parser')
const bootstrap = require('bootstrap')
const app = express();
const methodoverride = require('method-override')
const { redirect } = require('express/lib/response');
const campground = require('./models/');
app.use(methodoverride('_method'))
mongoose.connect('mongodb://localhost:27017/minutemart')
    .then(() => {
        console.log('connected')
    })
    .catch(err => {
        console.log(err);
    })
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({ extended: true }))
app.listen(3000, () => {
    console.log('sun rhe betichod')
})
app.get('/', (req, res) => {
    res.render('home');
})

app.get('/campgrounds', async (req, res) => {
    const campgrounds = await campground.find({});
    res.render('campgrounds/show', { campgrounds });
})

app.get('/campgrounds/:id', async (req, res) => {
    const campgrounds = await campground.findById(req.params.id);
    res.render('campgrounds/descript', { campgrounds });
})