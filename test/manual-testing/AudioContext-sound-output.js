if (require.main === module) { // Just to avoid mocha running this
  var fs = require('fs')
    , AudioContext = require('../../build/AudioContext')
    , context = new AudioContext
    , Speaker = require('speaker')




  function getPeaks (buffer, length, splitChannels) {
    var sampleSize = buffer.length / length;
    var sampleStep = ~~(sampleSize / 10) || 1;
    var channels = buffer.numberOfChannels;
    var splitPeaks = [];
    var mergedPeaks = [];

    for (var c = 0; c < channels; c++) {
      var peaks = splitPeaks[c] = [];
      var chan = buffer.getChannelData(c);

      for (var i = 0; i < length; i++) {
        var start = ~~(i * sampleSize);
        var end = ~~(start + sampleSize);
        var min = chan[0];
        var max = chan[0];

        for (var j = start; j < end; j += sampleStep) {
          var value = chan[j];

          if (value > max) {
            max = value;
          }

          if (value < min) {
            min = value;
          }
        }

        peaks[2 * i] = max;
        peaks[2 * i + 1] = min;

        if (c == 0 || max > mergedPeaks[2 * i]) {
          mergedPeaks[2 * i] = max;
        }

        if (c == 0 || min < mergedPeaks[2 * i + 1]) {
          mergedPeaks[2 * i + 1] = min;
        }
      }
    }

    return {
        peaks :  splitChannels === true ? splitPeaks : mergedPeaks,
        min   : min,
        max   : max
    };


  };



    function getRegions (audioBuffer) {
        var peaks = [];
        var min,  max;
        var channels = audioBuffer.data;
        var channel_1 = audioBuffer.getChannelData(0);

        for (var c = 0; c < audioBuffer.numberOfChannels; c++) {
            var chan = buffer.getChannelData(c);
            for( var i = 0; i < chan.length; i++  ) {
                var value = Math.abs(chan[i]);
                max = Math.max(value, max);
                min = Math.max(value, min);
            }
        }




        for (var c = 0; c < channels; c++) {
            var chan = buffer.getChannelData(c);

            for (var i = 0; i < length; i++) {
                var start = ~~(i * sampleSize);
                var end = ~~(start + sampleSize);
                var min = chan[0];
                var max = chan[0];

                for (var j = start; j < end; j += sampleStep) {
                    var value = chan[j];

                    if (value > max) {
                        max = value;
                    }

                    if (value < min) {
                        min = value;
                    }
                }

                peaks[2 * i] = max;
                peaks[2 * i + 1] = min;

                if (c == 0 || max > mergedPeaks[2 * i]) {
                    mergedPeaks[2 * i] = max;
                }

                if (c == 0 || min < mergedPeaks[2 * i + 1]) {
                    mergedPeaks[2 * i + 1] = min;
                }
            }
        }

        return {
            peaks :  splitChannels === true ? splitPeaks : mergedPeaks,
            min   : min,
            max   : max
        };


    };



    function extractRegions  (Peaks, duration, min_percentage, minDuration ) {
        // Silence params

        min_percentage = min_percentage || 15;
        var minSeconds = minDuration    || 0.25; // seconds

        var minValue = Peaks.min + ((Peaks.max - Peaks.min) * min_percentage / 100 );

        var length = Peaks.peaks.length;
        var coef = duration / length;
        var minLen = minSeconds / coef;

        // Gather silence indeces
        var silences = [];
        Array.prototype.forEach.call(Peaks.peaks, function (val, index) {
            if (val < minValue) {
                silences.push(index);
            }
        });

        // Cluster silence values
        var clusters = [];
        silences.forEach(function (val, index) {
            if (clusters.length && val == silences[index - 1] + 1) {
                clusters[clusters.length - 1].push(val);
            } else {
                clusters.push([ val ]);
            }
        });

        // Filter silence clusters by minimum length
        var fClusters = clusters.filter(function (cluster) {
            return cluster.length >= minLen;
        });

        // Create regions on the edges of silences
        var regions = fClusters.map(function (cluster, index) {
            var next = fClusters[index + 1];
            return {
                start: cluster[cluster.length - 1],
                end: (next ? next[0] : length - 1)
            };
        });

        // Add an initial region if the audio doesn't start with silence
        var firstCluster = fClusters[0];
        if (firstCluster && firstCluster[0] != 0) {
            regions.unshift({
                start: 0,
                end: firstCluster[firstCluster.length - 1]
            });
        }

        // Filter regions by minimum length
        var fRegions = regions.filter(function (reg) {
            return reg.end - reg.start >= minLen;
        });

        // Return time-based regions
        return fRegions.map(function (reg) {
            return {
                start: Math.round(reg.start * coef * 10) / 10,
                end: Math.round(reg.end * coef * 10) / 10
            };
        });
  }




  //  'http://www.archive.org/download/mshortworks_001_1202_librivox/msw001_03_rashomon_akutagawa_mt_64kb.mp3'

  // fs.readFile(__dirname + '/sounds/powerpad.wav', function(err, buffer) {
    fs.readFile(__dirname + '/sounds/001z.mp3', function(err, buffer) {
//  fs.readFile(__dirname + '/sounds/msw001_03_rashomon_akutagawa_mt_64kb.mp3', function(err, buffer) {
    if (err) throw err;
    context.decodeAudioData(buffer, function(audioBuffer, format) {

        context.format.numberOfChannels = audioBuffer.numberOfChannels;
        context.format.sampleRate = audioBuffer.sampleRate;

        context.outStream = new Speaker({
                channels:  audioBuffer.numberOfChannels,
                bitDepth:  context.format.bitDepth,
                sampleRate: audioBuffer.sampleRate
        });

        console.log('encoding format : '
            + audioBuffer.numberOfChannels + ' channels ; '
            + context.format.bitDepth + ' bits ; '
            + audioBuffer.sampleRate + ' Hz'
        )


      var bufferNode = context.createBufferSource()
      bufferNode.connect(context.destination)
      bufferNode.buffer = audioBuffer
      bufferNode.loop = true;

      var peeks = getPeaks( audioBuffer, 1024 );
      var regions = extractRegions( audioBuffer );
      bufferNode.start(0)
    })
  })
}