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
var fs = require('fs');
var CLITest = require('../framework/cli-test');

var suite;
var vmPrefix = 'ClitestVm';
var testPrefix = 'cli.vm.export_create_from-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location,
      timeout,
      username = 'azureuser',
      password = 'PassW0rd$',
      file = 'vminfo.json';

    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false,
      blobDelete: false
    };

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        vmName = suite.isMocked ? 'xplattestvm' : suite.generateId(vmPrefix, null);
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isMocked ? 0 : 5000;
        done();
      });
    });

    afterEach(function(done) {
      function deleteUsedVM(vm, callback) {
        if (vm.Created && vm.Delete) {
          var cmd = vm.blobDelete ?
            util.format('vm delete %s -b -q --json', vm.Name).split(' ') :
            util.format('vm delete %s -q --json', vm.Name).split(' ');
          setTimeout(function() {
            suite.execute(cmd, function(result) {
              result.exitStatus.should.equal(0);
              vm.Name = null;
              vm.Created = vm.Delete = false;
              return callback();
            });
          }, timeout);
        } else {
          return callback();
        }
      }

      deleteUsedVM(vmToUse, function() {
        suite.teardownTest(done);
      });
    });

    //create a vm from role file
    describe('VM:', function() {

      it('export and delete', function(done) {
        createVM(function() {
          suite.execute('vm export %s %s  --json', vmName, file, function(result) {
            result.exitStatus.should.equal(0);
            fs.existsSync(file).should.equal(true);
            vmToUse.Delete = true;
            setTimeout(done, timeout);
          });
        });
      });

      it('Create-from a file', function(done) {
        var Fileresult = fs.readFileSync(file, 'utf8');
        var obj = JSON.parse(Fileresult);
        obj['RoleName'] = vmName;
        var diskName = obj.oSVirtualHardDisk.name;
        waitForDiskRelease(diskName, function() {
          var jsonstr = JSON.stringify(obj);
          fs.writeFileSync(file, jsonstr);
          suite.execute('vm create-from %s %s --json -l %s', vmName, file, location, function(result) {
            result.exitStatus.should.equal(0);
            vmToUse.Name = vmName;
            vmToUse.Created = true;
            fs.unlinkSync('vminfo.json');
            vmToUse.Delete = true;
            vmToUse.blobDelete = true;
            setTimeout(done, timeout);
          });
        });
      });
    });

    //check if disk is released from vm and then if released call callback or else wait till it is released
    function waitForDiskRelease(vmDisk, callback) {
      var vmDiskObj;
      suite.execute('vm disk show %s --json', vmDisk, function(result) {
        result.exitStatus.should.equal(0);
        vmDiskObj = JSON.parse(result.text);
        if (vmDiskObj.usageDetails && vmDiskObj.usageDetails.deploymentName) {
          setTimeout(function() {
            waitForDiskRelease(vmDisk, callback);
          }, 10000);
        } else {
          callback();
        }
      });
    }

    function createVM(callback) {
      getImageName('Linux', function(imagename) {
        suite.execute('vm create %s %s %s %s -l %s --json', vmName, imagename, username, password, location,
          function(result) {
            result.exitStatus.should.equal(0);
            vmToUse.Name = vmName;
            vmToUse.Created = true;
            setTimeout(callback, timeout);
          });
      });
    }

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      var cmd = util.format('vm image list --json').split(' ');
      suite.execute(cmd, function(result) {
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