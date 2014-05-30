var url = require('url');
var request = require('superagent');

function issue(options) {
  return {
    put: function(id, data, callback) {
      request
      .put(url.resolve(options.redmine.serverURL, 'issues/' + id + '.json'))
      .send(data)
      .set('X-Redmine-API-Key', options.redmine.apiKey)
      .set('Content-Type', 'application/json')
      .end(function(res) {
        if (res.ok) {
          console.log('Issue', id, 'updated');
          callback();
        } else {
          callback(new Error('Error occured while updating the issue: ' + res.text));
        }
      });
    }
  }
}

module.exports = issue;
