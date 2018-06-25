//===
//toolbox

//---
//words creation
function createText(text, initialShift, fontSize){
	var item = new PointText({
		point: view.size/4 + Point.random() * view.size/2,
		rotation:Math.random()*45-90,
		content: text,
		fillColor: new Color(0, 0, 0, 0),
		fontFamily: 'Roboto Slab',
		fontWeight: 'bold',
		fontSize: fontSize
	});
	item.initialShift = initialShift;
	item.allowInteractions = false;

	createjs.Tween.get(item.fillColor).to({alpha:1}, 700, createjs.Ease.cubicIn);
	animateLetterMovingToInitialShift(item, 0, 1400, createjs.Ease.circOut);
	createjs.Tween.get(item).to({rotation:Math.random()*10-5}, 1400, createjs.Ease.circOut);

	return item;
}
function createDelayed(delay, text, initialShift, fontSize){
	setTimeout(function(){
		lettersList.push(createText(text, initialShift, fontSize));
	}, delay);
}
function createWord(delay, word, pxlength, fontSize, yshift){
	setTimeout(function(){
		for(var i = 0;i < word.length;i++){
			var progress = (i+0.5)/word.length*pxlength-pxlength/2;
			createDelayed(i*100, word[i], {x:progress, y:yshift}, fontSize);
		}
	}, delay);
}

//---
//Animation
function animateLetterMovingToInitialShift(letter, wait, time, ease){
		letter.allowInteractions = false;
		//Move to new pos
		var shift = letter.initialShift;
		var pos = {x:view.size.width/2+shift.x, y:view.size.height/2+shift.y};
		createjs.Tween.get(letter.position, {override: true})
			.wait(wait)
			.to({x:pos.x, y:pos.y}, time, ease)
			.call(function(){
				letter.allowInteractions = true;
			});
}


//toolbox
//===

//===
//creating
var lettersList = [];
createWord(100, "Hi", 100, 100, -50);
createWord(1000, utils.bind.val.static.greeting_anim_text, 300, 20, 0);

//creating
//===

//===
//realtime interactions
var mouseInteractDist = 100;

var interactionsCount = 0;
var enjoyWordCreated = false;
var loveWordCreated = false;
function checkEnjoyWordCreation(){
	interactionsCount++;
	if(!enjoyWordCreated && interactionsCount > 1000){
		enjoyWordCreated = true;
		createWord(500, "Enjoy.", 150, 40, 40);
	}
	else if(!loveWordCreated && interactionsCount > 10000){
		loveWordCreated = true;
		createWord(500, "Wow! You really love it:)", 300, 20, 100);
	}
}

function onMouseMove(event){
	for(var i in lettersList){
		var letter = lettersList[i];
		if(!letter.allowInteractions) continue;

		var pos = new Point(view.size.width/2+letter.initialShift.x, view.size.height/2+letter.initialShift.y);
		var vec = pos - event.point;

		if(vec.length < mouseInteractDist){
			letter.targetPos = pos + vec.normalize()*(mouseInteractDist-vec.length)/2;
			letter.moveSpeed = 0.3;

			if(event.delta.length > 15 && vec.length < mouseInteractDist/2){
				letter.targetPos += event.delta*(1-vec.length/mouseInteractDist/2)*2;
			letter.moveSpeed = 0.5;
			}
		}
		else{
			letter.targetPos = pos;
			letter.moveSpeed = Math.random()*0.2+0.05;
			checkEnjoyWordCreation();
		}
	}
}

function onFrame(event){
	for(var i in lettersList){
		var letter = lettersList[i];
		if(!letter.allowInteractions || !letter.targetPos || (letter.targetPos - letter.position).length < 1) continue;

		letter.position.x = Math.lerp(letter.position.x, letter.targetPos.x, letter.moveSpeed);
		letter.position.y = Math.lerp(letter.position.y, letter.targetPos.y, letter.moveSpeed);
	}
}

function onResize(event){
	for(var i in lettersList){
		lettersList[i].targetPos = null;
		animateLetterMovingToInitialShift(lettersList[i], Math.random()*1000, Math.random()*1000+1000, createjs.Ease.quadInOut);
	}
}
//realtime interactions
//===
