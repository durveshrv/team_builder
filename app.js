const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 3004;
const mysql = require("./connection").con;
// configuration
app.set("view engine", "hbs");
app.set("views", "./views");
app.use(express.static(__dirname + "/static"));
app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.status(200).render("index");
});

app.get("/profile", (req, res) => {
  res.status(200).render("profile");
});

app.get("/signup_signin", (req, res) => {
  res.status(200).render("signup_signin");
});

app.get("/updateuser", (req, res) => {
  res.status(200).render("update");
});
app.get("/userid", (req, res) => {
  res.status(200).render("userid");
});

app.get("/project", (req, res) => {
  res.status(200).render("project");
});

app.get("/projectupdate", (req, res) => {
  res.status(200).render("projectupdate");
});

app.get("/proid", (req, res) => {
  res.status(200).render("proid");
});
//signup form
app.get("/signup", (req, res) => {
  // fetching data from form
  const { uname, email, pw } = req.query;
  // Sanitization XSS...
  let qry = "select * from signup where emailid=? or password=?";
  mysql.query(qry, [email, pw], (err, results) => {
    if (err) throw err;
    else {
      if (results.length > 0) {
        res.render("signup_signin", { checkmesg: true });
      } else {
        // insert query
        let qry2 =
          "insert into signup(username,emailid,password) values(?,?,?)";
        console.log("Executing INSERT query...");
        mysql.query(qry2, [uname, email, pw], (err, insertresults) => {
          if (err) {
            console.error("Error during INSERT query:", err);
            res
              .status(500)
              .send("An error occurred while processing your request.");
            return;
          }
          console.log("Query executed successfully.");
          if (insertresults && insertresults.affectedRows > 0) {
            console.log("Data inserted successfully.");
            res.render("signup_signin", { mesg: true });
          }
        });
      }
    }
  });
});
app.post("/add-project", (req, res) => {
  const {
    projectname,
    projectleadername,
    projectleaderemail,
    projectdomain,
    projectdescription,
    status,
    vacancy_title,
    vacancy_number,
    vacancy_description,
  } = req.body; // Use req.body to access form data
  // Check if the project already exists by project name
  let qry = "SELECT * FROM project WHERE projectname=?";
  mysql.query(qry, [projectname], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      // Project with the same name already exists
      res.render("project", { checkmesg: true });
    } else {
      // Insert the project into the "project" table
      let qry2 =
        "INSERT INTO project (projectname, projectleadername, projectleaderemail, projectdomain, projectdescription, status) VALUES (?, ?, ?, ?, ?, ?)";
      mysql.query(
        qry2,
        [
          projectname,
          projectleadername,
          projectleaderemail,
          projectdomain,
          projectdescription,
          status,
        ],
        (err, insertresults) => {
          if (err) {
            console.error("Error during INSERT query:", err);
            res
              .status(500)
              .send("An error occurred while processing your request.");
          } else {
            // Get the ID of the inserted project
            const projectId = insertresults.insertId;
            // Check if vacancy data is in the expected format
            let qry3 =
              "INSERT INTO vacancy (projectid, vacancytitle, vacancynumber, vacancydescription) VALUES (?, ?, ?, ?)";
            mysql.query(
              qry3,
              [projectId, vacancy_title, vacancy_number, vacancy_description],
              (err, result) => {
                if (err) {
                  console.error("Error during INSERT query:", err);
                  res
                    .status(500)
                    .send("An error occurred while processing your request.");
                  return;
                }
                console.log("Query executed successfully.");
                if (result && result.affectedRows > 0) {
                  console.log("Data inserted successfully.");
                  let qry =
                    "select * from signup where emailid=? and username=?";
                  mysql.query(qry, [projectleaderemail,projectleadername], (err, resultine) => {
                    if (err) {
                      throw err;
                    } else {
                      if (resultine.length > 0) {
                        res.render("profile", { mesg: true, data: resultine });
                      } 
                    }
                  });
                }
              }
            );
          }
        }
      );
    }
  });
});
app.get("/past_project_view", (req, res) => {
  const state="Completed";
  let qry = "select p.* from project p inner join vacancy v where p.status=? and v.vacancynumber=?";
  mysql.query(qry,[state,0],(err, results) => {
      if (err) throw err
      else {
          res.render("past_project_view", { data: results });
      }
  });
});
app.get("/vacancy_view", (req, res) => {
  const state="Completed";
  let qry = "select p.*,v.* from project p inner join vacancy v where p.status!=? and v.vacancynumber!=?";
  mysql.query(qry,[state,0],(err, results) => {
      if (err) throw err
      else {
          res.render("vacancy_view", { data: results });
      }
  });
});
app.post("/update_project", (req, res) => {
  const {
    projectname,
    projectleadername,
    projectleaderemail,
    projectdomain,
    projectdescription,
    status,
    vacancy_title,
    vacancy_number,
    vacancy_description
  } = req.body;

  // Ensure that you have the necessary data before proceeding
  if (!projectname || !projectleadername || !projectleaderemail) {
    return res.status(400).send("Missing required data.");
  }

  const qry2 = "UPDATE project SET projectname=?, projectdomain=?, projectdescription=?, status=? WHERE projectleaderemail=? AND projectleadername=?";
  const qry3 = "UPDATE vacancy SET vacancytitle=?, vacancynumber=?, vacancydescription=? WHERE projectid = (SELECT projectid FROM project WHERE projectname = ?)";

  mysql.beginTransaction((err) => {
    if (err) {
      console.error("Error starting database transaction:", err);
      return res.status(500).send("An error occurred while processing your request.");
    }

    mysql.query(qry2, [projectname, projectdomain, projectdescription, status, projectleaderemail, projectleadername], (err, result) => {
      if (err) {
        console.error("Error updating project:", err);
        return mysql.rollback(() => {
          res.status(500).send("An error occurred while processing your request.");
        });
      }

      mysql.query(qry3, [vacancy_title, vacancy_number, vacancy_description, projectname], (err, result) => {
        if (err) {
          console.error("Error updating vacancy:", err);
          return mysql.rollback(() => {
            res.status(500).send("An error occurred while processing your request.");
          });
        }

        mysql.commit((commitErr) => {
          if (commitErr) {
            console.error("Error committing transaction:", commitErr);
            return mysql.rollback(() => {
              res.status(500).send("An error occurred while processing your request.");
            });
          }

          console.log("Data updated successfully.");
          let qry =
            "select * from signup where emailid=? and username=?";
          mysql.query(qry, [projectleaderemail, projectleadername], (err, resultine) => {
            if (err) {
              throw err;
            } else {
              if (resultine.length > 0) {
                res.render("profile", { umesg: true, mesg: false, data: resultine });
              }
            }
          });
        });
      });
    });
  });
});

app.get("/update", (req, res) => {
  const username = req.query.username;
  let qry = "select * from signup where username=?";
  mysql.query(qry, [username], (err, results) => {
    if (err) throw err;
    else {
      if (results.length > 0) {
        res.render("updateuser", { data: results });
      } else {
        res.render("userid", { mesg: true });
      }
    }
  });
});
app.get("/update_proid", (req, res) => {
  const projectname = req.query.projectname;
  let qry = "select * from project where projectname=?";
  mysql.query(qry, [projectname], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "An error occurred" });
    } else {
      if (results.length > 0) {
        const projectId = results[0].projectid; // Assuming projectid is a property in the results

        let qry2 = "select * from vacancy where projectid=?";
        mysql.query(qry2, [projectId], (err, result) => {
          if (err) {
            console.error(err);
            res.status(500).json({ error: "An error occurred" });
          } else {
            if (result.length > 0) {
              // Return a JSON response with the URL for redirection
              res.render("projectupdate",{data:results,data1:result});
            } else {
              // Handle the case where no related vacancies were found
              res.render("proid",{cmesg:true,mesg:false});
            }
          }
        });
      } else {
        // Handle the case where the project name is not found
        res.render("proid",{mesg:true,cmesg:false});
      }
    }
  });
});
//signin form
  app.get("/signin", (req, res) => {
    // fetching data from form
    const { email, pw } = req.query;
    let qry = "select * from signup where emailid=? and password=?";
    mysql.query(qry, [email,pw], (err, results) => {
        if (err) {
            throw err;
        } else {
            if(results.length>0){
              res.render("profile",{data:results});
            }
            else{
              res.render("signup_signin",{lmesg:true})
            }
        }
    });
});
app.get("/update-profile", (req, res) => {
  
  const { username,fullname,prof,skill,email,bio } = req.query;
  let qry = "update signup set name=?, profession=?,skills=?, bio=? where emailid=? and username=?";

  mysql.query(qry, [fullname,prof,skill,bio,email,username], (err, xresults) => {
      if (err) throw err
      else {
        if (xresults.affectedRows > 0) {
          const selectQuery = "SELECT * FROM signup WHERE emailid = ? AND username = ?";      
          mysql.query(selectQuery, [email, username], (selectErr, selectResults) => {
              if (selectErr) {
                  throw selectErr;
              }          
              if (selectResults.length > 0) {
                  const updatedData = selectResults[0];
                  res.render("profile", { data: updatedData });
              } else {
                  res.send("No data found after the update.");
              }
          });
        }        
      }
  })
});
app.listen(port, () => {
  console.log(`The app started successfully on port ${port}`);
});
