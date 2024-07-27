const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = mongoose;

//Schemas
const exerciseSchema = new Schema(
  {
    description: String,
    duration: Number,
    date: String,
  },
  { _id: false }
);

const userShema = new Schema(
  {
    username: {
      type: String,
      unique: true,
    },
    log: [exerciseSchema],
  },
  { unique: true }
);

//models
const ExerciseModel = mongoose.model("exercise", exerciseSchema);
const UserModel = mongoose.model("user", userShema);

//middlewares
app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

//routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// /user
app.get("/api/users", (req, res) => {
  UserModel.find({})
    .select(["username"])
    .then((docs) => {
      res.json(docs);
    })
    .catch((err) => {
      res.json({ error: err });
    });
});

app.post("/api/users", (req, res) => {
  new UserModel({ username: req.body.username })
    .save()
    .then(({ username, _id }) => {
      res.json({ username, _id });
    })
    .catch((err) => {
      res.json({ error: err });
    });
});

// /users/:_id/exercises
app.post("/api/users/:_id/exercises", (req, res) => {
  const { description, duration, date } = req.body;

  const exercise = new ExerciseModel({
    description: description,
    duration: duration,
    date:
      date?.trim() === "" || date === undefined
        ? new Date().toDateString()
        : new Date(date).toDateString(),
  });

  UserModel.findOne({ _id: req.params._id })
    .then((doc) => {
      if (doc) {
        doc.log.push(exercise);

        doc
          .save()
          .then((doc) => {
            res.json({
              username: doc.username,
              description: exercise.description,
              duration: exercise.duration,
              date: exercise.date,
              _id: doc._id,
            });
          })
          .catch((err) => {
            res.json({ error: err });
          });

        return;
      }

      res.json({ error: "User does not exist" });
    })
    .catch((err) => {
      res.json({ error: err });
    });
});

// /users/:_id/logs
app.get("/api/users/:_id/logs", (req, res) => {
  const { from, to, limit } = req.query;
  console.log(from, to, limit);

  UserModel.findOne({ _id: new mongoose.Types.ObjectId(req.params._id) })
    .then((doc) => {

      res.json({
        _id: doc._id,
        username: doc.username,
        count: doc.log.length,
        log: doc.log
          .filter((entry, index, logArray) => {
            return (
              (from !== undefined
                ? new Date(entry.date) >= new Date(from)
                : true) &&
              (to !== undefined ? new Date(entry.date) <= new Date(to) : true)
            );
          })
          .slice(0, limit),
      });
    })
    .catch((err) => {
      res.json({ error: err });
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Your app is listening on port " + listener.address().port);
    })
    .catch(() => {
      console.log("failed to connect to the database");
    });
});

