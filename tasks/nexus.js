var temp     = require('temp');
var download = require('./util/download');
var extract  = require('./util/extract');
var fs       = require('fs');

module.exports = function(grunt) {

  grunt.registerMultiTask('nexus', 'A plugin for downloading tarballed artifacts from a Nexus repository', function() {

    // merge task-specific and/or target-specific options with these defaults
    var options = this.options({
      unpack: true,
      extension: '.tar.gz'
    });

    // merge options onto data, with data taking precedence
    var data = this.data;
    data = grunt.util._.merge(options, data);

    // preparing inputs
    data.groupId = data.groupId.replace(/\./g, '/'); // dots to slashes
    data.baseUrl = data.baseUrl.replace(/\/?$/, ''); // remove trailing slash
    data.path = data.path.replace(/\/?$/, '');       // remove trailing slash
    if (data.extension.match(/^[^\.]/)) {            // ensure extension starts with a dot
      data.extension = '.' + data.extension;
    }
    if (data.strictSSL === undefined) {
        data.strictSSL = true;
    }

    var done = this.async();
    var anErrorOccurred = false;

    grunt.util.async.forEach(Object.keys(data.dependencies), function(dependency, callback) {

      var artifact = {
        id: dependency,
        version: data.dependencies[dependency]
      };
      var file = [artifact.id, artifact.version];
      if (data.classifier !== undefined) {
        file.push(data.classifier);
      }
      file = file.join('-') + data.extension;
      var folder = data.baseUrl + '/' + data.repository + '/' + data.groupId + '/' + artifact.id + '/' + artifact.version;
      var uri = data.baseUrl + '/' + data.repository + '/' + data.groupId + '/' + artifact.id + '/' + artifact.version + '/' + file;
      var dir = data.path + '/' + artifact.id;
      var tempPath = temp.path({prefix: 'grunt-nexus-', suffix: data.extension});

      grunt.log.ok('Downloading ' + uri);
      download(uri, tempPath, data.strictSSL)
      .then(function() {
        if (data.unpack) {
          return extract(tempPath, dir);
        } else {
          console.log('I need to move the zip file from',tempPath, 'to ', data.path + '/' + file);
          var source = fs.createReadStream(tempPath);
          var dest = fs.createWriteStream(data.path + '/' + file);
          source.pipe(dest);
          source.on('end', function() {
            grunt.log.ok('Successfully downloaded ' + file);
          });
          source.on('error', function(err) {
            grunt.log.error('Error when '+error.when+' '+artifact.id+':'+artifact.version+': '+error.message);
          });
        }
      })
      .then(function() {
        grunt.log.ok('Successfully installed '+artifact.id+':'+artifact.version);
        callback();
      }, function(error) {
        grunt.log.error('Error when '+error.when+' '+artifact.id+':'+artifact.version+': '+error.message);
        anErrorOccurred = true;
        callback();
      });

    }, function(error) {
      done(!anErrorOccurred);
    });

  });

};
