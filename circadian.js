module.exports = function(RED) {

	"use strict";
	var suncalc = require('suncalc');

	function circadianLocation(n) {
		RED.nodes.createNode(this,n);
		this.name = n.name;
		this.lat = n.lat;
		this.lon = n.lon;
	}

	RED.nodes.registerType("Circadian Location", circadianLocation);

	function circadianLight(n) {
		RED.nodes.createNode(this,n);
		this.location = RED.nodes.getNode(n.location)
		this.minbr = n.minbr;
		this.maxbr = n.maxbr;
		this.minct = n.minct;
		this.maxct = n.maxct;
		this.period = n.period;
		this.name = n.name;
		this.topic = n.topic;

		var node = this;

		var lat = node.location.lat;
		var lon = node.location.lon;

		function calcColourTemp() {

			var date = new Date()
			var now = date.getTime();
			var day = 24*60*60*1000;

			var today = suncalc.getTimes(now, lat, lon);
			var today_sunrise = Date.parse(today.sunrise);
			var today_sunset = Date.parse(today.sunset);
			var today_noon = Date.parse(today.solarNoon);
			var today_midnight = Date.parse(today.nadir);

			var x1, y1, x2, y2, x3, y3;

			if (now < today_sunrise) {
					var yesterday = suncalc.getTimes(new Date().setDate(date.getDate() - 1), lat, lon);
					var yesterday_sunrise = Date.parse(yesterday.sunrise);
					var yesterday_sunset = Date.parse(yesterday.sunset);
					var yesterday_midnight = Date.parse(yesterday.nadir);
					x1 = yesterday_sunset
					y1 = 0
					x2 = (today_midnight > yesterday_sunset && today_midnight < today_sunrise) ? today_midnight : yesterday_midnight
					y2 = -100
					x3 = today_sunrise
					y3 = 0
			} else if (now > today_sunset) {
					var tomorrow = suncalc.getTimes(new Date().setDate(date.getDate() + 1), lat, lon);
					var tomorrow_sunrise = Date.parse(tomorrow.sunrise);
					var tomorrow_sunset = Date.parse(tomorrow.sunset);
					var tomorrow_midnight = Date.parse(tomorrow.nadir);
					x1 = today_sunset
					y1 = 0
					x2 = (today_midnight > today_sunset && today_midnight < tomorrow_sunrise) ? today_midnight : tomorrow_midnight
					y2 = -100
					x3 = tomorrow_sunrise
					y3 = 0
			} else {
					x1 = today_sunrise
					y1 = 0
					x2 = today_noon
					y2 = 100
					x3 = today_sunset
					y3 = 0
			}

			var a1 = -Math.pow(x1,2) + Math.pow(x2,2)
			var b1 = -x1 + x2
			var d1 = -y1 + y2
			var a2 = -Math.pow(x2,2) + Math.pow(x3,2)
			var b2 = -x2 + x3
			var d2 = -y2 + y3
			var bm = -(b2 / b1)
			var a3 = bm * a1 + a2
			var d3 = bm * d1 + d2
			var a = d3 / a3
			var b = (d1 - a1 * a) / b1
			var c = y1 - a * Math.pow(x1,2) - b * x1
			var percent = a * Math.pow(now,2) + b * now + c

			var temp = percent > 0 ? ((node.maxct - node.minct) * percent/100) + node.minct : node.minct;
			var brightness = percent > 0 ? node.maxbr : ((node.maxbr - node.minbr) * ((100+percent) / 100)) + node.minbr;

			node.send({
				topic: node.topic,
				payload: {
					percent: percent | 0,
					temp: temp | 0,
					brightness: brightness | 0
				}
			});
		};

		this.interval = setInterval(calcColourTemp,(node.period * 60 * 1000));

		calcColourTemp();

		node.on('close', function() {
			clearInterval(node.interval);
		});
	};

	RED.nodes.registerType("Circadian Light", circadianLight);
}