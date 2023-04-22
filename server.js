require('dotenv').config();
const express = require('express');
const fetch = import('node-fetch');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Replicate = require("replicate");

const fs = require('fs');
const mustache = require('mustache-express');

const model = require('./model');
const app = express();

const cloudinary = require('cloudinary').v2;


// Configuration 
cloudinary.config({
  cloud_name: "dw47oh5di",
  api_key: "711318594567326",
  api_secret: "iGTtjoksEyhPodRpLbOyrJumBmE"
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Set the upload directory
  },
  filename: async (req, file, cb) => {
    const ext = path.extname(file.originalname); // Get the file extension
    cb(null, `image-${Date.now()}${ext}`); // Set the file name with the extension
  }
});

// Set up the multer upload object
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

const cookieSession = require('cookie-session');
app.use(cookieSession({
  secret: 'mot-de-passe-du-cookie',
}));

app.engine('html', mustache());
app.set('view engine', 'html');
app.set('views', './views');

function is_authenticated(req, res, next) {
  if (req.session.user !== undefined) {
    return next();
  }
  res.status(401).send('Authentication required');
}

app.use(function (req, res, next) {
  if (req.session.user !== undefined) {
    res.locals.authenticated = true;
    res.locals.name = req.session.name;
  }
  return next();
});

// Route for uploading an image and getting the room type
app.post('/upload', upload.single('image'), is_authenticated, async (req, res) => {
  console.log('File uploaded:', req.file); // add this line
  const imageBuffer = fs.readFileSync(req.file.path);
  const imageType = req.file.originalname.split('.').pop(); // get the file extension
  const imageName = `${uuidv4()}.${imageType}`; // generate a unique image name
  const imagePath = `./uploads/${imageName}`; // set the image path
  fs.writeFileSync(imagePath, imageBuffer); // save the image file

  try {
    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload(imagePath);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const output = await replicate.run(
      'andreasjansson/blip-2:4b32258c42e9efd4288bb9910bc532a69727f9acd26aa08e175713a0a857a608',
      {
        input: {
          image: result.secure_url, // use the secure_url from Cloudinary
          question: 'what type of room suits this room is it : bedroom, living room, kitchen, or a dinning room?',
        },
      },
    );
    const roomType = output;
    res.redirect(`/product?room_type=${roomType}`);

    // After the successful upload, delete the local file
    fs.unlinkSync(imagePath);
  } catch (error) {
    console.error('Error during upload:', error);
    res.status(500).send('Error during upload');
  }
});

app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

app.post('/new_user', (req, res) => {
  const user = model.new_user(req.body.user, req.body.password);
  if (user != -1) {
    req.session.user = user;
    req.session.name = req.body.user;
    res.redirect('/');
  } else {
    res.redirect('/');
  }
});

app.post('/login', (req, res) => {
  const user = model.login(req.body.user, req.body.password);
  if (user != -1) {
    req.session.user = user;
    req.session.name = req.body.user;
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
});


// Route for rendering the index page
app.get('/', (req, res) => {
  res.render('index');
});

// Route for searching
app.get('/search', (req, res) => {
  let found = model.search(req.query.query, req.query.page);
  res.render('search', found);
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/new_user', (req, res) => {
  res.render('new_user');

});

app.get('/product', async (req, res) => {
  const roomType = req.query.room_type; // Changed from 'req.query.roomType'
  let searchResults = model.search("", 1, roomType);
  console.log(`roomType: ${roomType}`);
  console.log(`searchResults: ${JSON.stringify(searchResults)}`);
  res.render('product', searchResults);
});



app.listen(3000, () => console.log('listening on http://localhost:3000'));