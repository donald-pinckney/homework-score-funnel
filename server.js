const http = require('http');
const qs = require('querystring');
const fs = require('fs');
const exec = require('child_process').exec;

const hostname = '198.23.128.60';
const port = 80;

var model = {};
try {
    model = JSON.parse(fs.readFileSync('model.json', 'utf8'));
}
catch(e) {
    console.log("Could not find model.json");
}

const basicREADME = fs.readFileSync("homework-repo/testing/.README.md", 'utf8');


function writeModelToDisk(model) {
    console.log("Model:")
    console.log(model)
    fs.writeFile("model.json", JSON.stringify(model, null, 4), function(err) {
        if(err) {
            console.log(err);
        }
    });
}

function doGitTransaction(newReadme) {

    exec("cd homework-repo && git pull", function(error, out, err) {
        fs.writeFile("homework-repo/README.md", newReadme, function(err) {
            exec("cd homework-repo && git commit README.md -m \"Update scores\" && git push", function(error2, out2, err2) {
                console.log("Completed push");
            });
        });
    });
}

function sendToGithub(model) {
    var rows = "";
    var cols = [];

    for(var name in model) {
        var row = "|" + name + "|";
        var nameResults = model[name];

        var colIndex = 0;
        var problemNum = 1;
        while(true) {
            if(!("problem" + problemNum in nameResults)) {
                break;
            }

            var problemResults = nameResults["problem" + problemNum];
            
            var testNum = 1;
            while(true) {
                if(!("test" + testNum in problemResults)) {
                    break;
                }

                cols[colIndex] = "Problem " + problemNum + ", Test " + testNum;
                // Parse problem and test
                var code = problemResults["test" + testNum]["code"];
                var time = problemResults["test" + testNum]["time"];
               
                var codeText = "";
                if(code == 0) {
                    codeText = "**Correct** :+1:";
                } else if(code == 1) {
                    codeText = "*Incorrect* :sob:";
                } else if(code == 2) {
                    codeText = "*Timeout* :hourglass:";
                } else if(code == 3) {
                    codeText = "*Didn't compile* :warning:";
                } else if(code == 4) {
                    codeText = "*Runtime error* :bomb:";
                }

                row += codeText + ", " + time + "|";

                colIndex++;
                testNum++;
            }

            problemNum++;
        }

        rows += row + "\n"
    }

    var table = "|Name|";
    for(var colIdx in cols) {
        table += cols[colIdx] + "|";
    }
    table += "\n|---|";
    for(var col in cols) {
        table += "---|";
    }
    table += "\n" + rows;

    var newReadme = basicREADME.replace("<#SCORES_TABLE#>", table);
    doGitTransaction(newReadme);
}

function handleHomeworkInput(input) {
    const name = input.name;
    var data = model[name];
    if(data === undefined) {
        data = {};
    }

    var problemNum = 1;
    while(true) {
        var testNum = 1;
        while(true) {
            if(!("problem" + problemNum + "," + testNum + "-code" in input)) {
                break;
            }

            // Parse problem and test
            var code = input["problem" + problemNum + "," + testNum + "-code"];
            var time = input["problem" + problemNum + "," + testNum + "-time"];
           
            var probKey = "problem" + problemNum;
            var testKey = "test" + testNum;
            if(data[probKey] === undefined) {
                data[probKey] = {};
            }
            if(data[probKey][testNum] === undefined) {
                data[probKey][testKey] = {};
            }
            data[probKey][testKey]["code"] = parseInt(code);
            data[probKey][testKey]["time"] = time;

            testNum++;
        }

        if(testNum === 1) {
            break;
        }

        problemNum++;
    }

    model[name] = data;
    writeModelToDisk(model);
    sendToGithub(model);
}

const server = http.createServer(function(req, res) {
    console.log("Received request: ");

    if(req.method == "POST") {
        var body = [];
        req.on('data', function (data) {
            body.push(data);
            if(body.length > 1e6) {
                req.connection.destroy()
            }
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            console.log("Body: " + body);
            var post = qs.parse(body)
            console.log(post);
            handleHomeworkInput(post);
        });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('\n');
}).listen(80);

