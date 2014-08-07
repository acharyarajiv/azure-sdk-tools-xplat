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
var CLITest = require('../framework/cli-test');

var suite;
var vmPrefix = 'clitestvm';
var testPrefix = 'cli.vm.disk.attachnew-tests';

var requiredEnvironment = [{
    name : 'AZURE_VM_TEST_LOCATION',
    defaultValue : 'West US'
  }
];

describe('cli', function () {
  describe('vm', function () {
    var vmName,
    location,
    username = 'azureuser',
    password = 'PassW0rd$';

    before(function (done) {
      suite = new CLITest(testPrefix, [], isForceMocked);
      suite.setupSuite(done);
    });

    after(function (done) {
      deleteUsedVM(function () {
          suite.teardownSuite(done);
      });
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        vmName = suite.isMocked ? 'xplattestvm' : suite.generateId(vmPrefix, null);
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isMocked ? 0 : 5000;
        done();
      });
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    //attaches a new disk
    describe('Disk:', function () {
      it('Attach-New', function (done) {
        ListDisk(function ('Linux', function (diskObj) {
            createVM(function () {
              var domainUrl = 'http://' + diskObj.mediaLinkUri.split('/')[2];
              var blobUrl = domainUrl + '/disks/' + suite.generateId(vmPrefix, null) + '.vhd';
              suite.execute('vm disk attach-new %s %s %s --json', vmName, 1, blobUrl, function (result) {
                result.exitStatus.should.equal(0);
                waitForDiskOp(vmName, true, function () {
                  suite.execute('vm disk detach %s 0 --json', vmName, function (result) {
                    result.exitStatus.should.equal(0);
                    waitForDiskOp(vmName, false, done);
                  });
                });
              });
            });
          });
      });
    });

    function waitForDiskOp(vmName, DiskAttach, callback) {
      var vmObj;
      suite.execute('vm show %s --json', vmName, function (result) {
        result.exitStatus.should.equal(0);
        vmObj = JSON.parse(result.text);
        if ((!DiskAttach && !vmObj.DataDisks[0]) || (DiskAttach && vmObj.DataDisks[0])) {
          callback();
        } else {
          setTimeout(function () {
            waitForDiskOp(vmName, DiskAttach, callback);
          }, 10000);
        }
      });
    }

    function createVM(callback) {
      getImageName('Linux', function (imagename) {
        suite.execute('vm create %s %s %s %s -l %s --json', vmName, imagename, username, password, location,
          function (result) {
          result.exitStatus.should.equal(0);
          setTimeout(callback, timeout);
        });
      });
    }
    // Get name of an image of the given category
    function getImageName(category, callBack) {
      var cmd = util.format('vm image list --json').split(' ');
      suite.execute(cmd, function (result) {
        result.exitStatus.should.equal(0);
        var imageList = JSON.parse(result.text);
        imageList.some(function (image) {
          if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
            vmImgName = image.name;
            return true;
          }
        });
        callBack(vmImgName);
      });
    }

    function ListDisk(OS, callback) {
      suite.execute('vm disk list --json', function (result) {
        result.exitStatus.should.equal(0);
        var diskList = JSON.parse(result.text);
        diskList.some(function (disk) {
          if ((disk.operatingSystemType && disk.operatingSystemType.toLowerCase() === OS.toLowerCase()) &&
            (disk.location && disk.location.toLowerCase() === location.toLowerCase())) {
            diskObj = disk;
            return true;
          }
        });
        callBack(diskObj);
      });
    }
	
	function deleteUsedVM(callback) {
		  var cmd = util.format('vm delete %s -b -q --json', vmName).split(' ');		   
          setTimeout(function() {
            suite.execute(cmd, function(result) {
              result.exitStatus.should.equal(0);
              return callback();
            });
          }, timeout);
		}

  });
});