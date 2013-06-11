/**
 * Google Direction servie
 *
 * Licensed under the MIT (MIT-LICENSE.txt) licenses.
 *
 * Copyright (c) 2013
 * Leela Narasimha Reddy (leela.narsimha@gmail.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
 


function DirectionsRoute(directionsDisplay) {
  this.directionsDisplay = directionsDisplay;
	this.directionsService = new google.maps.DirectionsService();
}

DirectionsRoute.prototype.route = function(destinations, selectedMode, hwy, toll, onlyCurrent, units) {
	var unitSystem = google.maps.DirectionsUnitSystem.IMPERIAL;
	if(units == "km")
		unitSystem = google.maps.DirectionsUnitSystem.METRIC;
	for(var idx1=0; idx1<destinations.length-1; idx1+=9)
	{
		var idx2 = Math.min(idx1+9, destinations.length-1);
        var request = {
			avoidHighways: hwy,
			avoidTolls: toll,
			origin: destinations[idx1].location,
			destination: destinations[idx2].location,
			travelMode: google.maps.DirectionsTravelMode[selectedMode],
			unitSystem: unitSystem,
			waypoints: destinations.slice(idx1+1, idx2)
		};
		this.directionsService.route(request, function (response, status) {
			if (status == google.maps.DirectionsStatus.OK)
				this.directionsDisplay.parse(response, units);
		});
	}
}

markers = new Array();
function DirectionsDisplay(map, pane) {
	this.geocoder = new google.maps.Geocoder();
	this.legs = new Array();
	this.distances = new Array();
	this.overallDistance = 0;
	this.map = map;
	this.pane = pane;
}

DirectionsDisplay.prototype.parse = function (response, units) {
	var routes = response.routes;
	for(var rte in routes)
	{
		var legs = routes[rte].legs;
		this.add_leg_(routes[rte].overview_path);
		
		for(var leg in legs)
		{
			var steps = legs[leg].steps;
			this.overallDistance += legs[leg].distance.value;
			this.overallTime += legs[leg].duration.value;
		}
	}
	
	this.fit_route_();
	this.create_stepbystep_(response, units);
}

DirectionsDisplay.prototype.reset = function () {
	for(var x in this.legs) {
		this.legs[x].setMap(null);
	}
	this.legs = new Array();
	for(var x in this.distances) {
		this.distances[x].setMap(null);
	}
	this.distances = new Array();
	this.overallDistance = 0;
	this.overallTime = 0;
}
DirectionsDisplay.prototype.add_marker_ = function (location) {
	if(isString(location)) {
		this.geocoder.geocode({address: location}, function (results, status) {
			if(status == google.maps.GeocoderStatus.OK) {
				var places = [results[0].formatted_address, results[0].geometry.location];
				markers.push(new google.maps.Marker({
					position:  places[1],
					map:  this.map,
					icon:'bus_stop_minor.gif'
				}));
			}
		});
	}
	else {
		markers.push(new google.maps.Marker({
			position:  location,
			map:  this.map,
			icon:'bus_stop_minor.gif'
		}));
	}
}
function isString(val) {
	if (typeof(val) == 'string') return true;
	if (typeof(val) == 'object') {
		var criterion = arguments[0].constructor.toString().match(/string/i); 
		return (criterion != null);
	}
	return false;
}

DirectionsDisplay.prototype.add_leg_ = function (path) {
	this.legs.push(new google.maps.Polyline({
		path: path,
		map: this.map,
		strokeColor: "#0000FF",
		strokeOpacity: 0.7,
		strokeWeight: 4}));
}
DirectionsDisplay.prototype.fit_route_ = function () {
	var latlngbounds = new google.maps.LatLngBounds();
	for(var leg in this.legs) {
		path = this.legs[leg].getPath();
		for(var i = 0; i < path.length; i++)
			latlngbounds.extend(path.getAt(i));
	}

	map.fitBounds(latlngbounds);
}
DirectionsDisplay.prototype.create_stepbystep_ = function (response, units) {
	this.pane.innerHTML = "<br>Total Distance: " + this.compute_distance_(this.overallDistance, units);
	this.pane.innerHTML += "<br>Total Time: " + this.secs_to_hrmins_(this.overallTime) + "<br>";
		
	if(response.routes[0].warnings.length > 0) this.pane.innerHTML += "<br>";
	for(var i = 0; i < response.routes[0].warnings.length; i++)
		this.pane.innerHTML += "<b><i>Warning: </i></b>" + response.routes[0].warnings[i] + "<br>";;
	
	var htmlText = "<table id='tableDirections'>";

	var routes = response.routes;
	for(var rte in routes) {
		var legs = routes[rte].legs;
		for(var leg = 0; leg < legs.length; leg++) {
			var steps = legs[leg].steps;
			var letter1 = String.fromCharCode(65 + leg);
			var letter2 = String.fromCharCode(65 + leg+1);
			htmlText += "<br>";
			htmlText += "<tr><th colspan=2><hr></th></tr>";
			htmlText += "<tr><th colspan=2 align='center'><u>Directions from " + letter1 + " to " + letter2 + "</u></th></tr>";
			var totalDist = 0;
			var totalDur = 0;
			for(var x = 0; x < steps.length; x++) {
				htmlText += "<tr id = 'step" + x + "'>";
				htmlText += "<td valign='top'><b>" + (x+1) + " </b></td>";
				htmlText += "<td>" + steps[x].instructions + "</td>";
				htmlText += "</tr>";
				htmlText += "<tr id='time" + x + "'>";
				htmlText += "<td> &nbsp;</td>"
				htmlText += "<td align='left'><i>Duration: " + steps[x].distance.text + ", " + steps[x].duration.text + "</i></td>";
				htmlText += "</tr>";
				totalDist += steps[x].distance.value;
				totalDur += steps[x].duration.value;
			}
			htmlText += "<tr><th colspan=2 align='left'>\Leg Distance: " + this.compute_distance_(totalDist, units) + "</th></tr>";
			htmlText += "<tr><th colspan=2 align='left'>\Leg Duration: " + this.secs_to_hrmins_(totalDur) + "</th></tr>";
		}
	}
	this.pane.innerHTML += htmlText + "</table><br>" + response.routes[0].copyrights;
}

DirectionsDisplay.prototype.compute_distance_ = function (distance, units) {
	if(units == "km")
		return Math.round((this.overallDistance/1000)*100)/100 + " km"
	else
		return Math.round(this.overallDistance*0.000621371192*100)/100 + " mi";
}

DirectionsDisplay.prototype.secs_to_hrmins_ = function (time) {
	var hrs = Math.floor(time/3600);
	var mins = Math.round(time/60 - hrs*60);
	if(hrs > 0 && mins > 0)
		return hrs + " hours " + mins + " minutes";
	else if(mins > 0)
		return mins + " minutes";
	else if(hrs > 0)
		return hrs + " hours";
	else
		return "0 minutes";
}
