/**
 * Copyright (c) Microsoft.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var should = require('should');
var util = require('util');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');

var suite;
var vmPrefix = 'ClitestVm';
var testPrefix = 'cli.vm.create_win_rdp-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      vmImgName,
      username = 'azureuser',
      password = 'PassW0rd$',
      location, retry = 5;

    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
      vmName = suite.isMocked ? 'XplattestVm1' : suite.generateId(vmPrefix, null);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isMocked ? 0 : 30000;
        done();
      });
    });

    afterEach(function(done) {
      function deleteUsedVM(vm, callback) {
        if (vm.Created && vm.Delete && !suite.isMocked) {
          setTimeout(function() {
            var cmd = util.format('vm delete %s -b -q --json', vm.Name).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              vm.Name = null;
              vm.Created = vm.Delete = false;
              setTimeout(callback, timeout);
            });
          }, timeout);
        } else {
          callback();
        }
      }

      deleteUsedVM(vmToUse, function() {
        suite.teardownTest(done);
      });
    });

    //create a vm with windows image
    describe('Create:', function() {
      it('Windows Vm', function(done) {
        getImageName('Windows', function(ImageName) {
          var cmd = util.format('vm create %s %s %s %s -r --json',
            vmName, ImageName, username, password).split(' ');
          cmd.push('-l');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            setTimeout(done, timeout);
          });
        });
      });
    });

    //create a vm with connect option
    describe('Create:', function() {
      it('with Connect', function(done) {
        var vmConnect = vmName + '-2';
        var cmd = util.format('vm create -l %s --connect %s %s %s %s --json',
          'someLoc', vmName, vmImgName, username, password).split(' ');
        cmd[3] = location;
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          vmToUse.Name = vmConnect;
          vmToUse.Created = true;
          vmToUse.Delete = true;
          done();
        });
      });
    });

    // Negative Test Case by specifying VM Name Twice
    describe('Negative test case:', function() {
      it('Specifying Vm Name Twice', function(done) {
        var cmd = util.format('vm create %s %s %s %s--json',
          vmName, vmImgName, username, password).split(' ');
        cmd.push('-l');
        cmd.push(location);
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(1);
          result.errorText.should.include('A VM with dns prefix "' + vmName + '" already exists');
          vmToUse.Name = vmName;
          vmToUse.Created = true;
          vmToUse.Delete = true;
          done();
        });
      });
    });

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      var cmd = util.format('vm image list --json').split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        var imageList = JSON.parse(result.text);
        imageList.some(function(image) {
          if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
            vmImgName = image.name;
            return true;
          }
        });
        callBack(vmImgName);
      });
    }
  });
});