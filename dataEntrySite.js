const catDropdownID = "#categoryDropdown";
const varGroupDropdownID = "#varGroupDropdown";
const varDropdownID = "#varDropdown";
const catOptionClass = "catOption";
const varGroupOptionClass = "varGroupOption";
const varOptionClass = "varOption";

const monthID = "#month";
const dataFieldID = "#dataInput";
const submitButtonID = "#submit-button";

const searchFieldID = "#searchField";
const searchButtonID = "#search-button";

const catOpenTag = "<option class='"+catOptionClass+"'>";
const varGroupOpenTag = "<option class='"+varGroupOptionClass+"'>";
const varOpenTag = "<option class='"+varOptionClass+"'";
const optionEndTag = "</option>";

const VAR_OPTION_GROUP_DELIMITER = '|';

const GROUP_VAR_CHAR = '*';		//flag for group vars
const LINKED_VAR_CHAR = '-';	//flag for linked vars

const YEAR_COLUMN_COUNT = 13;
const YEAR_OFFSET = 1;
const START_YEAR = 2018;
const END_YEAR = 2030;

var yearIsLegal;

const MAX_SPREADSHEET_COLUMNS = 18278 ;	//this is the max number of columns google spreadsheets allows...

var rawSpreadsheetData = [];
var categories = [];
//these are hardcoded values for each tab in the google sheet. they should NOT be edited!
var availableCategories = ['Vital Statistics', 'Public Health Outreach', 'Immunizations', 'Environmental Health', 'Planning, Ed, Promotion', 'WIC', 'BCMH', 'Benefit Bank', 'Health Center'];
var availableGroupVars = [];
var availableVars = [];

const VAR_OFFSET_IN_SPREADSHEET = 1;

$( document ).ready(function() {
	$(DATA_ENTRY_DIV_ID).hide();
	
	$(catDropdownID).on('change', function() {
		var newCategory = $(catDropdownID).val();
		recalculateGroupVars(newCategory);
	});
	
	$(varGroupDropdownID).on('change', function() {
		var newGroup = $(varGroupDropdownID).val();
		recalculateVars(newGroup);
	});
	
	$(submitButtonID).on('click', function() {
		var data = $(dataFieldID).val();
		sendDataToGoogle(data);
	});
	
	$(searchButtonID).on('click', function() {
		var term = $(searchFieldID).val();
		narrowVarsBySearchTerm(term);
	});
	
	$("form").submit(function (e) {
		e.preventDefault();
		var term = $(searchFieldID).val();
		narrowVarsBySearchTerm(term);
	});
});

function init() {
	console.log('init called');
	$(SIGN_IN_HEADER_ID).hide();
	$(DATA_ENTRY_DIV_ID).show();
	
	initSpreadsheetData();
	initMonthOptions();
}

function initMonthOptions() {
	const AMOUNT_TO_ADD_TO_YEAR = 1900;  //add this to what Date() returns for the year (in which 2018 == 118) to get it to the actual date that'd we normally write (e.g. 118 + 1900 = 2018)
	
	//get the date
	var d = new Date();
	var month = d.getMonth();
	var currentYear = d.getYear() + AMOUNT_TO_ADD_TO_YEAR;
	
	//if the year is beyond the year 2030, program won't work....
	if(currentYear > END_YEAR) {
		yearIsLegal = false;
		alert("Whoops! We didn't build our program to be able to go beyond the year "+END_YEAR+". Please contact us before using this...it won't work without adding more years!");
	}
	else {
		yearIsLegal = true;
	}
	
	for(var i = START_YEAR; i <= currentYear; i++) {
		addYearToDiv(i);
	}
	
	$(monthID).val((month) + ((currentYear - START_YEAR) * 12));	
}

function addYearToDiv(year) {
	//template: <option value="1">Update for January</option>
	const divStart = '<option value="';
	const divMiddle = '">Update for ';
	const divEnd = '</option>';
	
	var months = ['Jan ', 'Feb ', 'Mar ', 'Apr ', 'May ', 'Jun ', 'Jul ', 'Aug ', 'Sep ', 'Oct ', 'Nov ', 'Dec '];
	
	for(var i = 0; i < months.length; i++) {
		var monthVal = ((year - START_YEAR) * 12) + i;
		var monthEntry = divStart + monthVal + divMiddle + months[i] + year + divEnd;
		
		$(monthID).append(monthEntry);
	}
}

function initMonth() {
	// var d = new Date();
	// var month = d.getMonth();
	// $(monthID).val(month + 1);
}

function initCategories() {
	availableCategories = ['EnvironmentHealth'];
}

function initSpreadsheetData() {
	const ID_INDEX = 0;
	var counter = 0;
	availableCategories.forEach(function(c) {
		var params = {
			// The ID of the spreadsheet to retrieve data from.
			spreadsheetId: SPREADSHEET_ID,  // TODO: Update placeholder value.

			// The A1 notation of the values to retrieve.
			range: c+'!a1:a500',  

			// The default render option is ValueRenderOption.FORMATTED_VALUE.
			valueRenderOption: 'FORMATTED_VALUE',  

			// How dates, times, and durations should be represented in the output.
			dateTimeRenderOption: 'FORMATTED_STRING',  
		};
		
		var request = gapi.client.sheets.spreadsheets.values.get(params);
		request.then((response) => {
			var result = response.result;
			var numRows = result.values ? result.values.length : 0;
			console.log(`${numRows} rows retrieved.`);
			console.log('length of result: '+result.values.length);
			
			result.values.forEach(function(value) {
				if(value.length >0) {
					rawSpreadsheetData.push({id: value[ID_INDEX], category: c});
				}
			});
			
			counter++;
			//if we've just finished grabbing the last category data, then go ahead and initialize our stuff!
			if(counter === availableCategories.length) {
				console.log('initializng now!');
				//initCategories();
				initGroupVars();
				initVars();
				initMonth();
				
				populateDropdowns();				
			}
			
		});
	});
	
}

function initGroupVars() {
	rawSpreadsheetData.forEach(function(cell) {
		if(isGroupVar(cell.id)) {
			var gv = getStringWithinChar(cell.id, GROUP_VAR_CHAR);
			availableGroupVars.push({id: gv, category: cell.category});
		}
	});
}

function isGroupVar(cell) {
	if(cell.length > 0) {
		if(cell[0] == GROUP_VAR_CHAR) {
			return true;
		}
	}
	
	return false;
}

function isLinkedVar(cell) {
	if(cell.length > 0) {
		if(cell[0] == LINKED_VAR_CHAR) {
			return true;
		}
	}
	
	return false;
}

function getStringWithinChar(source, c) {
	var startingIndex = source.indexOf(c) + 1;	
	var lastIndexOfChar = source.lastIndexOf(c);
	
	//grab the string between the character (starting at the start, with a length of end - start)
	var test = source.substr(startingIndex, lastIndexOfChar - startingIndex);
	
	//trim the string if we can (don't get a null exception)
	if(test.length > 0)
		return test.trim();
	else
		return test;
}

function initVars() {	
	var currentGroup = '';
	rawSpreadsheetData.forEach(function(cell) {
		//if the cell is a group variable, set our current group to it
		if(isGroupVar(cell.id)) {
			currentGroup = getStringWithinChar(cell.id, GROUP_VAR_CHAR);
		}
		//otherwise, it's a regular variable
		else {
			var varIsLinked = isLinkedVar(cell.id);
			var vID = cell.id;
			//if the cell is a linked var, set id to only the text inside the flags
			if(varIsLinked) {
				vID = getStringWithinChar(cell.id, LINKED_VAR_CHAR);
			}
			
			availableVars.push({id: vID, isLinked: varIsLinked, group: currentGroup});
		}
	});
}

function populateDropdowns() {	
	console.log('populating dropdowns');
		
	categories = getCategories();
	
	categories.forEach(function(category) {
		//console.log(category.id);
		var catOption = catOpenTag + category.id + optionEndTag;		
		$(catDropdownID).append(catOption);
		
		category.groups.forEach(function(group) {
			var groupOption = varGroupOpenTag + group.id + optionEndTag;
			$(varGroupDropdownID).append(groupOption);
			
			group.vars.forEach(function(v) {
				var vOption = getVarOption(v);
				$(varDropdownID).append(vOption);
			});
		});
	});
}

function getVarOption(v) {
	var vOption = varOpenTag;
	
	//set it's id = "id|group"; then close the tag
	var optionID = v.id + VAR_OPTION_GROUP_DELIMITER + v.group;
	vOption += ' id="' + optionID + '">';
	if(v.isLinked) {
		//console.log('           '+v.id+' is a linked var');
		var header = getHeaderForLinkedVar(v.id, v.group);
		vOption += header + ' (' + v.id + ') ';
	}
	else {
		vOption += v.id;
	}
	
	vOption += ' - ' + v.group;
	vOption += optionEndTag;
	
	return vOption;
}

function getHeaderForLinkedVar(varID, varGroup) {
	var header = '';
	var temp = '';
	
	availableVars.forEach(function(v) {		
		if(!v.isLinked) {
			temp = v;
		}
		if(v.id == varID && v.group == varGroup) {
			//make sure that the header is in the same group as the linked var
			if(temp.group == v.group) {
				header = temp.id;
			}
			//if they're NOT in the same group, then the header is just the group
			else {
				header = v.group;
			}
		}
	});
	
	return header;
}

function varIsHeader(varID, varGroup) {
	var lastVarWasID = false;
	var varIsHeader = false;
	
	availableVars.forEach(function(v) {
		if(lastVarWasID) {
			lastVarWasID = false;		//don't trigger the next variable
			
			//if the variable below a header is linked, then our var is a header!
			//BUT make sure that our var in question isn't the last variable in its group (in which case it can't possibly be a header)
			if(v.group === varGroup) {
				varIsHeader = v.isLinked;	
			}
			else {
				varIsHeader = false;
			}
		}
		
		if(v.id === varID) {
			lastVarWasID = true;
		}
	});
	
	return varIsHeader;
}

function getCategories() {	
	for(var i = 0; i < availableCategories.length; i++) {
		categories.push({
			id: availableCategories[i],
			groups: getGroupVarsForCat(availableCategories[i])
		});
	}
	
	return categories;
}

function getGroupVarsForCat(cat) {
	var groupVars = [];
	
	availableGroupVars.forEach(function(gv) {
		if(gv.category === cat) {
			groupVars.push({
				id: gv.id,
				vars: getVarsForGroup(gv.id)
			});
		}
	});
	
	return groupVars;
}

function getVarsForGroup(group) {	
	var temp = [];
	availableVars.forEach(function(v) {
		if(!v.isLinked && varIsHeader(v.id)) {
			//then our var is a header, don't add it to the dropdown
		}
		else if(v.group.trim() == group.trim()) {
			temp.push({id: v.id, isLinked: v.isLinked, group: group});
		}
	});
	
	return temp;
}

function recalculateGroupVars(newCategory) {
	console.log('new category: '+newCategory);
	wipeGroupVars();
	wipeVars();
	
	var groupVars = [];
	for(var i = 0; i < availableCategories.length; i++) {
		if(availableCategories[i] == newCategory) {
			groupVars = getGroupVarsForCat(availableCategories[i]);
		}
	}
	
	groupVars.forEach(function(group) {
		var groupOption = varGroupOpenTag + group.id + optionEndTag;
		$(varGroupDropdownID).append(groupOption);
		
		group.vars.forEach(function(v) {
			var vOption = getVarOption(v);
			$(varDropdownID).append(vOption);
		});
	});
	
	$(varGroupDropdownID).val('label');
	$(varDropdownID).val('label');
}

function recalculateVars(newGroup) {
	console.log('recalculating var for this new group: '+newGroup+'!');
	wipeVars();
	
	var vars = getVarsForGroup(newGroup);
	
	vars.forEach(function(v) {
		var varOption = getVarOption(v);
		$(varDropdownID).append(varOption);
	});
	
	$(varDropdownID).val('label');
}

function wipeCategories() {
	$('.'+catOptionClass).remove();
}

function wipeGroupVars() {
	$('.'+varGroupOptionClass).remove();
}

function wipeVars() {
	$('.'+varOptionClass).remove();
}

function sendDataToGoogle(data) {
	if(!yearIsLegal) {
		alert("Whoops! We didn't build our program to be able to go beyond the year "+END_YEAR+". Please contact us...until you do, this program will just stall out!");
		return;
	}
	
	if(data.length < 1) {
		alert('Please enter data to be submitted');
		return;
	}
	
	var dataType = $(varDropdownID).children(":selected").attr('id');
	
	if(dataType == null) {
		alert('Please select the variable the data represents');
		return;
	}
	
	var dateSelected = parseInt($(monthID).children(':selected').attr('value')) + 1;
	console.log('date selected: '+dateSelected);
	var columnID = getColumnID(dateSelected);
	
	//grab the category and group var from the list
	var varID = parseVarID(dataType);
	var group = parseGroupID(dataType);
	
	var category = getCategoryForGroupVar(group);
	var varRange = getVarRange(varID, group, category);
	
	var range = category+'!'+columnID+varRange;
	var values = [ [data] ];
	
	var body = {
		values: values
	};
	gapi.client.sheets.spreadsheets.values.update({
		spreadsheetId: SPREADSHEET_ID,
		range: range,
		valueInputOption: VALUE_INPUT_OPTION,
		resource: body
	}).then((response) => {
		console.log(response);
		var result = response.result;
		console.log(`${result.updatedCells} cells updated.`);
	
		var dataName = $(varDropdownID).children(":selected").text();
		dataName = dataName.substring(0, dataName.indexOf(LINKED_VAR_CHAR)).trim();		//lop off the group var id (reads better without it)
		
		alert('Changed '+dataName+' to '+data+'!');	
	}, function() {
		alert('FAILURE: You are signed into an account that does not have permission to push data. Please change accounts to use this program.');
	});
}

function parseVarID(optionID) {
	var id = optionID.substring(0, optionID.indexOf(VAR_OPTION_GROUP_DELIMITER));
	return id;
}

function parseGroupID(optionID) {
	var group = optionID.substring(optionID.indexOf(VAR_OPTION_GROUP_DELIMITER) + 1);
	return group;
}

function getVarRange(varID, group, cat) {
	//set to the initial offset
	var index = VAR_OFFSET_IN_SPREADSHEET;
	
	//iterate through available variables until we find the matching var
	for(var i = 0; i < availableVars.length; i++) {
		//increment index if we're passing through a var in our category
		if(groupIsInCategory(availableVars[i].group, cat)) {
			index++;
		}
		
		if(availableVars[i].id === varID) {
			break;
		}
	}
	
	//next, we need to add an offset for each of the rows that just have the group var labels above our target variable
	var matchingGroupVars = [];
	availableGroupVars.forEach(function(gv) {
		if(gv.category === cat) {
			matchingGroupVars.push(gv.id);
		}
	});
	
	//now, cycle thorugh the group vars in our category, and incremenet numGroupsAboveVar for each group above our variable ID
	var numGroupsAboveVar = 0;
	for(var i = 0; i < matchingGroupVars.length; i++) {
		numGroupsAboveVar++;
		//if the current group var is our target group var, go ahead and stop counting (only after we've counter this group var--it's still above our variable!)
		if(matchingGroupVars[i] === group) {
			break;
		}
	}
	
	return index + numGroupsAboveVar;
}

function getCategory(varID) {
	var gv = '';
	availableVars.forEach(function(v) {
		if(v.id === varID)
			gv = v.group;
	});
	
	var cat = getCategoryForGroupVar(gv);
	return cat;
}

function getCategoryForGroupVar(gv) {
	var cat = '';
	availableGroupVars.forEach(function(g) {
		if(g.id === gv)
			cat = g.category;
	});
	
	return cat;
}

function groupIsInCategory(gr, cat) {
	for(var i = 0; i < availableGroupVars.length; i++) {
		if(availableGroupVars[i].id === gr) {
			return availableGroupVars[i].category === cat;
		}
			
	}
}

//array for all our characters
const CHARACTER_ARRAY = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
//number of possible characters
const NUM_CHARACTERS = 26;
//max number of characters for a column id (e.g. 'zzz' has 3)
const MAX_CHARACTERS_FOR_COLUMN = 3;

function getColumnID(dateSelected) {
	if (dateSelected < (NUM_CHARACTERS - 2)) {
		dateSelected += parseInt((dateSelected - 1) / 12);
        return CHARACTER_ARRAY[dateSelected];
	}

    var str = '';
	
	console.log('getting column id for date: '+dateSelected);
	
    var current = dateSelected + 1;
	current += parseInt((dateSelected - 1) / 12);			//this accounts for the extra "total" column for each year
    var offset = MAX_CHARACTERS_FOR_COLUMN;
    while (current > 0)
    {
        str += CHARACTER_ARRAY[--current % NUM_CHARACTERS];
        current = Math.floor(current / NUM_CHARACTERS);
    }
	var columnID = '';
	for(var i = str.length - 1; i >= 0; i--) {
		columnID += str[i];
	}
	
	return columnID;
}

function narrowVarsBySearchTerm(term) {
	//make sure user is actually searching for something...
	if(term.length < 1)
		return;
	
	//empty out all options to their defaults
	var defaultVal = 'label';
	$(catDropdownID).val(defaultVal);
	$(varGroupDropdownID).val(defaultVal);
	$(varDropdownID).val(defaultVal);
	
	term = term.trim();
	console.log('searching for: '+term);
	
	var terms = getSearchAsArray(term);
	console.log('num terms: '+terms.length);
	
	//get all matching variables that contain the search term
	var matchingVars = getMatchingVars(terms);
	console.log('got '+matchingVars.length+' resultsssssss');
	
	//wipe the variable options and readd only the matches
	wipeVars();
	matchingVars.forEach(function(v) {
		var vOption = getVarOption(v);
		$(varDropdownID).append(vOption);
	});
	
	$(varDropdownID+' option:eq(1)').prop('selected', true);
	$(varDropdownID).focus();
	console.log('propped!');
}

function getSearchAsArray(searchTerm) {
	if(searchTerm.length < 1)
		return '';
	
	//return array delimited by spaces
	searchTerm = searchTerm.trim();
	return searchTerm.split(' ');
}

function getMatchingVars(searchTerms) {
	var matches = [];
	
	//normalize search terms
	searchTerms.forEach(function(term) {
		term = term.toLowerCase();
	});
	
	availableVars.forEach(function(v) {
		//if the variable's id contains ALL the search terms, add it to matches
		if(stringContainsTerms(v.id.toLowerCase(), searchTerms)) {
			matches.push(v);
		}
		//also check the variable's group -- if there's a match, add it to matches
		else if(stringContainsTerms(v.group.toLowerCase(), searchTerms)) {
			matches.push(v);
		}
		//finally, if the var is linked, check if its header contains ALL the search terms
		else if(v.isLinked) {
			var header = getHeaderForLinkedVar(v.id, v.group);
			if(stringContainsTerms(header.toLowerCase(), searchTerms)) {
				matches.push(v);
			}
		}
	});
	
	return matches;
}

function stringContainsTerms(str, terms) {
	for(var i = 0; i < terms.length; i++) {
		if(str.indexOf(terms[i]) < 0)
			return false;
	}
	
	return true;
}