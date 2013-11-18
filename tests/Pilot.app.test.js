module('Pilot.app');


test('create', function (){
	Pilot.ctrl('letters', {
		loadData: function (){
			/*..*/
		}
	});

	Pilot.ctrl('letter.search', ['letters'], {
		loadData: function (){
		}
	});



	Pilot.create({
		'/': {
			id: 'inbox',
			tpl: ''
		},

		'/user/': {
			'/:id': {
				id: 'user.details',
				ctrl: Pilot.ctrl('user.details')
			},

			'404': Pilot.ctrl('user.404')
		}
	});
});
