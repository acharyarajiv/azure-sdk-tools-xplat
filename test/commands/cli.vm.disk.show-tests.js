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
var sinon = require('sinon');
var util = require('util');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var isForceMocked = !process.env.NOCK_OFF;

var utils = require('../../lib/util/utils');
var CLITest = require('../framework/cli-test');

var vmPrefix = 'clitestvm';

var suite;
var testPrefix = 'cli.vm.disk.show-tests';

var currentRandom = 0;

describe('cli', function() {
  describe('vm', function() {

    before(function(done) {
      suite = new CLITest(testPrefix, [], isForceMocked);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //list and show the disk
    describe('Disk:', function() {
      it('List and Show', function(done) {
        suite.execute('vm disk list --json', function(result) {
          result.exitStatus.should.equal(0);
          var diskList = JSON.parse(result.text);
          diskList.length.should.be.above(0);
          var diskName = '';
          diskList.some(function(disk) {
            if (disk.operatingSystemType && disk.operatingSystemType.toLowerCase() === 'linux') {
              diskName = disk.name;
            }
          });

          suite.execute('vm disk show %s --json', diskName, function(result) {
            result.exitStatus.should.equal(0);
            var disk = JSON.parse(result.text);
            disk.name.should.equal(diskName);
            done();
          });
        });
      });
    });
	
	//create and delete
    describe('Disk:', function() {
      it('create and delete', function(done) {
		var diskName = suite.isMocked ? 'xplatestdisk' : suite.generateId(vmPrefix, null) + 'disk';
        getDiskName('Linux', function(diskObj) {
          diskSourcePath = diskObj.mediaLinkUri;
          var domainUrl = 'http://' + diskSourcePath.split('/')[2];
          var blobUrl = domainUrl + '/disks/' + diskName;
          suite.execute('vm disk create %s %s --location %s -u %s --json', diskName, diskSourcePath, location, blobUrl, function(result) {
            result.exitStatus.should.equal(0);
            suite.execute('vm disk show %s --json', diskName, function(result) {
              result.exitStatus.should.equal(0);
              var diskObj = JSON.parse(result.text);
              diskObj.name.should.equal(diskName);
			  setTimeout(function(){
				suite.execute('vm disk delete -b %s --json', diskName, function(result) {
				  result.exitStatus.should.equal(0);
				  setTimeout(done, timeout);
				});
			  },timeout);
            });
          });
        });
      });
	  
	  it('Upload', function(done) {
        var sourcePath = suite.isMocked ? diskSourcePath : (process.env.BLOB_SOURCE_PATH || diskSourcePath);
        var blobUrl = sourcePath.substring(0, sourcePath.lastIndexOf('/')) + '/' + suite.generateId(vmPrefix, null) + '.vhd';
        suite.execute('vm disk upload %s %s %s --json', sourcePath, blobUrl, storageAccountKey, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
	
	 // Get name of an disk of the given category
    function getDiskName(OS, callBack) {
      suite.execute('vm disk list --json', function(result) {
        result.exitStatus.should.equal(0);
        var diskList = JSON.parse(result.text);
        diskList.some(function(disk) {
          if ((disk.operatingSystemType && disk.operatingSystemType.toLowerCase() === OS.toLowerCase()) &&
            (disk.location && disk.location.toLowerCase() === location.toLowerCase())) {
            diskObj = disk;
            return true;
          }
        });
        callBack(diskObj);
      });
    }
  });
});