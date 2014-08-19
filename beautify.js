/**
 * https://github.com/beautify-web/js-beautify
 * CLI Options:
  -f, --file       Input file(s) (Pass '-' for stdin)
  -r, --replace    Write output in-place, replacing input
  -o, --outfile    Write output to file (default stdout)
  --config         Path to config file
  --type           [js|css|html] ["js"]
  -q, --quiet      Suppress logging to stdout
  -h, --help       Show this help
  -v, --version    Show the version

 * Beautifier Options:
  -s, --indent-size             Indentation size [4]
  -c, --indent-char             Indentation character [" "]
  -l, --indent-level            Initial indentation level [0]
  -t, --indent-with-tabs        Indent with tabs, overrides -s and -c
  -p, --preserve-newlines       Preserve line-breaks (--no-preserve-newlines disables)
  -m, --max-preserve-newlines   Number of line-breaks to be preserved in one chunk [10]
  -P, --space-in-paren          Add padding spaces within paren, ie. f( a, b )
  -j, --jslint-happy            Enable jslint-stricter mode
  -b, --brace-style             [collapse|expand|end-expand] ["collapse"]
  -B, --break-chained-methods   Break chained method calls across subsequent lines
  -k, --keep-array-indentation  Preserve array indentation
  -x, --unescape-strings        Decode printable characters encoded in xNN notation
  -w, --wrap-line-length        Wrap lines at next opportunity after N characters [0]
  -X, --e4x                     Pass E4X xml literals through untouched
  --good-stuff                  Warm the cockles of Crockford's heart
 *
*/

var fs = require('fs'),
  EventEmitter = require('events').EventEmitter,
  cliFiles = new EventEmitter(),
  exec = require('child_process').exec,
  myfiles = [],
  filePath = 'test/commands',
  cmd = 'js-beautify -r -s 2 ';

// this event will be called when all files have been added to myfiles
cliFiles.on('files_ready', function() {
  console.log('Total files are: ' + myfiles.length);
  console.log('Linting files now');
  startBeautify();
});

function startBeautify() {
  (myfiles.length != 0) ? jsbeautify(myfiles.shift()) : process.exit();
}

function jsbeautify(file) {
  exec(cmd + file, function(error, stdout, stderr) {
    var result = (stderr == '') ? stdout : stderr; //'{"stdout":' + stdout + ' \n,"stderr":"' + stderr + '" \n,"cmd":"' + cmd + '\n"}';
    console.dir(result);
    startBeautify();
  });
}
// read all files from current directory
fs.readdir(filePath, function(err, files) {
  if (err) throw err;
  files.forEach(function(file) {
    //filter only vm files
    file.indexOf('cli.vm.') + 1 && myfiles.push(filePath + '/' + file);
  });
  cliFiles.emit('files_ready'); // trigger files_ready event
});
