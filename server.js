// Warnings do not click scrape for newest articles it will crash the heroku app 
// Clicking the Article link will not send you to the actual article still trying to solve that problem
// Images for the articles will not appear working on fixing it 
// Dependencies
var axios = require("axios");
var express = require("express");
var method = require("method-override");
var body = require("body-parser");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");
var logger = require("morgan");
var cheerio = require("cheerio");
var request = require("request");

// Mongoose
require("./config")
var Note = require("./models/Note");
var Article = require("./models/Article");


mongoose.Promise = Promise;
var db = mongoose.connection;

db.on("error", function (error) {
    console.log("Mongoose Error: ", error);
});

db.once("open", function () {
    console.log("Mongoose connection successful.");
});

var app = express();
var port = process.env.PORT || 3000;

// app set-ups

app.use(logger("dev"));
app.use(express.static("public"));
app.use(body.urlencoded({ extended: false }));
app.use(method("_method"));
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.listen(port, function () {
    console.log("Listening on port " + port);
})

// Routes

app.get("/", function (req, res) {
    Article.find({}, null, { sort: { created: -1 } }, function (err, data) {
        if (data.length === 0) {
            res.render("placeholder", { message: "There's nothing scraped yet. Please click \"Scrape For Newest Articles\" for fresh and delicious news." });
        }
        else {
            res.render("index", { articles: data });
        }
    });
});

app.get("/scrape", function (req, res) {
    console.log("scrape");
    axios.get("https://www.latimes.com/entertainment/music").then(function (response) {
        var $ = cheerio.load(response.data);
        var result = {};
        console.log('this')
        $(".flex-grid").each(function (i, element) {
            var link = $(element).find("a").attr("href");
            var title = $(element).find("h5").text().trim();
            var summary = $(element).find("p.summary").text().trim();
            var img = $(element).find("img").attr("src");
            console.log(img);
            console.log(title);
            result.link = link;
            result.title = title;
            if (summary) {
                result.summary = summary;
            };
            if (img) {
                result.img = img;
            }
            else {
                result.img = $(element).find("img").attr("src");
            };
            // var entry = new Article(result);
            // Article.find({ title: result.title }, function (err, data) {
            //     if (data.length === 0) {
            //         entry.save(function (err, data) {
            //             if (err) throw err;
            //         });
            //     }
            // });
        });
        console.log("Scrape finished.");
        res.redirect("/");
    });
});

app.get("/saved", function (req, res) {
    Article.find({ issaved: true }, null, { sort: { created: -1 } }, function (err, data) {
        if (data.length === 0) {
            res.render("placeholder", { message: "You have not saved any articles yet. Try to save some delicious news by simply clicking \"Save Article\"!" });
        }
        else {
            res.render("saved", { saved: data });
        }
    });
});

app.get("/:id", function (req, res) {
    Article.findById(req.params.id, function (err, data) {
        res.json(data);
    })
})

app.post("/search", function (req, res) {
    console.log(req.body.search);
    Article.find({ $text: { $search: req.body.search, $caseSensitive: false } }, null, { sort: { created: -1 } }, function (err, data) {
        console.log(data);
        if (data.length === 0) {
            res.render("placeholder", { message: "Nothing has been found. Please try other keywords." });
        }
        else {
            res.render("search", { search: data })
        }
    })
});

app.post("/save/:id", function (req, res) {
    Article.findById(req.params.id, function (err, data) {
        if (data.issaved) {
            Article.findByIdAndUpdate(req.params.id, { $set: { issaved: false, status: "Save Article" } }, { new: true }, function (err, data) {
                res.redirect("/");
            });
        }
        else {
            Article.findByIdAndUpdate(req.params.id, { $set: { issaved: true, status: "Saved" } }, { new: true }, function (err, data) {
                res.redirect("/saved");
            });
        }
    });
});

app.post("/note/:id", function (req, res) {
    var note = new Note(req.body);
    note.save(function (err, doc) {
        if (err) throw err;
        Article.findByIdAndUpdate(req.params.id, { $set: { "note": doc._id } }, { new: true }, function (err, newdoc) {
            if (err) throw err;
            else {
                res.send(newdoc);
            }
        });
    });
});

app.get("/note/:id", function (req, res) {
    var id = req.params.id;
    Article.findById(id).populate("note").exec(function (err, data) {
        res.send(data.note);
    })
})