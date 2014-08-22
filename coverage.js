/**
 * https://github.com/gotwarlost/istanbul
 * check-coverage
              checks overall coverage against thresholds from coverage JSON
              files. Exits 1 if thresholds are not met, 0 otherwise


      cover   transparently adds coverage information to a node command. Saves
              coverage.json and reports at the end of execution


      help    shows help


      instrument
              instruments a file or a directory tree and writes the
              instrumented code to the desired output location


      report  writes reports for coverage JSON objects produced in a previous
              run


      test    cover a node command only when npm_config_coverage is set. Use in
              an `npm test` script for conditional coverage
 *
*/
var fs = require('fs'),
  EventEmitter = require('events').EventEmitter,
  cliFiles = new EventEmitter(),
  exec = require('child_process').exec,
  totalFiles = 0,
  args = [],
  filePath = 'test/testlist.txt',
  cmd = 'istanbul cover node_modules/mocha/bin/_mocha ';

// this event will be called when all files have been added to myfiles
cliFiles.on('files_ready', function() {
  console.log('Total files are: ' + totalFiles);
  console.log('Getting coverage now');
  startCoverage();
});

function startCoverage() {
  args.push('--'); 
  args.push('--ui');
  args.push('tdd');
  args.push('-R');
  args.push('spec');
  args.push('-t');
  args.push(50000000);
  coverage();
}

function coverage() {
  exec(cmd, args, function(error, stdout, stderr) {
    //var result = (stderr == '') ? stdout : stderr; //'{"stdout":' + stdout + ' \n,"stderr":"' + stderr + '" \n,"cmd":"' + cmd + '\n"}';
    console.dir('done');
	process.exit();
  });
}

// read all files from current directory
fs.readFile(filePath, function(err, files) {
  if (err) throw err;
  files.toString().split('\n').forEach(function (file) {
	//filter only vm files
	if (file.length > 0 && file.trim()[0] !== '#' && file.indexOf('cli.vm.') + 1) {
      // trim trailing \r if it exists
	  cmd += 'test/' + file.replace('\r', ' ');
	  totalFiles++;    
    }
  });
  cliFiles.emit('files_ready'); // trigger files_ready event
});
