var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel =  require("./posts");
const upload = require('./multer');
const passport = require('passport');
const localStrategy = require('passport-local');
passport.use(new localStrategy(userModel.authenticate()));

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index',{nav:false, error:req.flash('error')});
});

router.get('/login', function(req, res, next) {
  res.render('index', {nav:false, error:req.flash('error')});
});

router.get('/register', function(req,res, next){
  res.render('register', {nav:false});
});

router.get('/profile', isLoggedIn, async function(req, res, next){
  const user = await userModel.findOne({username:req.session.passport.user}).populate("posts");
  res.render('profile',{user, nav:true});
});

router.get('/savedposts', isLoggedIn, async function(req, res, next){
  const user = await userModel.findOne({username:req.session.passport.user}).populate("savedPosts");
  res.render("show", {user, nav:true});
});

router.get('/edit', isLoggedIn, async function(req, res, next){
  const user = await userModel.findOne({username:req.session.passport.user}).populate("posts");
  res.render('edit',{user, nav:true});
});


router.get('/add', isLoggedIn, async function(req, res, next){
  res.render('add',{nav:true});
});

router.get('/logout', function(req, res, next){
  req.logout(function(err){
    if(err){
      return next(err);
    }
    res.redirect('/');
  })
})


router.get('/feed',isLoggedIn, async function(req, res, next){
  //const user = await userModel.find().populate("posts");
  const post = await postModel.find().populate("user");
  res.render('feed', {post, nav:true});
});

router.get('/singlepost/:id', isLoggedIn, async function(req, res, next){
  // const user = await userModel.findOne({username:req.session.passport.user}).populate("posts");
  try {
    const postId = req.params.id.replace(':', '');
    const post = await postModel.findById(postId).populate("user");
    if (!post) {
      return res.status(404).send('Post not found');
    }
    const user = await userModel.findById(post.user);
    res.render('singlepost', {user, post, nav:true});
  } catch (err) {
    next(err);
  }
});

router.get('/userprofile/:id', isLoggedIn, async function(req, res, next){
  // const user = await userModel.findOne({username:req.session.passport.user}).populate("posts");
  try {
    const userId = req.params.id.replace(':', '');
    const user = await userModel.findById(userId).populate("posts");
    if (!user) {
      return res.status(404).send('User not found');
    }
    console.log(user);
    res.render('userprofile', {user, nav:true});
  } catch (err) {
    next(err);
  }
});


router.get('/delete/:id',isLoggedIn, async function(req, res, next) {
  try {
    // Find the post by ID
    const postId = req.params.id.replace(':', '');
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Remove the post from the user's posts array
    await userModel.updateMany({}, { $pull: { posts: postId } });

    // Delete the post from the Post model
    await postModel.findByIdAndDelete(postId);

    res.redirect('/profile');
  }
  
  catch (err) {
    next(err);
  }
});

router.get('/explore', isLoggedIn, async function(req, res, next){
  res.render('search', {nav:true});
});

router.get('/result/:title', async function(req, res){
  const postId = req.params.title.replace(':', '');
  const regex = new RegExp(`^${postId}`, 'i');
  const post = await postModel.find({title:regex});
  res.json(post);
});


router.get('/savethepost/:id', isLoggedIn, async function(req, res, next){
  const user = await userModel.findOne({username:req.session.passport.user});
  try {
    const postId = req.params.id.replace(':', '');
    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).send('Post not found');
    }
    //if already saved don't save
    //if not, just save it
    let message="Post saved successfully";
    let color = "green";
    if(user.savedPosts.indexOf(postId) === -1){
      user.savedPosts.push(postId);
    }
    else{
      user.savedPosts.splice(user.savedPosts.indexOf(postId), 1);
      message="Post Unsaved";
      color = "orange";
    }
    await user.save();
    console.log(message);
    res.status(200).json({message, color});
  } catch (err) {
    next(err);
  }
});



router.post('/createpost', isLoggedIn, upload.single('postimage'), async function(req, res, next){
  const user = await userModel.findOne({username:req.session.passport.user});
  const postdata =  await postModel.create({
    user: user._id,
    title: req.body.title,
    description: req.body.description,
    image:req.file.filename
  });
  user.posts.push(postdata._id);
  await user.save();
  res.redirect('/profile');
});

router.post('/register', function(req, res, next){
  const data = new userModel({
    name: req.body.name,
    username: req.body.username,
    email: req.body.email,
  });
  userModel.register(data, req.body.password).then(function(){
      passport.authenticate("local")(req, res, function(){
        res.redirect("/profile");
      })
    })
});


router.post('/update', isLoggedIn, upload.single('image'), async function(req, res, next){
  const user = await userModel.findOneAndUpdate({username:req.session.passport.user}, {
    name:req.body.name,
    username:req.body.username,
   },
   {new:true});
   if(req.file){
    user.profileImage =  req.file.filename;
   }
   await user.save();
   res.redirect("/profile");
})

router.post('/login', passport.authenticate("local" ,{
  successRedirect: "/profile",
  failureRedirect:"/login",
  failureFlash:true}), 
  function(req, res){});

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/");
}

module.exports = router;
