module.exports = function(RED) {

	"use strict";
	var suncalc = require('suncalc');

	function circadianLocation(n) {
		RED.nodes.createNode(this,n);
		this.name = n.name;
		this.lat = n.lat;
		this.lon = n.lon;
		this.period = n.period;

		var node = this;

		function getPercent() {
			const date = new Date()
			const now = date.getTime();
			const day = 24*60*60*1000;

			const today = suncalc.getTimes(now, node.lat, node.lon);
			const today_sunrise = Date.parse(today.sunrise);
			const today_sunset = Date.parse(today.sunset);
			const today_noon = Date.parse(today.solarNoon);
			const today_midnight = Date.parse(today.nadir);

			var x1, y1, x2, y2, x3, y3;

			if (now < today_sunrise) {
				const yesterday = suncalc.getTimes(new Date().setDate(date.getDate() - 1), node.lat, node.lon);
				const yesterday_sunrise = Date.parse(yesterday.sunrise);
				const yesterday_sunset = Date.parse(yesterday.sunset);
				const yesterday_midnight = Date.parse(yesterday.nadir);
				x1 = yesterday_sunset
				y1 = 0
				x2 = (today_midnight > yesterday_sunset && today_midnight < today_sunrise) ? today_midnight : yesterday_midnight
				y2 = -100
				x3 = today_sunrise
				y3 = 0
			} else if (now > today_sunset) {
				const tomorrow = suncalc.getTimes(new Date().setDate(date.getDate() + 1), node.lat, node.lon);
				const tomorrow_sunrise = Date.parse(tomorrow.sunrise);
				const tomorrow_sunset = Date.parse(tomorrow.sunset);
				const tomorrow_midnight = Date.parse(tomorrow.nadir);
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

			const a1 = -Math.pow(x1,2) + Math.pow(x2,2)
			const b1 = -x1 + x2
			const d1 = -y1 + y2
			const a2 = -Math.pow(x2,2) + Math.pow(x3,2)
			const b2 = -x2 + x3
			const d2 = -y2 + y3
			const bm = -(b2 / b1)
			const a3 = bm * a1 + a2
			const d3 = bm * d1 + d2
			const a = d3 / a3
			const b = (d1 - a1 * a) / b1
			const c = y1 - a * Math.pow(x1,2) - b * x1
			node.percent = a * Math.pow(now,2) + b * now + c
		};

		this.interval = setInterval(getPercent,(node.period * 60 * 1000));
		getPercent();

		node.on('close', function() {
			clearInterval(this.interval);
		});
	}

	RED.nodes.registerType("location", circadianLocation);

	function circadianLight(n) {
		RED.nodes.createNode(this,n);
		this.location = RED.nodes.getNode(n.location)
		this.minbr = n.minbr;
		this.maxbr = n.maxbr;
		this.minct = n.minct;
		this.maxct = n.maxct;
		this.name = n.name;
		this.topic = n.topic;

		var node = this;

		function calcColourTemp() {
			const percent = node.location.percent
			const ct = percent > 0 ? ((node.maxct - node.minct) * percent/100) + node.minct : node.minct;
			const bright = percent > 0 ? node.maxbr : ((node.maxbr - node.minbr) * ((100+percent) / 100)) + node.minbr;

			node.send({
				topic: node.topic,
				payload: {
					percent: percent | 0,
					ct: ct | 0,
					bright: bright | 0
				}
			});
		};

		calcColourTemp();

		node.on('input', function() {
			calcColourTemp();
		});

	};

	RED.nodes.registerType("lighting", circadianLight);
}
