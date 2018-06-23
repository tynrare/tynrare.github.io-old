/****************************************************************************
Copyright (c) 2018 Timofey Borisov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/

/*
Usage:
dynamic:
	let v = {
		some_value = 10
	}
	utils.bind.val.dynamic = v;
	utils.bind.defineDynamic();
	utils.bind.parseDom(document.getElementById("your_element"));

	//All %v some_value% in element will be replaced with value of this variable

	//It's better to use next function if you want to parse big element (Like full <body>):
	utils.bind.parseBindableChilds(document.getElementById("your_element"))
	//It will only parse childs with "bindable" class

static:


*/

(function(){
	let local = weakDeclaration("utils.bind");

	//===
	//Properties and variables
	local.val = {
		static:null,
		dynamic:null,
		currency:null
	}
	local.properties = {
		animateValues : true, //Allow smooth animation for valuse
		animationInterval : 0.1, //Speed of animation
		animationStrength : 0.2,
		replaceDollarSign : true, //Parse all signs as link
		activeCurrencyCode : "USD",
		emitEvents : true, //Emit change events for values
		saveOriginHTML : true //Save origin html text if you want to dynamic language changes
	}

	//===
	//Actual interface
	local.parseBindableChilds = function(dom){
		var linkDoms = dom.getElementsByClassName("bindable");
		for(var l in linkDoms){
			if(typeof linkDoms[l].innerHTML == "string")
				local.parseDom(linkDoms[l]);
		}
	}

	local.parseDom = function(dom){
		var toParse = dom._origin_innerHTML||dom.innerHTML;

		if(dom.classList.contains("fast-bind"))
			toParse = "%c " + toParse + "%";

		var text = local.parsePresetsText(toParse);

		if(local.properties.saveOriginHTML)
			dom._origin_innerHTML = toParse;

		dom.innerHTML = text.text;

		if(text.values.length) local.initUpdateText(dom, text);
	}

	//===
	//Lot of helpers
	var processValuesChange = function(key, data){
		//smooth value changing
		if(local.val.dynamic.hasOwnProperty(key+"_animated")){
			var animation = function(){
				local.val.dynamic[key+"_animated"] = Math.lerp(local.val.dynamic[key+"_animated"], local.val.dynamic[key], local.properties.animationStrength);

				//check fast and than check fine
				if(Math.round(local.val.dynamic[key+"_animated"]) == Math.round(local.val.dynamic[key]) &&
					Math.abs(local.val.dynamic[key+"_animated"].toFixed(2)) == Math.abs(local.val.dynamic[key].toFixed(2))){

					local.val.dynamic[key+"_animated"] = local.val.dynamic[key];

					local.val.dynamic["_"+key+"_animated"].holdupTimer = null;
					clearInterval(local.val.dynamic["_"+key+"_animated"].intervalID)
				}
			}

			if(!local.properties.animateValues)
				local.val.dynamic[key+"_animated"] = local.val.dynamic[key];
			else if(!local.val.dynamic["_"+key+"_animated"].holdupTimer){

				//holdupTimer disabled for now
				local.val.dynamic["_"+key+"_animated"].holdupTimer = setTimeout(
					function(){
						local.val.dynamic["_"+key+"_animated"].intervalID = setInterval(animation, local.properties.animationInterval);
					}, 100);
			}
		}
	}

	var defconst = function(key){
		Object.defineProperty(local.val.dynamic, key, {
			get: function() {
				return local.val.dynamic['_' + key].val;
			},
			set: function(v) {
				if(v == undefined){
					console.error("value for " + key + " is undefined");
					return;
				}
				else if(typeof v == "string"){
					var parsed = parseFloat(v);
					if(isNaN(parsed)){
						console.warn(key + " was ", v, " and it's incorrect");
						return;
					}
					else
						v = parsed;
				}
				else if(isNaN(v)){
					console.warn(key + " was ", v, " and it's incorrect");
					return;
				}
				var _key = '_'+ key;

				//event
				var els = local.val.dynamic[_key].elements
				var oldvalue = local.val.dynamic[_key].val;
				var evkeys = {oldvalue: oldvalue, newvalue: v, elements:els, key:key};

				local.val.dynamic[_key].val = v;

				processValuesChange(key, evkeys);

				if(local.properties.emitEvent)
					utils.events.emit("gamevalchanged", evkeys);

				//sent personal events
				for(var i in els){
					var el = els[i];
					var prop = el._raw_innerHTML;
					if(!prop) continue;
					var str = local.subtituteValsInText(prop);

					if(!el.classList.contains("bindable_static"))
						el.innerHTML = str;

					if(local.val.dynamic[_key].eventListeners){
						var detail = evkeys;
						detail.string = str;
						detail.settings = prop.values;

						var evt = new CustomEvent('gamevalchanged', {detail: detail});
						el.dispatchEvent(evt);
					}
				}
			}
		});
	};

	//game values
	//getset for game values. Will send events and change strings
	local.defineDynamic = function(){
		for(var k in local.val.dynamic) {
			if(k[0] == '_') continue;

			local.initGetterPropForValue(k);
		}
	};

	local.clearElements = function(){
		for(var k in local.val.dynamic) {
			if(k[0] != '_') continue;
			local.val.dynamic[k].elements = [];
		}
	};
	local.initGetterPropForValue = function(value){
		if(value[0] == '_') return;
		//create new buffer
		local.val.dynamic['_' +value] = {};
		local.val.dynamic['_' +value].elements = [];
		local.val.dynamic['_' +value].val = local.val.dynamic[value];
		local.val.dynamic['_' +value].onchange = [];
		local.val.dynamic['_' +value].eventListeners = false;

		//init setget for original
		defconst(value);
	};

	//=======
	//Lang
	//=======


	local.parsePresetsText = function(rawtext){
		var origintext = rawtext;
		var text = {
			text:"",
			values:[],  //value = {settings, variable, format, origin_format}
		};

		//var rawtext = rowtext.match(/\%.*?\%/g);
		rawtext = rawtext.split('%');

		for(var i = 0;i < rawtext.length;i++){
			var newvalue = {
				//settings : null,
				format : null,
				value : null,
				variable_name : null,
				origin_format : null,
				modifiers : null
			}

			if(rawtext[i][0] == 'c'){ //means constant
				var prop = rawtext[i].split(' ')[1];
				if(local.val.static.hasOwnProperty(prop)){
					text.text += '%s';

					newvalue.format = "%s";
					newvalue.value = genPointer("static", prop);
					newvalue.origin_format = prop;
				}
				else{
					text.text += prop;
					console.warn("Can't find lang constant: " + prop);
				}
			}
			else if(rawtext[i][0] == 'v'){ //means value
				var rawTextSplit = rawtext[i].split(' ');
				var prop = rawTextSplit[1];
				newvalue.origin_format = rawtext[i];

				if(local.val.dynamic.hasOwnProperty(prop)){
					text.text += '%s';

					var settings = processPointerModificators(rawTextSplit.slice(2), prop);
					prop = settings.prop;

					newvalue.variable_name = prop;
					newvalue.value = genPointer("dynamic", prop, settings.fraclength); //pointer
					newvalue.modifiers = settings.modifiers;

					if(typeof(local.val.dynamic[prop]) == "string"){
						newvalue.format = "%s";
					}
					else{
						var format = '%';

						//padding - value like
						//%'*4d
						//where
						//	'* is padding symbol
						//	4 minimum string length
						if(settings.minIlength){
							format += "\'" + settings.fillSymbol;
							format += (1 + settings.minIlength + (settings.fraclength ? settings.fraclength : 0)).toString();
						}
						if(settings.fraclength != null)
							format += "." + settings.fraclength;

						format += "f";
						newvalue.format = format;
					}
				}
				else{
					text.text += prop;
					console.warn("Can't find value constant: " + prop);
				}
			}
			else
				text.text += rawtext[i];

			if(newvalue.format)
				text.values.push(newvalue);
		}

		if(!text.text.length) text.text = origintext;
		return text;
	}

	local.subtituteValsInText = function(rawtext){
		var formated = [];
		for(var i in rawtext.values){
			var v = rawtext.values[i];
			var rawval = v.value();

			if(v.modifiers && v.modifiers.includes("abs")){
				rawval = Math.abs(rawval);
			}

			formated.push(sprintf(v.format, rawval));
		}

		var newtext = vsprintf(rawtext.text, formated);

		if(local.properties.replaceDollarSign && local.val.currency && local.val.currency.hasOwnProperty(local.properties.activeCurrencyCode))
			newtext = newtext.replaceAll('$', local.val.currency[local.properties.activeCurrencyCode].symbol_native);

		return newtext;
	}

	local.initUpdateText = function(inner, text){
		inner._raw_innerHTML = text;
		inner.innerHTML = local.subtituteValsInText(text)
		for(var k in text.values)
			if(text.values[k].variable_name)
				local.val.dynamic['_' + text.values[k].variable_name].elements.push(inner);
	}

	var genPointer = function(where, what, roundAt){
		return function(){
			var v = local.val[where][what];

			//avoid -0
			if(roundAt != undefined && !isNaN(roundAt) && typeof v != "string"){
				if(parseFloat(v.toFixed(roundAt)) == 0)
					v = Math.abs(v);
			}

			return v;
		}
	}

	//parsePresetsText helpers:

	/**
	 * @brief finds value in local.val val and returns
	 * @Param ref string starting with '&' character and variable name exist in local.val.dynamic
	 * @Returns local.val.dynamic[ref.substr(1)] or ref
	 */
	var refToVal = function(ref){
		var val = ref;
		if(ref && ref[0] == "*")
			val = local.val.dynamic[ref.substr(1)];

		if(val == undefined){
			console.warn("Can't find value pointer: " + ref);
			return null;
		}

		return val;
	}

	var irefToVal = function(ref){
		return parseInt(refToVal(ref));
	}

	//Works directly with local.val.dynamic
	var processPointerModificators = function(modifiers, prop){
		var settings = {
			prop : prop,
			modifiers : null,
			fraclength : null, //float rounding modifier
			maxIlength : null,
			minIlength : null,
			fillSymbol : ' '
		}
		if(!modifiers.length) return settings;

		settings.modifiers = modifiers;

		for(var i in modifiers){
			var str = modifiers[i];
			if(str == "a" || str == "animated"){
				if(!local.val.dynamic.hasOwnProperty(prop+"_animated")){
					local.val.dynamic[prop+"_animated"] = local.val.dynamic[prop];
					local.initGetterPropForValue(prop+"_animated");
				}
				settings.prop = prop+"_animated";
			}
			if(str.startsWith("f(") || str.startsWith("fixed(")){
				//input will like
				/*
				 f('*[2:8].5)
				 where:
					 '* fillSymbol (padding symbol)
					 [2:8] max and min length
					 .5 fraclength
					 */
				var expr = str.split('(')[1].slice(0, -1);
				var values = expr.split('.');

				{//fractional part
					var frac = irefToVal(values[1]);
					if(!isNaN(frac))
						settings.fraclength = frac;
				}
				{//padding symbol
					if(values[0][0] == "\'"){
						settings.fillSymbol = values[0][1];
						values[0] = values[0].substr(2);
					}
				}
				{//padding length and max length
					if(values[0].length){
						var arrinteg = values[0].split(':');
						var min = irefToVal(arrinteg[0].substr(1));
						var max = irefToVal(arrinteg[1].slice(0, -1));

						//we have to decrease one symbol if there's no frac part
						var dec = settings.fraclength ? 0 : 1;

						if(!isNaN(min))
							settings.minIlength = min - dec;
						if(!isNaN(max))
							settings.maxIlength = max - dec;
					}
				}
			}
			if(str == "ev" || str == "event")
				local.val.dynamic['_'+settings.prop].eventListeners = true;
		}
		return settings;
	}

	String.prototype.replaceAll = function(search, replacement) {
		var target = this;
		return target.split(search).join(replacement);
	};
}());
