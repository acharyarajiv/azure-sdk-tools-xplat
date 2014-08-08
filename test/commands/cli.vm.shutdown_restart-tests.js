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

// A common VM used by multiple tests

var vmPrefix = 'clitestvm';
var vmNames = [];

var suite;
var testPrefix = 'cli.vm.shutdown_restart-tests';
var requiredEnvironment = [{
		name : 'AZURE_VM_TEST_LOCATION',
		defaultValue : 'West US'
	}
];

var currentRandom = 0;

describe('cli', function () {
	describe('vm', function () {
		var vmName,
		location,
		username = 'azureuser',
		password = 'Collabera@01'

			before(function (done) {
				suite = new CLITest(testPrefix, requiredEnvironment);
				suite.setupSuite(done);
			});

		 after(function(done) {
          suite.teardownSuite(done);
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
			setTimeout(function () {
				suite.teardownTest(done);
			}, timeout);
		});

		describe('Vm:', function () {
			it('Shutdown and start', function (done) {
				createVM(function () {
					suite.execute('vm shutdown %s --json', vmName, function (result) {
						result.exitStatus.should.equal(0);
						setTimeout(function () {
							suite.execute('vm start %s --json', vmName, function (result) {
								result.exitStatus.should.equal(0);
								done();
							});
						}, timeout);
					});
				});
			});

			// VM Restart
			it('Restart', function (done) {
				suite.execute('vm restart  %s --json', vmName, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			
			// VM Delete
			it('Delete', function (done) {
				suite.execute('vm delete %s -b -q --json', vmName, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
		});

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
	});
});
