const CHART_ID = '#chartContainer';
const HIDE_BUTTON_ID = '#hideButton';
const SHOW_BUTTON_ID = '#showButton';
const CHANGE_CHART_BUTTON_ID = '#changeChart';

const availableMonths = ['Jan ', 'Feb ', 'Mar ', 'Apr ', 'May ', 'Jun ', 'Jul ', 'Aug ', 'Sep ', 'Oct ', 'Nov ', 'Dec '];
//example format for args: 10 (for October), 2018, [4,22,19,102,5]
//startMonth MUST be between 1 - 12 (inclusive)
//data MUST be an array
function displayChart(startMonth, startYear, dataSet, dataLabel) {
	console.log('displaying');
	
	//keep start month in bounds
	if(startMonth < 1)
		startMonth = 1;
	else if(startMonth > 12)
		startMonth = 12;
	
	var month = startMonth - 1;
	var year = startYear;
	
	var domainEntries = [];
	
	for(var i = 0; i < dataSet.length; i++) {
		if(month >= 12) {
			month = 0; 
			year++;
		}
		
		var entry = availableMonths[month] + year.toString();
		domainEntries.push(entry);
		
		month++;
	}
	
	if(barChartData != undefined) {
		console.log('bar chart exists');
		console.log(barChartData);
		if(barChartData.datasets.length > 0) {
			console.log('you guessed it');
		}
	}
	
	var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	var color = Chart.helpers.color;
	barChartData = {
		labels: domainEntries,
		datasets: [{
			label: dataLabel,
			backgroundColor: color(window.chartColors.red).alpha(0.5).rgbString(),
			borderColor: window.chartColors.red,
			borderWidth: 1,
			data: dataSet
		}]

	};
	
	
	
	console.log('bar chart after:');
	console.log(barChartData);
	
	if(window.myBar != undefined) {
		window.myBar.config.data = barChartData;
		window.myBar.update();
	}
	showChart();
}

function hideChart() {
	if($(CHART_ID).is(':visible')) {
		$(CHART_ID).hide();
	}
}

function showChart() {
	if(!$(CHART_ID).is(':visible')) {
		$(CHART_ID).show();
	}
}

$( document ).ready(function() {
	$(HIDE_BUTTON_ID).on('click', function() {
		hideChart();
	});
	
	$(SHOW_BUTTON_ID).on('click', function() {
		showChart();
		displayChart(10, 2018, [5,22,78,105,14,47,9,5,22,78,105,14,47,9,52,31,17,8]);
	});
	
	$(CHANGE_CHART_BUTTON_ID).on('click', function() {
		changeChart();
	});
});

function changeChart() {
	displayChart(3, 2021, [3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 'Example');
}