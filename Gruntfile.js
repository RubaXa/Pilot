'use strict';

module.exports = function (grunt){
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		jshint: {
			all: ['src/*.js', 'tests/*.tests.js']
		},

		version: {
			src: 'Pilot.js'
		},

		qunit: {
			all: ['tests/index.html'],
			options: {
				'--web-security': 'no',
				coverage: {
					src: ['<%=jshint.all%>'],
					instrumentedFiles: 'temp/',
					htmlReport: 'report/coverage',
					coberturaReport: 'report/',
					linesThresholdPct: 99,
					functionsThresholdPct: 100,
					branchesThresholdPct: 90,
					statementsThresholdPct: 90
				}
			}
		},

		uglify: {
			options: {
				banner: '/*! Pilot <%= pkg.version %> - <%= pkg.license %> | <%= pkg.repository.url %> */\n'
			},
			dist: {
				files: {
					  'Pilot.min.js': ['Pilot.js']
				}
			}
		},

		"babel": {
			options: {
				sourceMap: true
			},
			dist: {
				files: {
					"dist/app.js": "src/app.js"
				}
			}
		}
	});


	grunt.loadNpmTasks('grunt-version');
	//grunt.loadNpmTasks('grunt-babel');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-qunit-istanbul');
	grunt.loadNpmTasks('grunt-contrib-uglify');


	// Тестирование
	grunt.registerTask('test', ['jshint', 'qunit']);

	// Минификация
	grunt.registerTask('min', ['uglify']);


	// Default task.
	grunt.registerTask('default', ['version', 'test']);
};
