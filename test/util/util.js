// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 
var fs = require('fs');

var exports = module.exports;

/**
 * Generates an unique identifier using a prefix, based on a currentList and repeatable or not depending on the isMocked flag.
 *
 * @param {string} prefix          The prefix to use in the identifier.
 * @param {array}  currentList     The current list of identifiers.
 * @param {bool}   isMocked        Boolean flag indicating if the test is mocked or not.
 * @return {string} A new unique identifier.
 */
exports.generateId = function(prefix, currentList, isMocked) {
  if (!currentList) {
    currentList = [];
  }

  while (true) {
    var newNumber;
    if (isMocked) {
      // Predictable
      newNumber = prefix + (currentList.length + 1);
      currentList.push(newNumber);

      return newNumber;
    } else {
      // Random
      newNumber = prefix + Math.floor(Math.random() * 10000);
      if (currentList.indexOf(newNumber) === -1) {
        currentList.push(newNumber);

        return newNumber;
      }
    }
  }
};

exports.randomFromTo = function(from, to) {
  return Math.floor(Math.random() * (to - from + 1) + from);
};

exports.libFolder = function() {
  return process.env['AZURE_LIB_PATH'] ? process.env['AZURE_LIB_PATH'] : 'lib';
};

exports.libRequire = function(path) {
  return require('../../' + exports.libFolder() + '/' + path);
};

exports.getCertificateKey = function() {
  if (process.env['AZURE_CERTIFICATE_KEY']) {
    return process.env['AZURE_CERTIFICATE_KEY'];
  } else if (process.env['AZURE_CERTIFICATE_KEY_FILE']) {
    return fs.readFileSync(process.env['AZURE_CERTIFICATE_KEY_FILE']).toString();
  }

  return null;
};

exports.getCertificate = function() {
  if (process.env['AZURE_CERTIFICATE']) {
    return process.env['AZURE_CERTIFICATE'];
  } else if (process.env['AZURE_CERTIFICATE_FILE']) {
    return fs.readFileSync(process.env['AZURE_CERTIFICATE_FILE']).toString();
  }

  return null;
};

//generate a random string
exports.generateRandomString = function(length) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz0123456789';
  var randString = '',
    randNum = '';
  for (var i = 0; i < length; i++) {
    //61 is the chars.length
    randNum = Math.floor(Math.random() * 61);
    randString += chars.substring(randNum, randNum + 1);
  }
  return randString;
};

/**
 * Provides information about the template based on the specified keyword
 *
 * @param {Object}   suite     The CLI Test suite object
 * @param {string}   keyword   The template name to search.
 * @param {callback} callback  callback
 * @return {Object} A JSON object with templateName, templateUrl, publisher and version as its properties.
 */
exports.getTemplateInfo = function(suite, keyword, callback) {
  var templates = [];
  var error;
  var templateInfo = {
    'templateName': '',
    'templateUrl': '',
    'publisher': '',
    'version': ''
  };
  suite.execute('group template list --json', function(result) {
    if (result.exitStatus === 0) {
      templates = JSON.parse(result.text);
      var templateNotFound = true;
      templates.forEach(function(item) {
        var regex = new RegExp(keyword, 'i');
        if (item.identity.match(regex)) {
          templateNotFound = false;
          templateInfo.templateName = item.identity;
          templateInfo.publisher = item.publisher;
          templateInfo.version = item.version;
          var urlKeys = Object.keys(item.definitionTemplates.deploymentTemplateFileUrls);
          if (urlKeys.length > 0) {
            var urlKeyNotFound = true;
            urlKeys.forEach(function(urlKey) {
              if (urlKey.match(/Default/)) {
                urlKeyNotFound = false;
                templateInfo.templateUrl = item.definitionTemplates.deploymentTemplateFileUrls[urlKey];
              }
            });
            if (urlKeyNotFound) {
              callback(new Error('Cannot find the default template url'));
            }
          } else {
            callback(new Error('The template ' + item.identity + ' does not have any deployment template urls.'));
          }
        }
      });
      if (templateNotFound) {
        callback(new Error('Cannot find a template name with the given keyword ' + keyword));
      }
      callback(error, templateInfo);
    } else {
      callback(new Error(result.errorText));
    }
  });
};

exports.executeCommand = function(suite, retry, cmd, callback) {
  var self = this;
  suite.execute(cmd, function(result) {
    if (result.exitStatus === 1 && (result.errorText.indexOf('ECONNRESET') ||
      result.errorText.indexOf('ConflictError') ||
      result.errorText.indexOf('Please try this operation again late')) > -1 && retry--) {
      setTimeout(function() {
        self.executeCommand(suite, retry, cmd, callback);
      }, 5000);
    } else {
      //callback with error
      //here result can be checked for existstatus but dev will never know what command threw error
      //while looking at error message
      callback(result);
    }
  });
};