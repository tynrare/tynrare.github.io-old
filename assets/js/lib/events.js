(function (window) {
	var _events_binds = {};
  var local = weakDeclaration("utils.events");

	local.listen = function(eventID, func){
		//Где-то в репе с HUD сохранился код bindEvent(И я без понятия как и где). Поэтому иногда он вдруг там всплывает и используется. Что с этим делать я не знаю

		eventID = eventID.toLowerCase();

		if(eventsDebugEnabled)
			console.log("binding function " + (func.name == "" ? func : func.name) + " with event " + eventID);

		var arr = _events_binds[eventID];
		if(!arr){
			arr = [];
			_events_binds[eventID] = arr;
		}

		arr.push(func);

		return eventID;
	}

	local.unbind = function(eventID, func){
		eventID = eventID.toLowerCase();

		var arr = _events_binds[eventID];
		if(!arr){
			console.error("can't find event " + eventID);
			return;
		}

		var i = arr.indexOf(func);
		if(i >= 0){
			arr.splice(i, 1);
		}
	}

	local.emit = function(eventID){
		eventID = eventID.toLowerCase();

		var arr = _events_binds[eventID];

		//delete first argument
		for(var i = 0;i + 1 < arguments.length;i++)
			arguments[i] = arguments[i + 1];
		delete arguments[--arguments.length]

		if(eventsDebugEnabled) console.log("Emit event: ", eventID, "\nWith args: ", arguments, "\nApplied for:", arr);

		//send events
		for(var k in arr) {
			try{
				arr[k].apply(this, arguments);
			}
			catch(e){
				console.error(e);
			}
		}
	}
}(window));
