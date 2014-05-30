var issue = require('./issue');

function redmine(options) {
  return {
    issue: issue(options)
  }
}

module.exports = redmine;
