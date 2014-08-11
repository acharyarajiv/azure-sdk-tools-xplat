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
var testPrefix = 'cli.vm.create_staticvm-tests';
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

		after(function (done) {
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

		//create a vm with static-ip set
		describe('Create a VM with static ip address:', function () {
			it('Create a VM with static ip address', function (done) {
				getImageName('Windows', function (ImageName) {
					getVnet('Created', function (virtualnetName, affinityName, staticIpToCreate, staticIpToSet) {
						suite.execute('vm create --virtual-network-name %s -n %s --affinity-group %s %s %s %s %s --static-ip %s --json',
							virtualnetName, vmName, affinityName, vmName, ImageName, username, password, staticIpToCreate, function (result) {
							result.exitStatus.should.equal(0);
							done();
						});
					});
				});
			});
		});

		// VM Restart
		describe('Restart and check:', function () {
			it('Restart', function (done) {
				suite.execute('vm restart  %s --json', vmName, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});

			it('Show the description of the vm with set static ip', function (done) {
				getVnet('Created', function (virtualnetName, affinityName, staticipToCreate, staticipToSet) {
					suite.execute('vm static-ip show %s --json', vmName,
						function (result) {
						result.exitStatus.should.equal(0);
						var vnets = JSON.parse(result.text);
						vnets.Network.StaticIP.should.equal(staticipToCreate);
						done();
					});
				});
			});
		});

		describe('static ip operations', function () {
			it('Setting the static ip address to the created VM', function (done) {
				getVnet('Created', function (virtualnetName, affinityName, staticipToCreate, staticipToSet) {
					suite.execute('vm static-ip set %s %s --json', vmName, staticipToSet,
						function (result) {
						result.exitStatus.should.equal(0);
						suite.execute('vm show %s --json', vmName, function (innerresult) {
							innerresult.exitStatus.should.equal(0);
							var vmshow = JSON.parse(innerresult.text);
							vmshow.IPAddress.should.equal(staticipToSet);
							done();
						});
					});
				});
			});

			it('Check if the static ip address set is available', function (done) {
				getVnet('Created', function (virtualnetName, affinityName, staticipToCreate, staticipToSet) {
					suite.execute('network vnet static-ip check %s %s --json', virtualnetName, staticipToSet,
						function (result) {
						result.exitStatus.should.equal(0);
						var vnets = JSON.parse(result.text);
						vnets.isAvailable.should.equal(false);
						done();
					});
				});
			});

			it('Show the description of the vm with set static ip', function (done) {
				getVnet('Created', function (virtualnetName, affinityName, staticipToCreate, staticipToSet) {
					suite.execute('vm static-ip show %s --json', vmName,
						function (result) {
						result.exitStatus.should.equal(0);
						var vnets = JSON.parse(result.text);
						vnets.Network.StaticIP.should.equal(staticipToSet);
						done();
					});
				});
			});

			it('Removing the static ip address', function (done) {
				suite.execute('vm static-ip remove %s --json', vmName,
					function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
		});

		describe('negative testcase', function () {
			it('Setting the invalid static ip address', function (done) {
				suite.execute('vm static-ip set clitestvm2745 ip --json', vmName,
					function (result) {
					result.exitStatus.should.equal(1);
					result.errorText.should.include('The IP address ip is invalid');
					done();
				});
			});

			it('Setting the invalid vm name', function (done) {
				getVnet('Created', function (virtualnetName, affinityName, staticipToCreate, staticipToSet) {
					suite.execute('vm static-ip set abcd %s --json', staticipToSet,
						function (result) {
						result.exitStatus.should.equal(1);
						result.errorText.should.include('No VMs found');
						done();
					});
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

		//get name of a vnet
		function getVnet(status, callback) {
			var cmd;
			if (getVnet.vnetName) {
				callback(getVnet.vnetName, getVnet.affinityName, getVnet.staticIpToCreate, getVnet.staticIpToSet);
			} else {
				cmd = util.format('network vnet list --json').split(' ');
				suite.execute(cmd, function (result) {
					result.exitStatus.should.equal(0);
					var vnetName = JSON.parse(result.text);
					var found = vnetName.some(function (vnet) {
							if (vnet.state == status) {
								getVnet.vnetName = vnet.name;
								getVnet.affinityName = vnet.affinityGroup;
								var address = vnet.addressSpace.addressPrefixes[0];
								var addressSplit = address.split('/');
								var staticIpToCreate = addressSplit[0];
								var n = staticIpToCreate.substring(0, staticIpToCreate.lastIndexOf('.') + 1);
								var staticIpToSet = n.concat(addressSplit[1]);
								getVnet.staticIpToCreate = staticIpToCreate;
								getVnet.staticIpToSet = staticIpToSet;
								return true;
							}
						});

					if (!found) {
						getAffinityGroup(location, function (affinGrpName) {
							cmd = util.format('network vnet create %s -a %s --json', vnetName, affinGrpName).split(' ');
							suite.execute(cmd, function (result) {
								result.exitStatus.should.equal(0);
								getVnet.vnetName = vnetName;
								getVnet.affinityName = affinGrpName;
								var address = vnet.addressSpace.addressPrefixes[0];
								var addressSplit = address.split('/');
								var staticIpToCreate = addressSplit[0];
								var n = staticIpToCreate.substring(0, staticIpToCreate.lastIndexOf('.') + 1);
								var staticIpToSet = n.concat(addressSplit[1]);
								getVnet.staticIpToCreate = staticIpToCreate;
								getVnet.staticIpToSet = staticIpToSet;
								callback(getVnet.vnetName, getVnet.affinityName, getVnet.staticIpToCreate, getVnet.staticIpToSet);
							});
						});
					} else {
						callback(getVnet.vnetName, getVnet.affinityName, getVnet.staticIpToCreate, getVnet.staticIpToSet);
					}
				});
			}
		}

		// Get name of an image of the given category
		function getAffinityGroup(location, callBack) {
			if (getAffinityGroup.affinGrpName) {
				callBack(getAffinityGroup.affinGrpName);
			} else {
				suite.execute('account affinity-group list --json', function (result) {
					result.exitStatus.should.equal(0);
					var affinList = JSON.parse(result.text);
					var found = affinList.some(function (affinGrp) {
							if (affinGrp.location == location) {
								getAffinityGroup.affinGrpName = affinGrp.name;
								return true;
							}
						});
					if (!found) {
						suite.execute('account affinity-group create -l %s -e %s -d %s %s --json',
							location, affinLabel, affinDesc, affinityName, function (result) {
							result.exitStatus.should.equal(0);
							getAffinityGroup.affinGrpName = affinityName;
							callBack(affinityName);
						});
					} else
						callBack(getAffinityGroup.affinGrpName);
				});
			}
		}
	});
});
