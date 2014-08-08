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
var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.vm.list_show-tests';

describe('cli', function () {
  describe('vm', function () {
    var vmName;

    before(function (done) {
      suite = new CLITest(testPrefix, []);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('Vm', function () {

      //location list
      it('Location List', function (done) {
        suite.execute('vm location list --json', function (result) {
          result.exitStatus.should.equal(0);
          result.text.should.not.empty;
          done();
        });
      });

      it('List and Show', function (done) {
        suite.execute('vm list --json', function (result) {
          result.exitStatus.should.equal(0);
          var vmList = JSON.parse(result.text);
          vmList.length.should.be.above(0);
          vmName = vmList[0].VMName;
          suite.execute('vm show %s --json', vmName, function (result) {
            result.exitStatus.should.equal(0);
            var vmObj = JSON.parse(result.text);
            vmObj.VMName.should.equal(vmName);
            done();
          });
        });
      });
    });
  });
});