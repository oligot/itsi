var fs = require('fs');
var path = require('path');
var url = require('url');
var inquirer = require('inquirer');
var _ = require('lodash');
var request = require('superagent');
var redmine = require('./redmine');
var shell = require('shelljs');

var itsi = {};
var options = { redmine: {}};
var configName = '.itsi.json';
var STATUS_IN_PROGRESS = 2;
var STATUS_RESOLVED = 3;

/**
 * Reads or creates the per project configuration file.
 */

function config(callback) {
  if (!fs.existsSync(configName)) {
    inquirer.prompt([{
      name: 'projectId',
      message: 'Redmine project identifier'
    }], function(answers) {
      options.redmine.projectId = answers.projectId;
      fs.writeFileSync(configName, JSON.stringify( { redmine: { projectId: answers.projectId }}, null, 2));
      callback();
    });
  } else {
    _.merge(options, JSON.parse(fs.readFileSync(configName, 'utf8')));
    callback();
  }
}

/**
 * Bootstrap phase that populates the options.
 * Optionally creates the global and per project configuration files
 * if they don't exist yet.
 * @api public
 */

itsi.bootstrap = function(callback) {
  var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  var global = path.join(home, configName);
  if (!fs.existsSync(global)) {
    inquirer.prompt([{
      name: 'apiKey',
      message: 'Redmine API key'
    }, {
      name: 'serverURL',
      message: 'Redmine server URL'
    }], function(answers) {
      options.redmine.apiKey = answers.apiKey;
      options.redmine.serverURL = answers.serverURL;
      fs.writeFileSync(global, JSON.stringify(options, null, 2));
      config(callback);
    });
  } else {
    options = JSON.parse(fs.readFileSync(global, 'utf8'));
    config(callback);
  }
}

/** Create a new issue.
 *
 * @param {String} subject
 * @api public
 */

itsi.create = function(subject, callback) {
  request
    .post(url.resolve(options.redmine.serverURL, 'issues.json'))
    .send({ issue: { project_id: options.redmine.projectId, subject: subject }})
    .set('X-Redmine-API-Key', options.redmine.apiKey)
    .set('Content-Type', 'application/json')
    .end(function(res) {
      if (res.ok) {
        console.log('Issue', res.body.issue.id, 'created');
        callback();
      } else {
        callback(new Error('Error occured while creating the issue: ' + res.text));
      }
    });
}

/** Start to work on an issue.
 *
 * @api public
 */

itsi.work = function(callback) {
  request
    .get(url.resolve(options.redmine.serverURL, 'issues.json'))
    .query({ project_id: options.redmine.projectId})
    .end(function(res) {
      if (res.ok) {
        var choices = res.body.issues.map(function (issue) {
          return { name: issue.subject, value: issue.id };
        });
        inquirer.prompt([{
          type: 'list',
          name: 'issueId',
          message: 'Which issue do you want to work with ?',
          choices: choices
        }], function(answers) {
          var issueId = answers.issueId;
          fs.writeFileSync(configName, JSON.stringify( { redmine: { projectId: options.redmine.projectId, issueId: issueId }}, null, 2));
          request
          .get(url.resolve(options.redmine.serverURL, 'users/current.json'))
          .set('X-Redmine-API-Key', options.redmine.apiKey)
          .set('Content-Type', 'application/json')
          .end(function(res) {
            if (res.ok) {
              redmine(options)
              .issue
              .put(issueId, { issue: { status_id: STATUS_IN_PROGRESS, assigned_to_id: res.body.user.id }}, callback);
            } else {
              callback(new Error('Error occured while reading the current user: ' + res.text));
            }
          });
        });
      } else {
        callback(new Error('Error occured while listing the issues: ' + res.text));
      }
    });
}

/** Commit the work done on an issue.
 *
 * @api public
 */

itsi.done = function(callback) {
  var config = JSON.parse(fs.readFileSync(configName, 'utf8'));
  var issueId = config.redmine.issueId;
  request
    .get(url.resolve(options.redmine.serverURL, 'issues/' + issueId + '.json'))
    .end(function(res) {
      if (res.ok) {
        shell.exec('git commit -am "' + res.body.issue.subject + ' (refs #' + issueId + ')"');
        console.log('File(s) committed');
        redmine(options)
        .issue
        .put(issueId, { issue: { status_id: STATUS_RESOLVED, done_ratio: 100 }}, callback);
      } else {
        callback(new Error('Error occured while reading the issue ' + issueId + ': ' + res.text));
      }
    });
}

module.exports = itsi;
