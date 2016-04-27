'use strict';

// TODO (john@): IIFE should be generated by build, not brute-forced
(function (window, document, d3, jQuery, Promise, moment) {
  var should = window.should = { };
  var speedCsvUrl = should.speedCsvUrl =
    //'/DemoDataSeries.csv';
    '//should-i-go.github.io/should-i-go-sandbox/DemoDataSeries.csv';

  var segmentLatLongCsvUrl = should.segmentLatLongCsvUrl =
    //'/Segment-Lat-Long.csv';
    '//should-i-go.github.io/should-i-go/Segment-Lat-Long.csv';

  jQuery(document).ready(function() {
    var selectedDate = should.selectedDate = "2014-12-04";
    var selectedGameType = should.selectedGameType = "";

    var speedCsvPromise = jQuery.when(jQuery.ajax(speedCsvUrl));

    var speedFinalPromise = speedCsvPromise.then(function loadCsv(content) {

      should.speedCsv = content;
      console.log('Loaded speed CSV data');

      return should.speedCsv;

    }).then(function parseCsv(speedCsv) {

      var speedCsvRows = should.speedCsvRows = d3.csv.parse(speedCsv);
      console.log('Loaded speed CSV rows', speedCsvRows.length);

      return speedCsvRows;

    });

    var segmentLatLongCsvPromise = jQuery.when(jQuery.ajax(
      segmentLatLongCsvUrl
    ));

    var indexPromise = segmentLatLongCsvPromise.then(function loadCsv(content) {

      should.segmentLatLongCsv = content;
      console.log('Loaded segment lat long CSV data');

      return should.segmentLatLongCsv;

    }).then(function parseCsv(segmentLatLongCsv) {

      var segmentLatLongCsvRows = 
        should.segmentLatLongCsvRows = 
          d3.csv.parse(segmentLatLongCsv);

      console.log('Loaded segment lat long CSV rows', 
        segmentLatLongCsvRows.length);

      return segmentLatLongCsvRows;

    }).then(function buildLatLongBySegmentIndex(segmentLatLongCsvRows) {

      var latLongBySegmentIndex = should.latLongBySegmentIndex = [ ];

      segmentLatLongCsvRows.map(function addRowToIndex(row) {
        var segmentId = row.SEGMENTID;
        var startLat = row[" START_LATITUDE"];
        var endLat = row[" END_LATITUDE"];
        var startLong = row.START_LONGITUDE;
        var endLong = row.END_LONGITUDE;

        latLongBySegmentIndex[segmentId] = {
          startLat: parseFloat(startLat),
          endLat: parseFloat(endLat),
          startLong: parseFloat(startLong),
          endLong: parseFloat(endLong)
        }
      });

      console.log('Built lat long by segment index', 
        latLongBySegmentIndex.length);


      return latLongBySegmentIndex;
    });

    Promise
      .all([speedFinalPromise, indexPromise])
      .then(function (data) {
        var speed = data[0];
        var index = data[1];

        console.log("resolved all", speed, index);

        function setMapHeight() {
          var demoSectionHeight = $('#section-demo').height();
          var demoH1Height = $('#demo-h1').height();
          var demoControlsHeight = $('#demo-controls').height();
          var navHeight = $('#nav').height();

          var mapHeight = demoSectionHeight 
            - demoH1Height 
            - demoControlsHeight
            - navHeight;
          console.log('Setting map height to ', mapHeight);

          $('#map').height(mapHeight);
        }

        setMapHeight();
        //$("#map").height(500).width(800);

        var map = L.map('map', {
            scrollWheelZoom : false,
            center: [41.8369, -87.6847],
            zoom: 12
        });

        var tiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        var heat = null;

        function render(renderDate, gameType) {
          console.log("Rendering renderDate and gameType",
            renderDate, gameType);

          var speedRows = speed.filter(function (row, index) {
            if (index < 10) {
              console.log("Filtering ", 
                row.DATE, renderDate, row.GameType, gameType);
            }
            return (renderDate == row.DATE) 
              && (gameType == row.GameType)
          });

          var selectedSegments = speedRows.map(function(row) {
            return index[row.SEGMENTID];
          });

          var selectedSpeeds = speedRows.map(function (row) {
            return parseFloat(row.SPEED);
          });


          var samples = [ ];

          speedRows.map(function (row, index) {
            var rowSegment = selectedSegments[index];
            var rowSpeed = selectedSpeeds[index];
            var sampleLat = ( rowSegment.startLat + rowSegment.endLat ) / 2;
            var sampleLong = ( rowSegment.startLong + rowSegment.endLong ) / 2;

            if (index < 10) {
              console.log(sampleLat, sampleLong, rowSpeed);
            }

            for (var i = 35 ; (i > rowSpeed) && (i > 0) ; i--) {
              samples.push([ sampleLat, sampleLong ]);
            }
          }); 



          console.log('render: selected rows', 
            speedRows, selectedSegments, selectedSpeeds, samples);


          if (heat) {
            map.removeLayer(heat);
          }
          heat = L.heatLayer(samples).addTo(map);
          var draw = false;
        }

        console.log('yo');

        var availableDates = [
          '2014-12-04',
          '2014-12-25',
          '2014-12-27'
        ];

        var prettyPrintDates = {
          '2014-12-04': 'Dec 4, 2014',
          '2014-12-25': 'Dec 25, 2014',
          '2014-12-27': 'Dec 27, 2015'
        }

        var bearsGames = [
          '2014-12-04'
        ];

        var bullsGames = [
          '2014-12-25',
          '2014-12-27'
        ];

        for (var i = 0; i < availableDates.length; i++) {
          
          var clickHandler = (function(handleDate) {
            var _handleDate = handleDate;

            return function() {
              console.log("Handling click on", _handleDate);
              jQuery('#selectedDate').text(prettyPrintDates[_handleDate]);

              console.log("new date selection", _handleDate);

              selectedDate = should.selectedDate = _handleDate;

              render(selectedDate, selectedGameType);
            }

          })(availableDates[i]);
          console.log('Attaching click handler to ', 
            '#date-' + availableDates[i], clickHandler);

          
          jQuery('#date-' + availableDates[i]).click(clickHandler);
        }

        jQuery('input[name="demoDate"]').daterangepicker({
            singleDatePicker: true,
            showDropdowns: true
        }, function (start, end, label) {
          var newDate = moment(start).format("YYYY-MM-DD");

          console.log("new date selection", newDate);

          selectedDate = should.selectedDate = newDate;

          render(selectedDate, selectedGameType);

        });

        jQuery('#noGame').click(function () {

          selectedGameType = should.selectedGameType = "";

          jQuery('#selectedGame').text('No Game - Average');

          console.log("No game selection", selectedGameType);

          render(selectedDate, selectedGameType);

        });

        jQuery('#bullsGame').click(function () {

          selectedGameType = should.selectedGameType = "Bulls";

          jQuery('#selectedGame').text('Bulls Game - Average');

          console.log("Bulls game selection", selectedGameType);

          render(selectedDate, selectedGameType);

        });

        jQuery('#bearsGame').click(function () {

          selectedGameType = should.selectedGameType = "Bears";

          jQuery('#selectedGame').text('Bears Game - Average');

          console.log("Bears game selection", selectedGameType);

          render(selectedDate, selectedGameType);

        });

        render(selectedDate, selectedGameType);
      });

    


    

  });

})(window, document, d3, jQuery, Promise, moment);