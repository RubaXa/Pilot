Pilot.View.toggleEffect('transition', function ($el, state){
	var transition = 'all .2s ease-in-out',
		transformForm = 'translate3d(' + (!state ? '0' : '100%') + ',0,0)',
		transformTo = 'translate3d(' + (state ? '0' : '100%') + ',0,0)'
	;

	$el
		.css({
			display: '',
			opacity: +!state,
			transition: '',
			webkitTransition: '',
			transform: transformForm,
			webkitTransform: transformForm
		})
		.delay(1)
		.queue(function (){
			$el
				.css({
					opacity: +state,
					transition: transition,
					webkitTransition: transition,
					transform: transformTo,
					webkitTransform: transformTo
				})
				.dequeue()
			;
		})
	;
});
