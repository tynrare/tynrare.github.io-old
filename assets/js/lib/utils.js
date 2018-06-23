/**
	* @brief create new object if it isn't exist
*
	* @Param what {String} string line "foo.bar"
* @Param where {Object} object referense. Will window by default
*
	* @Returns
*/
function weakDeclaration(what, where){
	var fields = what.split('.');
	var obj = where||window;
	for(var i in fields){
		if(!obj.hasOwnProperty(fields[i]) || obj[fields[i]] === undefined)
			obj[fields[i]] = {};

		obj = obj[fields[i]];
	}
	return obj;
}

Math.lerp = function(from, to, weight) {
	var mu2;

	mu2 = (1 - Math.cos(weight * Math.PI)) / 2;
	return (from * (1 - mu2) + to * mu2);
}

Number.prototype.clamp = function(min, max) {
	return Math.min(Math.max(this, min), max);
};
